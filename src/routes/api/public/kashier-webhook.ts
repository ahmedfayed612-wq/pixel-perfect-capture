import { createFileRoute } from "@tanstack/react-router";

async function readPayload(request: Request): Promise<Record<string, unknown>> {
  const query = Object.fromEntries(new URL(request.url).searchParams) as Record<string, unknown>;
  if (request.method === "GET") return query;

  const text = await request.text();
  if (!text) {
    console.log("[Webhook] Empty request body received");
    return query;
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    console.log("[Webhook] Failed to parse JSON, trying URLSearchParams");
    return Object.fromEntries(new URLSearchParams(text)) as Record<string, unknown>;
  }
}

async function handle(request: Request) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let raw: unknown = null;
  let note = "";
  let verified = false;
  let responseStatus = 200;
  
  console.log("[Webhook] Received request:", request.method, request.url);
  
  try {
    const {
      kashierEnv,
      verifyKashierSignature,
      extractSignature,
      finalizePayment,
      flattenPayload,
      orderIdCandidates,
      processHostedPayment,
      reconcileAndFinalize,
      reconcileKashierOrder,
    } = await import("@/lib/kashier.server");

    const body = await readPayload(request);
    raw = body;
    
    console.log("[Webhook] Request body type:", typeof body);
    console.log("[Webhook] Request body keys:", Object.keys(body).slice(0, 10));

    const payload = (
      body["data"] && typeof body["data"] === "object"
        ? (body["data"] as Record<string, unknown>)
        : body
    ) as Record<string, unknown>;

    const signature = request.headers.get("x-kashier-signature") || extractSignature(body);
    console.log("[Webhook] Signature:", signature ? "present" : "missing");

    try {
      const { apiKey, secretKey } = kashierEnv();
      verified = await verifyKashierSignature(body, signature, apiKey, secretKey);
      console.log("[Webhook] Signature verification:", verified);
    } catch (envError) {
      console.error("[Webhook] Environment error:", envError);
      note += "env-missing;";
    }

    if (!verified) note += signature ? "signature-mismatch;" : "no-signature;";

    const flat = flattenPayload(payload);
    const orderIds = orderIdCandidates(flat);
    const paymentStatus = flat["status"] ?? flat["paymentStatus"] ?? "";
    
    console.log("[Webhook] Order IDs:", orderIds);
    console.log("[Webhook] Payment status:", paymentStatus);
    console.log("[Webhook] Flattened keys:", Object.keys(flat).slice(0, 15));

    const { data: sub } = orderIds.length
      ? await supabaseAdmin
          .from("subscriptions")
          .select("id")
          .in("kashier_order_id", orderIds)
          .limit(1)
          .maybeSingle()
      : { data: null };

    console.log("[Webhook] Subscription found:", !!sub);

    if (sub) {
      // A signature mismatch must not cost a paying customer their Pro access:
      // ask Kashier directly what happened to the order instead of trusting the body.
      console.log("[Webhook] Processing existing subscription");
      const res = verified
        ? await finalizePayment(orderIds, paymentStatus)
        : await reconcileAndFinalize(orderIds);
      note += `${verified ? "order" : "reconciled"}:${res.status};`;
      console.log("[Webhook] Payment finalization result:", res);
      if (res.status === "pending") responseStatus = 202;
    } else if (verified) {
      console.log("[Webhook] Processing hosted payment with verified signature");
      const res = await processHostedPayment(payload);
      note += `hosted:${res.outcome};`;
      console.log("[Webhook] Hosted payment result:", res);
    } else if (orderIds.length) {
      // Payment page purchases carry no order of ours; only Kashier can vouch for them.
      console.log("[Webhook] Attempting reconciliation for hosted payment");
      const reconciled = await reconcileKashierOrder(orderIds[0]!);
      console.log("[Webhook] Reconciliation result:", reconciled);
      if (reconciled.status === "captured") {
        const res = await processHostedPayment(payload, reconciled);
        note += `hosted-reconciled:${res.outcome};`;
        console.log("[Webhook] Hosted payment after reconciliation:", res);
      } else {
        note += `rejected:${reconciled.status};`;
        responseStatus = reconciled.status === "unknown" ? 401 : 200;
      }
    } else {
      console.log("[Webhook] No order IDs found, rejecting");
      note += "rejected;";
      responseStatus = 401;
    }
  } catch (e) {
    console.error("[Webhook] Error processing webhook:", e);
    note += `error:${e instanceof Error ? e.message : String(e)};`;
  }

  try {
    console.log("[Webhook] Logging to webhook_logs table");
    await supabaseAdmin.from("webhook_logs").insert({
      source: "kashier",
      verified,
      note,
      raw: (raw ?? {}) as never,
    });
  } catch (logError) {
    console.error("[Webhook] Failed to log webhook:", logError);
    /* logging must never break the webhook */
  }

  console.log("[Webhook] Response status:", responseStatus);
  return new Response(responseStatus === 401 ? "Invalid signature" : "ok", {
    status: responseStatus,
  });
}

export const Route = createFileRoute("/api/public/kashier-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => handle(request),
      GET: async ({ request }) => handle(request),
    },
  },
});

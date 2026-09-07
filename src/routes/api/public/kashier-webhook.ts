import { createFileRoute } from "@tanstack/react-router";

async function readPayload(request: Request): Promise<Record<string, unknown>> {
  const query = Object.fromEntries(new URL(request.url).searchParams) as Record<string, unknown>;
  if (request.method === "GET") return query;

  const text = await request.text();
  if (!text) return query;
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return Object.fromEntries(new URLSearchParams(text)) as Record<string, unknown>;
  }
}

async function handle(request: Request) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let raw: unknown = null;
  let note = "";
  let verified = false;
  let responseStatus = 200;
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

    const payload = (
      body["data"] && typeof body["data"] === "object"
        ? (body["data"] as Record<string, unknown>)
        : body
    ) as Record<string, unknown>;

    const signature = request.headers.get("x-kashier-signature") || extractSignature(body);

    try {
      const { apiKey, secretKey } = kashierEnv();
      verified = await verifyKashierSignature(body, signature, apiKey, secretKey);
    } catch {
      note += "env-missing;";
    }

    if (!verified) note += signature ? "signature-mismatch;" : "no-signature;";

    const flat = flattenPayload(payload);
    const orderIds = orderIdCandidates(flat);
    const paymentStatus = flat["status"] ?? flat["paymentStatus"] ?? "";

    const { data: sub } = orderIds.length
      ? await supabaseAdmin
          .from("subscriptions")
          .select("id")
          .in("kashier_order_id", orderIds)
          .limit(1)
          .maybeSingle()
      : { data: null };

    if (sub) {
      // A signature mismatch must not cost a paying customer their Pro access:
      // ask Kashier directly what happened to the order instead of trusting the body.
      const res = verified
        ? await finalizePayment(orderIds, paymentStatus)
        : await reconcileAndFinalize(orderIds);
      note += `${verified ? "order" : "reconciled"}:${res.status};`;
      if (res.status === "pending") responseStatus = 202;
    } else if (verified) {
      const res = await processHostedPayment(payload);
      note += `hosted:${res.outcome};`;
    } else if (orderIds.length) {
      // Payment page purchases carry no order of ours; only Kashier can vouch for them.
      const reconciled = await reconcileKashierOrder(orderIds[0]!);
      if (reconciled.status === "captured") {
        const res = await processHostedPayment(payload, reconciled);
        note += `hosted-reconciled:${res.outcome};`;
      } else {
        note += `rejected:${reconciled.status};`;
        responseStatus = reconciled.status === "unknown" ? 401 : 200;
      }
    } else {
      note += "rejected;";
      responseStatus = 401;
    }
  } catch (e) {
    note += `error:${e instanceof Error ? e.message : String(e)};`;
  }

  try {
    await supabaseAdmin.from("webhook_logs").insert({
      source: "kashier",
      verified,
      note,
      raw: (raw ?? {}) as never,
    });
  } catch {
    /* logging must never break the webhook */
  }

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

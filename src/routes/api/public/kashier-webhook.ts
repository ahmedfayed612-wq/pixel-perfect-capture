import { createFileRoute } from "@tanstack/react-router";
import { buildKashierSignaturePayload } from "@/lib/kashier.server";

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
      finalizePayment,
      flattenPayload,
      processHostedPayment,
    } = await import("@/lib/kashier.server");

    const text = await request.text();
    let body: Record<string, unknown> = {};
    try {
      body = JSON.parse(text) as Record<string, unknown>;
    } catch {
      body = Object.fromEntries(new URLSearchParams(text)) as Record<string, unknown>;
    }
    raw = body;

    const payload = (body["data"] && typeof body["data"] === "object"
      ? (body["data"] as Record<string, unknown>)
      : body) as Record<string, unknown>;

    const signature =
      (request.headers.get("x-kashier-signature") ?? "") ||
      String(payload["signature"] ?? body["signature"] ?? "");

    try {
      const { apiKey, secretKey } = kashierEnv();
      verified =
        (await verifyKashierSignature(payload, signature, apiKey)) ||
        (await verifyKashierSignature(payload, signature, secretKey));
    } catch {
      note += "env-missing;";
    }

    try {
      const builtQueryString = buildKashierSignaturePayload(payload);
      note += `debug:received=${signature};qs=${builtQueryString};`;
    } catch (e) {
      note += `debug:build-error:${e instanceof Error ? e.message : String(e)};`;
    }

    if (!verified) {
      note += signature ? "signature-mismatch;rejected;" : "no-signature;rejected;";
      responseStatus = 401;
    } else {
      const flat = flattenPayload(payload);
      const orderId = flat["merchantOrderId"] ?? flat["orderId"] ?? "";
      const paymentStatus = flat["status"] ?? flat["paymentStatus"] ?? "";

      let handledLegacy = false;
      if (orderId) {
        const { data: sub } = await supabaseAdmin
          .from("subscriptions")
          .select("id")
          .eq("kashier_order_id", orderId)
          .maybeSingle();
        if (sub) {
          const res = await finalizePayment(orderId, paymentStatus);
          note += `legacy:${res.status};`;
          handledLegacy = true;
        }
      }

      if (!handledLegacy) {
        const res = await processHostedPayment(payload);
        note += `hosted:${res.outcome};`;
      }
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

  return new Response(responseStatus === 200 ? "ok" : "Invalid signature", { status: responseStatus });
}

export const Route = createFileRoute("/api/public/kashier-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => handle(request),
      GET: async ({ request }) => handle(request),
    },
  },
});

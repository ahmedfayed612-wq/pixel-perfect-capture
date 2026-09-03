import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/kashier-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const {
            kashierEnv,
            verifyKashierSignature,
            finalizePayment,
            flattenPayload,
            processHostedPayment,
          } = await import("@/lib/kashier.server");
          const { apiKey, secretKey } = kashierEnv();
          const body = (await request.json()) as Record<string, unknown>;

          // Kashier posts { event, data: {...} } or a flat payload.
          const payload = (body["data"] && typeof body["data"] === "object"
            ? (body["data"] as Record<string, unknown>)
            : body) as Record<string, unknown>;

          // Signature is computed over the top-level scalar fields of the payload.
          const flatTop: Record<string, string> = {};
          for (const [k, v] of Object.entries(payload)) {
            if (v === null || v === undefined || typeof v === "object") continue;
            flatTop[k] = String(v);
          }

          const signature =
            (request.headers.get("x-kashier-signature") ?? "") ||
            String(payload["signature"] ?? body["signature"] ?? "");

          const verified =
            (await verifyKashierSignature(flatTop, signature, apiKey)) ||
            (await verifyKashierSignature(flatTop, signature, secretKey));

          if (!verified) {
            return new Response("invalid signature", { status: 401 });
          }

          const flat = flattenPayload(payload);
          const orderId = flat["merchantOrderId"] ?? flat["orderId"] ?? "";
          const paymentStatus = flat["status"] ?? flat["paymentStatus"] ?? "";

          // Legacy in-app checkout orders (subscriptions table) still finalize the old way.
          let handledLegacy = false;
          if (orderId) {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const { data: sub } = await supabaseAdmin
              .from("subscriptions")
              .select("id")
              .eq("kashier_order_id", orderId)
              .maybeSingle();
            if (sub) {
              await finalizePayment(orderId, paymentStatus);
              handledLegacy = true;
            }
          }

          // Hosted payment pages (checkouts.kashier.io).
          if (!handledLegacy) {
            await processHostedPayment(payload);
          }
        } catch {
          // Swallow — Kashier retries on non-200 responses.
        }
        return new Response("ok", { status: 200 });
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/kashier-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { kashierEnv, verifyKashierSignature, finalizePayment } = await import("@/lib/kashier.server");
          const { apiKey } = kashierEnv();
          const body = (await request.json()) as Record<string, unknown>;

          // Kashier posts { event, data: {...} } or a flat payload.
          const payload = (body["data"] && typeof body["data"] === "object"
            ? (body["data"] as Record<string, unknown>)
            : body) as Record<string, unknown>;

          const flat: Record<string, string> = {};
          for (const [k, v] of Object.entries(payload)) {
            if (v === null || v === undefined || typeof v === "object") continue;
            flat[k] = String(v);
          }

          const signature =
            (request.headers.get("x-kashier-signature") ?? "") ||
            String(payload["signature"] ?? body["signature"] ?? "");
          const orderId = flat["merchantOrderId"] ?? flat["orderId"] ?? "";
          const paymentStatus = flat["status"] ?? flat["paymentStatus"] ?? "";

          if (orderId && (await verifyKashierSignature(flat, signature, apiKey))) {
            await finalizePayment(orderId, paymentStatus);
          }
        } catch {
          // Swallow — Kashier retries on non-200 responses.
        }
        return new Response("ok", { status: 200 });
      },
    },
  },
});

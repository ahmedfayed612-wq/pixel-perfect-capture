import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type KashierPlan = "monthly" | "nine_month";

export const createKashierOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { plan: KashierPlan }) => {
    if (input?.plan !== "monthly" && input?.plan !== "nine_month") throw new Error("Invalid plan");
    return { plan: input.plan };
  })
  .handler(async ({ data, context }) => {
    const { kashierEnv, buildOrderHash } = await import("./kashier.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { apiKey, mid } = kashierEnv();

    let amount = 360;
    if (data.plan === "monthly") {
      const { count } = await supabaseAdmin
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", context.userId)
        .eq("plan", "monthly")
        .in("status", ["active", "expired"]);
      amount = (count ?? 0) < 2 ? 45 : 60;
    }

    const orderId = crypto.randomUUID();
    const currency = "EGP";
    const amountStr = String(amount);
    const hash = await buildOrderHash(mid, orderId, amountStr, currency, apiKey);

    const { error } = await supabaseAdmin.from("subscriptions").insert({
      user_id: context.userId,
      plan: data.plan,
      status: "pending",
      kashier_order_id: orderId,
      amount_paid: amount,
    });
    if (error) throw new Error("Could not create the order");

    return { mid, orderId, amount, currency, hash };
  });

export const verifyKashierPayment = createServerFn({ method: "POST" })
  .inputValidator((input: { params: Record<string, string> }) => {
    if (!input?.params || typeof input.params !== "object") throw new Error("Invalid params");
    return { params: input.params as Record<string, string> };
  })
  .handler(async ({ data }) => {
    const { kashierEnv, verifyKashierSignature, finalizePayment } = await import("./kashier.server");
    const { apiKey } = kashierEnv();
    const params = data.params;
    const signature = params["signature"] ?? "";
    const orderId = params["merchantOrderId"] ?? params["orderId"] ?? "";
    const paymentStatus = params["paymentStatus"] ?? "";

    const valid = await verifyKashierSignature(params, signature, apiKey);
    if (!valid || !orderId) return { ok: false, status: "invalid" as const };

    const result = await finalizePayment(orderId, paymentStatus);
    return { ok: result.ok, status: result.status };
  });

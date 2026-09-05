import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type KashierPlan = "monthly" | "nine_month";

const PLAN_AMOUNT: Record<KashierPlan, number> = { monthly: 45, nine_month: 360 };

function findSessionUrl(input: unknown, depth = 0): string | null {
  if (!input || typeof input !== "object" || depth > 5) return null;
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (typeof v === "string" && /sessionurl|checkouturl|redirecturl|paymenturl/i.test(k) && v.startsWith("http")) {
      return v;
    }
    if (v && typeof v === "object") {
      const nested = findSessionUrl(v, depth + 1);
      if (nested) return nested;
    }
  }
  return null;
}

/** Creates a pending subscription row + a Kashier payment session, returns the hosted session URL. */
export const createKashierOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { plan: KashierPlan; origin?: string }) => {
    if (input?.plan !== "monthly" && input?.plan !== "nine_month") throw new Error("Invalid plan");
    return { plan: input.plan, origin: typeof input.origin === "string" ? input.origin : "" };
  })
  .handler(async ({ data, context }) => {
    const { kashierEnv } = await import("./kashier.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { mid, secretKey, apiKey } = kashierEnv();

    const amount = PLAN_AMOUNT[data.plan];
    const currency = "EGP";
    const orderId = crypto.randomUUID();

    // Real account email — never typed by the customer at checkout.
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const email = authUser?.user?.email ?? "";

    const { error } = await supabaseAdmin.from("subscriptions").insert({
      user_id: context.userId,
      plan: data.plan,
      status: "pending",
      kashier_order_id: orderId,
      amount_paid: amount,
    });
    if (error) throw new Error("Could not create the order");

    const origin = data.origin || "https://waqtitech.lovable.app";

    const res = await fetch("https://api.kashier.io/v3/payment/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: secretKey,
        "api-key": apiKey,
      },
      body: JSON.stringify({
        merchantId: mid,
        order: orderId,
        amount,
        currency,
        mode: "live",
        merchantRedirect: `${origin}/payment-callback`,
        serverWebhook: `${origin}/api/public/kashier-webhook`,
        customer: {
          email,
          reference: context.userId,
        },
        metaData: { plan: data.plan, user_id: context.userId },
      }),
    });

    const body = (await res.json().catch(() => null)) as unknown;
    const sessionUrl = findSessionUrl(body);
    if (!res.ok || !sessionUrl) {
      throw new Error("Could not start the payment session");
    }

    return { orderId, amount, currency, sessionUrl };
  });

export const verifyKashierPayment = createServerFn({ method: "POST" })
  .inputValidator((input: { params: Record<string, string> }) => {
    if (!input?.params || typeof input.params !== "object") throw new Error("Invalid params");
    return { params: input.params as Record<string, string> };
  })
  .handler(async ({ data }) => {
    const { kashierEnv, verifyKashierSignature, finalizePayment } = await import("./kashier.server");
    const { apiKey, secretKey } = kashierEnv();
    const params = data.params;
    const signature = params["signature"] ?? "";
    const orderId = params["merchantOrderId"] ?? params["orderId"] ?? "";
    const paymentStatus = params["paymentStatus"] ?? params["status"] ?? "";

    const valid =
      (await verifyKashierSignature(params as Record<string, unknown>, signature, apiKey)) ||
      (await verifyKashierSignature(params as Record<string, unknown>, signature, secretKey));
    if (!valid || !orderId) return { ok: false, status: "invalid" as const };

    const result = await finalizePayment(orderId, paymentStatus);
    return { ok: result.ok, status: result.status };
  });


import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type KashierPlan = "monthly" | "nine_month";

const PLAN_AMOUNT: Record<KashierPlan, number> = { monthly: 45, nine_month: 360 };

function findSessionUrl(input: unknown, depth = 0): string | null {
  if (!input || typeof input !== "object" || depth > 6) return null;
  // 1st pass: explicitly named URL fields
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (
      typeof v === "string" &&
      /session_?url|checkout_?url|redirect_?url|payment_?url|hosted_?url|^url$|iframe_?url/i.test(
        k,
      ) &&
      v.startsWith("http")
    ) {
      return v;
    }
  }
  // 2nd pass: any Kashier checkout-looking URL
  for (const v of Object.values(input as Record<string, unknown>)) {
    if (typeof v === "string" && /^https?:\/\/[^\s]*kashier\.io/i.test(v)) return v;
  }
  for (const v of Object.values(input as Record<string, unknown>)) {
    if (v && typeof v === "object") {
      const nested = findSessionUrl(v, depth + 1);
      if (nested) return nested;
    }
  }
  return null;
}

function findSessionId(input: unknown, depth = 0): string | null {
  if (!input || typeof input !== "object" || depth > 6) return null;
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (typeof v === "string" && v && /^session_?id$/i.test(k)) return v;
  }
  for (const v of Object.values(input as Record<string, unknown>)) {
    if (v && typeof v === "object") {
      const nested = findSessionId(v, depth + 1);
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

    console.log("[Order Creation] Creating order for user:", context.userId, "plan:", data.plan, "amount:", amount);

    // Real account email — never typed by the customer at checkout.
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const email = authUser?.user?.email ?? "";

    console.log("[Order Creation] User email:", email);

    const { error } = await supabaseAdmin.from("subscriptions").insert({
      user_id: context.userId,
      plan: data.plan,
      status: "pending",
      kashier_order_id: orderId,
      amount_paid: amount,
    });
    if (error) {
      console.error("[Order Creation] Failed to create subscription:", error);
      throw new Error("Could not create the order");
    }

    console.log("[Order Creation] Subscription created successfully, order ID:", orderId);

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

    const text = await res.text();
    let body: unknown = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }

    console.log("[Order Creation] Kashier API response status:", res.status);

    let sessionUrl = findSessionUrl(body);
    if (!sessionUrl) {
      const sessionId = findSessionId(body);
      if (sessionId)
        sessionUrl = `https://checkout.kashier.io/?sessionId=${encodeURIComponent(sessionId)}`;
    }

    console.log("[Order Creation] Session URL:", sessionUrl);

    if (!res.ok || !sessionUrl || !/^https?:\/\//.test(sessionUrl)) {
      // Keep a server-side trace so failures are diagnosable without exposing keys.
      try {
        await supabaseAdmin.from("webhook_logs").insert({
          source: "kashier-session",
          verified: false,
          note: `create-session http:${res.status}; order:${orderId}; url:${sessionUrl ?? "none"}`,
          raw: (body ?? { text: text.slice(0, 2000) }) as never,
        });
      } catch {
        /* logging must never break checkout */
      }
      const detail =
        (body && typeof body === "object"
          ? String(
              (body as Record<string, unknown>)["message"] ??
                (body as Record<string, unknown>)["messages"] ??
                (body as Record<string, unknown>)["error"] ??
                "",
            )
          : "") || `HTTP ${res.status}`;
      console.error("[Order Creation] Failed to create session:", detail);
      throw new Error(`Could not start the payment session (${detail})`.slice(0, 300));
    }

    console.log("[Order Creation] Payment session created successfully");
    return { orderId, amount, currency, sessionUrl };
  });

export const verifyKashierPayment = createServerFn({ method: "POST" })
  .inputValidator((input: { params: Record<string, string> }) => {
    if (!input?.params || typeof input.params !== "object") throw new Error("Invalid params");
    return { params: input.params as Record<string, string> };
  })
  .handler(async ({ data }) => {
    const {
      kashierEnv,
      verifyRedirectSignature,
      finalizePayment,
      orderIdCandidates,
      reconcileAndFinalize,
    } = await import("./kashier.server");
    const { apiKey, secretKey } = kashierEnv();
    const params = data.params;
    const signature = params["signature"] ?? "";
    const orderIds = orderIdCandidates(params);
    const paymentStatus = params["paymentStatus"] ?? params["status"] ?? "";

    console.log("[Payment Callback] Processing payment verification");
    console.log("[Payment Callback] Order IDs:", orderIds);
    console.log("[Payment Callback] Payment status:", paymentStatus);
    console.log("[Payment Callback] Signature present:", !!signature);

    if (orderIds.length === 0) {
      console.log("[Payment Callback] No order IDs found - invalid");
      return { ok: false, status: "invalid" as const };
    }

    const valid = await verifyRedirectSignature(params, signature, apiKey, secretKey);
    console.log("[Payment Callback] Signature valid:", valid);
    
    const result = valid
      ? await finalizePayment(orderIds, paymentStatus)
      : await reconcileAndFinalize(orderIds);
    
    console.log("[Payment Callback] Final result:", result);
    return { ok: result.ok, status: result.status };
  });

// Server-only Kashier helpers. Never import from client code.

const encoder = new TextEncoder();

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function kashierEnv() {
  const apiKey = process.env["KASHIER_API_KEY"];
  const mid = process.env["KASHIER_MID"];
  const secretKey = process.env["KASHIER_SECRET_KEY"];
  if (!apiKey || !mid || !secretKey) throw new Error("Kashier is not configured");
  return { apiKey, mid, secretKey };
}

/** Hash used to build the hosted-payment redirect URL (signed with the Secret Key). */
export async function buildOrderHash(mid: string, orderId: string, amount: string, currency: string, secretKey: string) {
  const path = `/?payment=${mid}.${orderId}.${amount}.${currency}`;
  return hmacSha256Hex(secretKey, path);
}

/**
 * Kashier signs its callback/webhook payloads with an HMAC-SHA256 over a
 * `key=value&...` string built from the fields named in `signatureKeys`,
 * in exactly that order. Pass the raw (unflattened) payload.
 */
export async function verifyKashierSignature(
  payload: Record<string, unknown>,
  signature: string,
  key: string,
): Promise<boolean> {
  if (!signature) return false;

  const source = (payload["data"] && typeof payload["data"] === "object"
    ? (payload["data"] as Record<string, unknown>)
    : payload) as Record<string, unknown>;

  const rawKeys = (source["signatureKeys"] ?? payload["signatureKeys"]) as unknown;
  const keys: string[] = Array.isArray(rawKeys)
    ? rawKeys.map((k) => String(k))
    : typeof rawKeys === "string"
      ? rawKeys.split(",").map((k) => k.trim()).filter(Boolean)
      : [];
  if (keys.length === 0) return false;

  const queryString = keys
    .map((k) => {
      const v = source[k] ?? payload[k];
      return `${k}=${v === undefined || v === null ? "" : String(v)}`;
    })
    .join("&");

  const expected = await hmacSha256Hex(key, queryString);
  return expected.toLowerCase() === signature.toLowerCase();
}


export type FinalizeResult = { ok: boolean; status: "active" | "failed" | "pending"; message?: string };

/**
 * Single source of truth for applying a Kashier payment result.
 * Idempotent: an already-active subscription is never extended twice.
 */
export async function finalizePayment(orderId: string, paymentStatus: string): Promise<FinalizeResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: sub, error } = await supabaseAdmin
    .from("subscriptions")
    .select("id, user_id, plan, status")
    .eq("kashier_order_id", orderId)
    .maybeSingle();

  if (error || !sub) return { ok: false, status: "pending", message: "Order not found" };
  if (sub.status === "active") return { ok: true, status: "active" };

  const success = String(paymentStatus).toUpperCase() === "SUCCESS";

  if (!success) {
    await supabaseAdmin.from("subscriptions").update({ status: "failed" }).eq("id", sub.id);
    return { ok: false, status: "failed" };
  }

  const now = new Date();
  const expiry = new Date(now);
  expiry.setMonth(expiry.getMonth() + (sub.plan === "nine_month" ? 9 : 1));

  await supabaseAdmin
    .from("subscriptions")
    .update({ status: "active", expiry_date: expiry.toISOString() })
    .eq("id", sub.id);

  await supabaseAdmin
    .from("profiles")
    .update({
      is_pro: true,
      plan: "pro",
      subscription_start: now.toISOString().slice(0, 10),
      subscription_end: expiry.toISOString().slice(0, 10),
    })
    .eq("id", sub.user_id);

  return { ok: true, status: "active" };
}

/* ------------------------------------------------------------------ *
 * Hosted payment pages (checkouts.kashier.io) -> Pro subscription
 * ------------------------------------------------------------------ */

export const PLAN_PERIODS = { monthly: 30, nine_month: 270 } as const;
export type HostedPlan = keyof typeof PLAN_PERIODS;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Flattens a nested webhook payload into `key -> string value` pairs (last key wins). */
export function flattenPayload(input: unknown, out: Record<string, string> = {}, depth = 0): Record<string, string> {
  if (!input || typeof input !== "object" || depth > 5) return out;
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (v === null || v === undefined) continue;
    if (Array.isArray(v)) {
      // Kashier custom fields usually arrive as [{ label/name/key, value }, ...]
      for (const item of v) {
        if (item && typeof item === "object") {
          const rec = item as Record<string, unknown>;
          const label = rec["label"] ?? rec["name"] ?? rec["key"] ?? rec["fieldName"];
          const value = rec["value"] ?? rec["fieldValue"];
          if (label !== undefined && value !== undefined) out[String(label)] = String(value);
          else flattenPayload(item, out, depth + 1);
        }
      }
    } else if (typeof v === "object") {
      flattenPayload(v, out, depth + 1);
    } else {
      out[k] = String(v);
    }
  }
  return out;
}

const norm = (s: string | undefined | null) => (s ?? "").trim().toLowerCase();

/** Custom field: "Email you used to sign up for Waqti" (or any signup/account-email labelled field). */
export function extractSignupEmail(flat: Record<string, string>): string | null {
  const entries = Object.entries(flat);
  const labelled = entries.find(([k, v]) => /sign\s*-?up|signup|waqti|account/i.test(k) && EMAIL_RE.test(v.trim()));
  if (labelled) return norm(labelled[1]);
  const custom = entries.find(([k, v]) => /custom|extra|meta/i.test(k) && EMAIL_RE.test(v.trim()));
  return custom ? norm(custom[1]) : null;
}

export function extractCheckoutEmail(flat: Record<string, string>): string | null {
  for (const key of ["email", "customerEmail", "billingEmail", "payerEmail", "customer_email"]) {
    const v = flat[key];
    if (v && EMAIL_RE.test(v.trim())) return norm(v);
  }
  const any = Object.entries(flat).find(
    ([k, v]) =>
      /email/i.test(k) &&
      !/business|merchant|shop|store|company/i.test(k) &&
      EMAIL_RE.test(v.trim()),
  );
  return any ? norm(any[1]) : null;
}

export function extractPhone(flat: Record<string, string>): string | null {
  for (const [k, v] of Object.entries(flat)) {
    if (/phone|mobile|msisdn/i.test(k) && /\d{7,}/.test(v)) return v.trim();
  }
  return null;
}

/** 45 EGP -> monthly, 360 EGP -> nine_month, with rounding tolerance. */
export function planFromAmount(amount: number): HostedPlan | null {
  if (!Number.isFinite(amount)) return null;
  if (Math.abs(amount - 45) <= 1.5) return "monthly";
  if (Math.abs(amount - 360) <= 5) return "nine_month";
  return null;
}

export function isSuccessStatus(status: string): boolean {
  return ["success", "successful", "paid", "captured", "approved"].includes(norm(status));
}

export type HostedResult =
  | { ok: true; outcome: "granted" | "duplicate"; userId?: string; plan?: HostedPlan }
  | { ok: false; outcome: "not_success" | "unrecognized_amount" | "unmatched" | "invalid" };

export async function processHostedPayment(rawPayload: unknown): Promise<HostedResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const flat = flattenPayload(rawPayload);

  const status = flat["status"] ?? flat["paymentStatus"] ?? flat["transactionStatus"] ?? "";
  const transactionId =
    flat["transactionId"] ?? flat["merchantOrderId"] ?? flat["orderId"] ?? flat["kashierOrderId"] ?? flat["id"] ?? "";
  const amount = Number(flat["amount"] ?? flat["totalAmount"] ?? flat["orderAmount"] ?? NaN);
  const currency = (flat["currency"] ?? "EGP").toUpperCase();

  if (!transactionId) return { ok: false, outcome: "invalid" };
  if (!isSuccessStatus(status)) return { ok: false, outcome: "not_success" };

  const signupEmail = extractSignupEmail(flat);
  const checkoutEmail = extractCheckoutEmail(flat);
  const phone = extractPhone(flat);

  const plan = planFromAmount(amount);
  if (!plan) {
    await supabaseAdmin.from("payments").upsert(
      {
        transaction_id: transactionId,
        amount: Number.isFinite(amount) ? amount : 0,
        currency,
        status: "unrecognized_amount",
        signup_email: signupEmail,
        checkout_email: checkoutEmail,
        checkout_phone: phone,
        raw: rawPayload as never,
      },
      { onConflict: "transaction_id", ignoreDuplicates: true },
    );
    return { ok: false, outcome: "unrecognized_amount" };
  }

  // Idempotency: this transaction was already processed.
  const { data: existing } = await supabaseAdmin
    .from("payments")
    .select("id, status, user_id")
    .eq("transaction_id", transactionId)
    .maybeSingle();
  if (existing && existing.status === "matched") {
    return { ok: true, outcome: "duplicate", plan };
  }

  const { data: userId } = await supabaseAdmin.rpc("find_user_for_payment", {
    _signup_email: signupEmail ?? "",
    _checkout_email: checkoutEmail ?? "",
    _phone: phone ?? "",
  });

  if (!userId) {
    await supabaseAdmin.from("payments").upsert(
      {
        transaction_id: transactionId,
        amount,
        currency,
        plan,
        status: "unmatched",
        signup_email: signupEmail,
        checkout_email: checkoutEmail,
        checkout_phone: phone,
        raw: rawPayload as never,
      },
      { onConflict: "transaction_id" },
    );
    return { ok: false, outcome: "unmatched" };
  }

  await supabaseAdmin.rpc("grant_pro", { _user_id: userId as string, _days: PLAN_PERIODS[plan] });

  await supabaseAdmin.from("payments").upsert(
    {
      transaction_id: transactionId,
      user_id: userId as string,
      amount,
      currency,
      plan,
      status: "matched",
      signup_email: signupEmail,
      checkout_email: checkoutEmail,
      checkout_phone: phone,
      raw: rawPayload as never,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "transaction_id" },
  );

  return { ok: true, outcome: "granted", userId: userId as string, plan };
}

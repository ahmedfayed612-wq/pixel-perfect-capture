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
 * Kashier signs its callback/webhook payloads with an HMAC-SHA256 over the
 * `key=value&...` query string of every returned field except `signature` and `mode`.
 */
export async function verifyKashierSignature(
  params: Record<string, string>,
  signature: string,
  apiKey: string,
): Promise<boolean> {
  if (!signature) return false;
  const queryString = Object.entries(params)
    .filter(([k, v]) => k !== "signature" && k !== "mode" && v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const expected = await hmacSha256Hex(apiKey, queryString);
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

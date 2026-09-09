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
export async function buildOrderHash(
  mid: string,
  orderId: string,
  amount: string,
  currency: string,
  secretKey: string,
) {
  const path = `/?payment=${mid}.${orderId}.${amount}.${currency}`;
  return hmacSha256Hex(secretKey, path);
}

/** Params Kashier appends to the redirect URL *after* computing its signature. */
const REDIRECT_UNSIGNED_KEYS = new Set(["signature", "mode"]);

function signatureKeysOf(
  payload: Record<string, unknown>,
  source: Record<string, unknown>,
): string[] {
  const rawKeys = (source["signatureKeys"] ?? payload["signatureKeys"]) as unknown;
  if (Array.isArray(rawKeys)) return rawKeys.map((k) => String(k)).filter(Boolean);
  if (typeof rawKeys === "string")
    return rawKeys
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
  return [];
}

function dataOf(payload: Record<string, unknown>): Record<string, unknown> {
  return (
    payload["data"] && typeof payload["data"] === "object"
      ? (payload["data"] as Record<string, unknown>)
      : payload
  ) as Record<string, unknown>;
}

/**
 * Webhook signing string: the fields named by `signatureKeys`, joined as
 * `key=value&...` **in the order the payload declares them** and URL-encoded,
 * mirroring Kashier's `queryString.stringify(_.pick(data, data.signatureKeys))`.
 * `_.pick` keeps the requested order, so the list must not be re-sorted.
 * Pass the raw (unflattened) payload.
 */
export function buildKashierSignaturePayload(payload: Record<string, unknown>): string {
  const source = dataOf(payload);
  const keys = signatureKeysOf(payload, source);
  if (keys.length === 0) return "";

  return keys
    .map((k) => {
      const v = source[k] ?? payload[k];
      const value = v === undefined || v === null ? "" : String(v);
      return `${encodeURIComponent(k)}=${encodeURIComponent(value)}`;
    })
    .join("&");
}

/**
 * Redirect signing string: every query parameter except `signature` and `mode`,
 * joined as `key=value&...` in the order Kashier sent them, values untouched —
 * the scheme used by Kashier's own `validateSignature` sample.
 */
export function buildRedirectSignaturePayload(params: Record<string, string>): string {
  return Object.entries(params)
    .filter(([k]) => !REDIRECT_UNSIGNED_KEYS.has(k))
    .map(([k, v]) => `${k}=${v ?? ""}`)
    .join("&");
}

/**
 * Every string Kashier could plausibly have signed for this payload. Webhooks
 * declare their signed fields, redirects do not, and older integrations sorted
 * the keys — all shapes are checked so a format change can never silently
 * withhold Pro from a customer who paid.
 */
export function signatureCandidates(payload: Record<string, unknown>): string[] {
  const source = dataOf(payload);
  const keys = signatureKeysOf(payload, source);
  const candidates: string[] = [];

  if (keys.length > 0) {
    candidates.push(buildKashierSignaturePayload(payload));
    candidates.push(
      keys.map((k) => `${k}=${source[k] ?? payload[k] ?? ""}`).join("&"),
      [...keys]
        .sort()
        .map(
          (k) =>
            `${encodeURIComponent(k)}=${encodeURIComponent(String(source[k] ?? payload[k] ?? ""))}`,
        )
        .join("&"),
    );
  }

  const flatParams: Record<string, string> = {};
  for (const [k, v] of Object.entries(source)) {
    if (v === null || v === undefined || typeof v === "object") continue;
    flatParams[k] = String(v);
  }
  candidates.push(buildRedirectSignaturePayload(flatParams));

  return candidates.filter((c, i, all) => c !== "" && all.indexOf(c) === i);
}

/** Where Kashier puts the signature: webhooks use `kashierSignature`, redirects `signature`. */
export function extractSignature(payload: Record<string, unknown>): string {
  const source = dataOf(payload);
  for (const key of ["kashierSignature", "signature"]) {
    const v = source[key] ?? payload[key];
    if (typeof v === "string" && v) return v;
  }
  return "";
}

async function matchesAny(
  candidates: string[],
  signature: string,
  keys: string[],
): Promise<boolean> {
  for (const key of keys) {
    if (!key) continue;
    for (const candidate of candidates) {
      const expected = await hmacSha256Hex(key, candidate);
      if (expected.toLowerCase() === signature.toLowerCase()) return true;
    }
  }
  return false;
}

export async function verifyKashierSignature(
  payload: Record<string, unknown>,
  signature: string,
  ...keys: string[]
): Promise<boolean> {
  if (!signature) return false;
  const candidates = signatureCandidates(payload);
  if (candidates.length === 0) return false;
  return matchesAny(candidates, signature, keys);
}

/**
 * Redirect callbacks carry no `signatureKeys`, so the signed string is rebuilt
 * from the query parameters in the order they arrived.
 */
export async function verifyRedirectSignature(
  params: Record<string, string>,
  signature: string,
  ...keys: string[]
): Promise<boolean> {
  if (!signature) return false;
  const raw = buildRedirectSignaturePayload(params);
  if (!raw) return false;
  const encoded = Object.entries(params)
    .filter(([k]) => !REDIRECT_UNSIGNED_KEYS.has(k))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v ?? "")}`)
    .join("&");
  return matchesAny([raw, encoded], signature, keys);
}

export type FinalizeResult = {
  ok: boolean;
  status: "active" | "failed" | "pending";
  message?: string;
};

export type PaymentStatus = "active" | "failed" | "pending" | "success" | "captured" | "approved";

/**
 * Call Kashier's API to verify payment status directly.
 * This is used when signature verification fails but we have an order ID.
 */
async function reconcileWithKashierAPI(orderId: string): Promise<{ status: string | null; error?: string }> {
  try {
    const { mid, secretKey } = kashierEnv();
    
    console.log("[Kashier API] Reconciling order:", orderId);
    
    const response = await fetch(`https://api.kashier.io/v3/payments/orders/${orderId}`, {
      method: "GET",
      headers: {
        "Authorization": secretKey,
        "api-key": process.env["KASHIER_API_KEY"] || "",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Kashier API] Reconciliation failed:", response.status, errorText);
      return { status: null, error: `HTTP ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    console.log("[Kashier API] Reconciliation response:", JSON.stringify(data).slice(0, 500));
    
    // Extract payment status from Kashier response
    const status = data?.data?.status || data?.status || data?.paymentStatus || null;
    console.log("[Kashier API] Extracted status:", status);
    
    return { status };
  } catch (error) {
    console.error("[Kashier API] Reconciliation error:", error);
    return { status: null, error: error instanceof Error ? error.message : String(error) };
  }
}

/** Keys under which Kashier echoes back the order id we sent as `order`. */
const ORDER_ID_KEYS = [
  "merchantOrderId",
  "orderId",
  "order",
  "merchantOrderID",
  "kashierOrderId",
] as const;

export function orderIdCandidates(flat: Record<string, string>): string[] {
  const seen = new Set<string>();
  for (const key of ORDER_ID_KEYS) {
    const v = flat[key]?.trim();
    if (v) seen.add(v);
  }
  return [...seen];
}

/**
 * Asks Kashier itself what happened to an order. Callbacks are only as
 * trustworthy as their signature, so this is the authority whenever the
 * signature does not check out.
 */
export type ReconciledOrder = {
  status: "captured" | "failed" | "unknown";
  /** Amount Kashier actually captured, not the amount the callback claims. */
  amount: number | null;
};

export async function reconcileKashierOrder(orderId: string): Promise<ReconciledOrder> {
  const { apiKey, secretKey } = kashierEnv();
  const url = `https://api.kashier.io/payments/orders/${encodeURIComponent(orderId)}`;

  for (const token of [secretKey, apiKey]) {
    let body: unknown;
    try {
      const res = await fetch(url, {
        headers: { Authorization: token, accept: "application/json" },
      });
      if (!res.ok) continue;
      body = await res.json();
    } catch {
      continue;
    }
    const envelope = body as Record<string, unknown> | null;
    const order = (envelope?.["response"] ?? envelope) as Record<string, unknown> | null;
    const status = norm(order?.["status"] as string | undefined);
    if (!status) continue;

    const captured = Number(order?.["totalCapturedAmount"]);
    return {
      status: status === "captured" || isSuccessStatus(status) ? "captured" : "failed",
      amount: Number.isFinite(captured) ? captured : null,
    };
  }
  return { status: "unknown", amount: null };
}

/** Applies a callback whose signature could not be verified, after confirming it with Kashier. */
export async function reconcileAndFinalize(orderIds: string[]): Promise<FinalizeResult> {
  for (const orderId of orderIds) {
    const { status } = await reconcileKashierOrder(orderId);
    if (status === "captured") return finalizePayment(orderIds, "SUCCESS");
    if (status === "failed") return finalizePayment(orderIds, "FAILED");
  }
  return { ok: false, status: "pending", message: "Kashier could not confirm the order" };
}

/**
 * Single source of truth for applying a Kashier payment result.
 * Idempotent: an already-active subscription is never extended twice.
 */
export async function finalizePayment(
  orderId: string | string[],
  paymentStatus: string,
): Promise<FinalizeResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const orderIds = (Array.isArray(orderId) ? orderId : [orderId]).filter(Boolean);
  if (orderIds.length === 0) return { ok: false, status: "pending", message: "Order not found" };

  const { data: sub, error } = await supabaseAdmin
    .from("subscriptions")
    .select("id, user_id, plan, status")
    .in("kashier_order_id", orderIds)
    .limit(1)
    .maybeSingle();

  if (error || !sub) return { ok: false, status: "pending", message: "Order not found" };
  if (sub.status === "active") return { ok: true, status: "active" };

  let success = String(paymentStatus).toUpperCase() === "SUCCESS";
  
  // If payment status is not successful from webhook, try reconciling with Kashier API
  if (!success) {
    console.log("[Payment] Webhook status not successful, attempting Kashier API reconciliation");
    const reconciliation = await reconcileWithKashierAPI(orderIds[0]);
    
    if (reconciliation.status) {
      const normalizedStatus = String(reconciliation.status).toUpperCase();
      success = ["SUCCESS", "CAPTURED", "APPROVED", "PAID"].includes(normalizedStatus);
      console.log("[Payment] Reconciliation status:", reconciliation.status, "Success:", success);
    } else {
      console.log("[Payment] Reconciliation failed:", reconciliation.error);
    }
  }

  if (!success) {
    // Anything still in flight stays pending so a later SUCCESS can activate it.
    if (!isFailureStatus(paymentStatus)) return { ok: false, status: "pending" };
    await supabaseAdmin.from("subscriptions").update({ status: "failed" }).eq("id", sub.id);
    return { ok: false, status: "failed" };
  }

  const days = sub.plan === "nine_month" ? PLAN_PERIODS.nine_month : PLAN_PERIODS.monthly;
  const { data: expiry, error: grantError } = await supabaseAdmin.rpc("grant_pro", {
    _user_id: sub.user_id,
    _days: days,
  });
  if (grantError || !expiry) {
    throw new Error(`Could not activate Pro: ${grantError?.message ?? "missing expiry"}`);
  }

  const { error: updateError } = await supabaseAdmin
    .from("subscriptions")
    .update({ status: "active", expiry_date: String(expiry) })
    .eq("id", sub.id);
  if (updateError) throw new Error(`Could not activate subscription: ${updateError.message}`);

  return { ok: true, status: "active" };
}

/* ------------------------------------------------------------------ *
 * Hosted payment pages (checkouts.kashier.io) -> Pro subscription
 * ------------------------------------------------------------------ */

export const PLAN_PERIODS = { monthly: 30, nine_month: 270 } as const;
export type HostedPlan = keyof typeof PLAN_PERIODS;
export type SubscriptionPlan = "monthly" | "nine_month";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Flattens a nested webhook payload into `key -> string value` pairs (last key wins). */
export function flattenPayload(
  input: unknown,
  out: Record<string, string> = {},
  depth = 0,
): Record<string, string> {
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
  
  // First try: Look for explicit signup/waqti/account labelled fields
  const labelled = entries.find(([k, v]) => /sign\s*-?up|signup|waqti|account/i.test(k) && EMAIL_RE.test(v.trim()));
  if (labelled) return norm(labelled[1]);
  
  // Second try: Look for custom/extra/meta fields with emails
  const custom = entries.find(([k, v]) => /custom|extra|meta/i.test(k) && EMAIL_RE.test(v.trim()));
  if (custom) return norm(custom[1]);
  
  // Third try: Look for any field with "email" in the name that might be user-provided
  const anyEmail = entries.find(([k, v]) => 
    /email/i.test(k) && 
    !/business|merchant|shop|store|company|admin|support/i.test(k) && 
    EMAIL_RE.test(v.trim())
  );
  if (anyEmail) return norm(anyEmail[1]);
  
  // Fourth try: Look for customer data fields
  const customer = entries.find(([k, v]) => 
    /customer|user|payer|buyer/i.test(k) && 
    EMAIL_RE.test(v.trim())
  );
  if (customer) return norm(customer[1]);
  
  return null;
}

export function extractCheckoutEmail(flat: Record<string, string>): string | null {
  // First try: Standard email field names
  for (const key of ["email", "customerEmail", "billingEmail", "payerEmail", "customer_email", "payer_email", "billing_email"]) {
    const v = flat[key];
    if (v && EMAIL_RE.test(v.trim())) return norm(v);
  }
  
  // Second try: Any field with "email" in the name, excluding business emails
  const any = Object.entries(flat).find(
    ([k, v]) =>
      /email/i.test(k) &&
      !/business|merchant|shop|store|company|admin|support/i.test(k) &&
      EMAIL_RE.test(v.trim()),
  );
  if (any) return norm(any[1]);
  
  // Third try: Look in nested customer object data (sometimes flattened)
  const customerFields = Object.entries(flat).filter(([k]) => /customer/i.test(k));
  for (const [k, v] of customerFields) {
    if (EMAIL_RE.test(v.trim())) return norm(v);
  }
  
  return null;
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

export function isFailureStatus(status: string): boolean {
  return [
    "failure",
    "failed",
    "declined",
    "rejected",
    "cancelled",
    "canceled",
    "voided",
    "error",
  ].includes(norm(status));
}

export type HostedResult =
  | { ok: true; outcome: "granted" | "duplicate"; userId?: string; plan?: HostedPlan }
  | { ok: false; outcome: "not_success" | "unrecognized_amount" | "unmatched" | "invalid" };

async function grantProAccess(
  userId: string,
  transactionId: string,
  amount: number,
  currency: string,
  plan: HostedPlan,
  signupEmail: string | null,
  checkoutEmail: string | null,
  phone: string | null,
  rawPayload: unknown
): Promise<HostedResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  
  console.log("[Payment Debug] Granting Pro to user:", userId, "for", PLAN_PERIODS[plan], "days");
  await supabaseAdmin.rpc("grant_pro", { _user_id: userId, _days: PLAN_PERIODS[plan] });

  console.log("[Payment Debug] Logging successful payment match");
  await supabaseAdmin.from("payments").upsert(
    {
      transaction_id: transactionId,
      user_id: userId,
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

  console.log("[Payment Debug] Payment processed successfully - Pro granted");
  return { ok: true, outcome: "granted", userId, plan };
}

export async function processHostedPayment(
  rawPayload: unknown,
  reconciled?: ReconciledOrder,
): Promise<HostedResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const flat = flattenPayload(rawPayload);

  const status =
    reconciled?.status === "captured"
      ? "SUCCESS"
      : (flat["status"] ?? flat["paymentStatus"] ?? flat["transactionStatus"] ?? "");
  const transactionId =
    flat["transactionId"] ??
    flat["merchantOrderId"] ??
    flat["orderId"] ??
    flat["kashierOrderId"] ??
    flat["id"] ??
    "";
  const amount =
    reconciled?.amount ??
    Number(flat["amount"] ?? flat["totalAmount"] ?? flat["orderAmount"] ?? NaN);
  const currency = (flat["currency"] ?? "EGP").toUpperCase();

  // Enhanced logging for debugging
  console.log("[Payment Debug] Transaction ID:", transactionId);
  console.log("[Payment Debug] Status:", status);
  console.log("[Payment Debug] Amount:", amount, currency);
  console.log("[Payment Debug] Flattened payload keys:", Object.keys(flat).slice(0, 20).join(", "));

  if (!transactionId) return { ok: false, outcome: "invalid" };
  
  // For hosted payments, we need to verify with Kashier API if signature verification failed
  // This is critical because hosted payments often don't have user information in the webhook
  if (!isSuccessStatus(status)) {
    console.log("[Payment Debug] Status not successful, attempting Kashier API reconciliation");
    const reconciliation = await reconcileWithKashierAPI(transactionId);
    
    if (reconciliation.status) {
      const normalizedStatus = String(reconciliation.status).toUpperCase();
      const isActuallySuccessful = ["SUCCESS", "CAPTURED", "APPROVED", "PAID"].includes(normalizedStatus);
      console.log("[Payment Debug] Reconciliation status:", reconciliation.status, "Actually successful:", isActuallySuccessful);
      
      if (!isActuallySuccessful) {
        return { ok: false, outcome: "not_success" };
      }
      // If reconciliation shows success, continue processing
    } else {
      console.log("[Payment Debug] Reconciliation failed:", reconciliation.error);
      return { ok: false, outcome: "not_success" };
    }
  }

  const signupEmail = extractSignupEmail(flat);
  const checkoutEmail = extractCheckoutEmail(flat);
  const phone = extractPhone(flat);

  console.log("[Payment Debug] Extracted emails - signup:", signupEmail, "checkout:", checkoutEmail, "phone:", phone);

  const plan = planFromAmount(amount);
  if (!plan) {
    try {
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
    } catch (error) {
      console.error("Failed to log unrecognized amount payment:", error);
    }
    return { ok: false, outcome: "unrecognized_amount" };
  }

  // Idempotency: this transaction was already processed.
  try {
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("payments")
      .select("id, status, user_id, plan")
      .eq("transaction_id", transactionId)
      .maybeSingle();
    
    if (existingError) {
      console.error("Failed to check existing payment:", existingError);
    }
    
    if (existing && existing.status === "matched") {
      return { ok: true, outcome: "duplicate", plan: existing.plan as HostedPlan };
    }
    
    // If payment exists but wasn't matched, we can retry processing
    if (existing && existing.status !== "matched") {
      // Continue with processing - will update the existing record
    }
  } catch (error) {
    console.error("Error checking existing payment:", error);
    // Continue with processing - better to potentially duplicate than to fail
  }

  try {
    console.log("[Payment Debug] Attempting to find user with emails and phone...");
    const { data: userId, error: userError } = await supabaseAdmin.rpc("find_user_for_payment", {
      _signup_email: signupEmail ?? "",
      _checkout_email: checkoutEmail ?? "",
      _phone: phone ?? "",
    });

    if (userError) {
      console.error("[Payment Debug] Failed to find user for payment:", userError);
    }

    console.log("[Payment Debug] User ID found from email/phone:", userId);

    // Fallback 1: Try to extract user_id from metadata if email matching failed
    if (!userId) {
      const metadataUserId = flat["user_id"] ?? flat["userId"] ?? flat["customerReference"] ?? flat["reference"];
      if (metadataUserId) {
        console.log("[Payment Debug] Trying fallback user_id from metadata:", metadataUserId);
        try {
          // Validate it's a valid UUID
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (uuidRegex.test(metadataUserId)) {
            const { data: userExists } = await supabaseAdmin
              .from("profiles")
              .select("id")
              .eq("id", metadataUserId)
              .maybeSingle();
            
            if (userExists) {
              console.log("[Payment Debug] Found user from metadata fallback:", metadataUserId);
              return await grantProAccess(metadataUserId, transactionId, amount, currency, plan, signupEmail, checkoutEmail, phone, rawPayload);
            }
          }
        } catch (metadataError) {
          console.error("[Payment Debug] Error using metadata fallback:", metadataError);
        }
      }
    }

    // Fallback 2: Try to get user_id from Kashier API if we still don't have a user match
    if (!userId) {
      console.log("[Payment Debug] No user found through email/metadata, checking Kashier API for order details");
      try {
        const { mid, secretKey } = kashierEnv();
        const response = await fetch(`https://api.kashier.io/v3/payments/orders/${transactionId}`, {
          method: "GET",
          headers: {
            "Authorization": secretKey,
            "api-key": process.env["KASHIER_API_KEY"] || "",
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log("[Payment Debug] Kashier API order details:", JSON.stringify(data).slice(0, 500));
          
          // Try to extract user_id from the order's metadata
          const apiUserId = data?.data?.metaData?.user_id || data?.metaData?.user_id;
          if (apiUserId) {
            console.log("[Payment Debug] Found user_id from Kashier API metadata:", apiUserId);
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(apiUserId)) {
              const { data: userExists } = await supabaseAdmin
                .from("profiles")
                .select("id")
                .eq("id", apiUserId)
                .maybeSingle();
              
              if (userExists) {
                console.log("[Payment Debug] Found user from Kashier API metadata:", apiUserId);
                return await grantProAccess(apiUserId, transactionId, amount, currency, plan, signupEmail, checkoutEmail, phone, rawPayload);
              }
            }
          }
          
          // Fallback 3: Try to match by customer email from Kashier API
          const apiCustomerEmail = data?.data?.customer?.email;
          if (apiCustomerEmail) {
            console.log("[Payment Debug] Found customer email from Kashier API:", apiCustomerEmail);
            const { data: emailMatchUserId } = await supabaseAdmin.rpc("find_user_for_payment", {
              _signup_email: "",
              _checkout_email: apiCustomerEmail,
              _phone: "",
            });
            
            if (emailMatchUserId) {
              console.log("[Payment Debug] Found user from Kashier API customer email:", emailMatchUserId);
              return await grantProAccess(emailMatchUserId as string, transactionId, amount, currency, plan, apiCustomerEmail, checkoutEmail, phone, rawPayload);
            }
          }
        }
      } catch (apiError) {
        console.error("[Payment Debug] Error calling Kashier API for user matching:", apiError);
      }
    }

    // If we found user through email/phone matching, grant Pro access
    if (userId) {
      return await grantProAccess(userId as string, transactionId, amount, currency, plan, signupEmail, checkoutEmail, phone, rawPayload);
    }

    // No user found through any method
    console.log("[Payment Debug] No user found through any method - logging unmatched payment");
    try {
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
    } catch (error) {
      console.error("Failed to log unmatched payment:", error);
    }
    return { ok: false, outcome: "unmatched" };
  } catch (error) {
    console.error("Error processing hosted payment:", error);
    // Log the error for debugging
    try {
      await supabaseAdmin.from("payments").upsert(
        {
          transaction_id: transactionId,
          amount,
          currency,
          plan,
          status: "error",
          signup_email: signupEmail,
          checkout_email: checkoutEmail,
          checkout_phone: phone,
          raw: { ...rawPayload, error: error instanceof Error ? error.message : String(error) } as never,
        },
        { onConflict: "transaction_id" },
      );
    } catch (logError) {
      console.error("Failed to log payment error:", logError);
    }
    return { ok: false, outcome: "invalid" };
  }
}

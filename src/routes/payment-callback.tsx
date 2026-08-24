import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { verifyKashierPayment } from "@/lib/kashier.functions";
import { useAuth } from "@/auth/AuthProvider";
import { useLang } from "@/i18n/LangProvider";

export const Route = createFileRoute("/payment-callback")({
  component: PaymentCallback,
  head: () => ({
    meta: [
      { title: "تأكيد الدفع | Waqti" },
      { name: "description", content: "بنأكد عملية الدفع بتاعتك ونفعّل اشتراك Waqti Pro." },
      { property: "og:title", content: "تأكيد الدفع | Waqti" },
      { property: "og:description", content: "بنأكد عملية الدفع بتاعتك ونفعّل اشتراك Waqti Pro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function PaymentCallback() {
  const { lang } = useLang();
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<"confirming" | "active" | "failed">("confirming");

  useEffect(() => {
    const params: Record<string, string> = {};
    new URLSearchParams(window.location.search).forEach((v, k) => {
      params[k] = v;
    });

    let cancelled = false;
    (async () => {
      try {
        const res = await verifyKashierPayment({ data: { params } });
        if (cancelled) return;
        if (res.status === "active") {
          await refresh();
          setState("active");
        } else {
          setState("failed");
        }
      } catch {
        if (!cancelled) setState("failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="surface-card flex max-w-sm flex-col items-center gap-4 px-6 py-10 text-center">
        {state === "confirming" && (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-teal" />
            <p className="text-sm font-medium text-near-black">
              {lang === "ar" ? "بنأكد الدفع… استنى ثانية" : "Confirming your payment…"}
            </p>
          </>
        )}
        {state === "active" && (
          <>
            <CheckCircle2 className="h-10 w-10 text-teal" />
            <p className="text-base font-semibold text-near-black">
              {lang === "ar" ? "تم تفعيل Waqti Pro 🎉" : "Waqti Pro is active 🎉"}
            </p>
            <button
              onClick={() => navigate({ to: "/app" })}
              className="inline-flex h-11 items-center rounded-lg bg-teal px-6 text-cta text-white"
            >
              {lang === "ar" ? "يلا نبدأ" : "Go to app"}
            </button>
          </>
        )}
        {state === "failed" && (
          <>
            <XCircle className="h-10 w-10 text-red-500" />
            <p className="text-sm font-medium text-near-black">
              {lang === "ar"
                ? "معرفناش نأكد الدفع. لو الفلوس اتخصمت هيتفعل تلقائي خلال دقايق."
                : "We couldn't confirm the payment. If you were charged it will activate automatically shortly."}
            </p>
            <button
              onClick={() => navigate({ to: "/app/upgrade" })}
              className="inline-flex h-11 items-center rounded-lg border border-light-grey bg-white px-6 text-cta text-near-black"
            >
              {lang === "ar" ? "رجوع للاشتراك" : "Back to plans"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, Clock } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { useLang } from "@/i18n/LangProvider";

export const Route = createFileRoute("/payment-success")({
  component: PaymentSuccess,
  head: () => ({
    meta: [
      { title: "تم الدفع | Waqti" },
      { name: "description", content: "تأكيد تفعيل اشتراك Waqti Pro بعد إتمام الدفع." },
      { property: "og:title", content: "تم الدفع | Waqti" },
      { property: "og:description", content: "تأكيد تفعيل اشتراك Waqti Pro بعد إتمام الدفع." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function PaymentSuccess() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const { refresh, isPro, profile } = useAuth();
  const navigate = useNavigate();
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (isPro) return;
    if (tries > 10) return;
    const id = setTimeout(() => {
      void refresh().finally(() => setTries((n) => n + 1));
    }, tries === 0 ? 300 : 2500);
    return () => clearTimeout(id);
  }, [isPro, tries, refresh]);

  const waiting = !isPro && tries <= 10;

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="surface-card flex max-w-sm flex-col items-center gap-4 px-6 py-10 text-center">
        {waiting && (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-teal" />
            <p className="text-sm font-medium text-near-black">
              {ar ? "بنأكد الدفع وبنفعّل اشتراكك…" : "Confirming your payment and activating Pro…"}
            </p>
          </>
        )}

        {isPro && (
          <>
            <CheckCircle2 className="h-10 w-10 text-teal" />
            <p className="text-base font-semibold text-near-black">
              {ar ? "أنت دلوقتي Waqti Pro 🎉" : "You're Pro now 🎉"}
            </p>
            {profile?.pro_expires_at && (
              <p className="text-xs text-mid-grey">
                {ar ? "اشتراكك ساري لحد " : "Active until "}
                {new Date(profile.pro_expires_at).toLocaleDateString(ar ? "ar-EG" : "en-GB")}
              </p>
            )}
            <button
              onClick={() => navigate({ to: "/app" })}
              className="inline-flex h-11 items-center rounded-lg bg-teal px-6 text-cta text-white"
            >
              {ar ? "يلا نبدأ" : "Go to app"}
            </button>
          </>
        )}

        {!isPro && !waiting && (
          <>
            <Clock className="h-10 w-10 text-gold" />
            <p className="text-sm font-medium text-near-black">
              {ar
                ? "استلمنا دفعتك بس التفعيل لسه بيتم. لو مفعّلش خلال دقايق كلمنا على واتساب."
                : "We received your payment but activation is still processing. If it doesn't unlock in a few minutes, message us on WhatsApp."}
            </p>
            <a
              href="https://wa.me/201020943875"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center rounded-lg border border-light-grey bg-white px-6 text-cta text-near-black"
            >
              {ar ? "تواصل معنا واتساب" : "Contact us on WhatsApp"}
            </a>
          </>
        )}
      </div>
    </div>
  );
}

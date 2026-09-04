import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { useLang } from "@/i18n/LangProvider";
import { tr, t } from "@/i18n/strings";

type PlanKey = "monthly" | "nine_month";

const HOSTED_LINKS: Record<PlanKey, string> = {
  monthly: "https://checkouts.kashier.io/en/paymentpage?ppLink=PP-4538788301,live",
  nine_month: "https://checkouts.kashier.io/en/paymentpage?ppLink=PP-4538788302,live",
};

export const Route = createFileRoute("/app/upgrade")({ component: UpgradePage });

function UpgradePage() {
  const { profile, isPro } = useAuth();
  const { lang } = useLang();
  const [busy, setBusy] = useState<PlanKey | null>(null);

  const onUpgrade = async (plan: PlanKey) => {
    if (busy) return;
    setBusy(plan);
    const amount = plan === "monthly" ? 45 : 360;
    const confirmed = window.confirm(
      lang === "ar"
        ? `هتدفع ${amount} ج.م دلوقتي. نكمل للدفع؟\n\nمهم: في صفحة الدفع، اكتب نفس الإيميل اللي سجلت بيه في Waqti عشان نفعّل اشتراكك أوتوماتيك.`
        : `You'll be charged ${amount} EGP now. Continue to payment?\n\nImportant: on the payment page, enter the same email you signed up to Waqti with so we can activate your subscription automatically.`
    );
    if (!confirmed) {
      setBusy(null);
      return;
    }
    window.location.href = HOSTED_LINKS[plan];
  };



  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <h1 className="text-2xl font-bold text-near-black md:text-3xl">{tr(t.pricing.h2, lang)}</h1>
      <p className="mt-2 text-sm text-mid-grey">
        {lang === "ar" ? "أنت على الباقة المجانية." : "You're on the Free plan."}
      </p>

      <div className="mt-6 rounded-lg border-s-4 border-gold bg-gold-light p-4 text-sm text-near-black">
        {tr(t.pricing.launch, lang)}
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <div className="surface-card flex flex-col p-6">
          <h3 className="text-2xl font-semibold text-near-black">{tr(t.pricing.free.title, lang)}</h3>
          <div className="mt-1 text-sm text-mid-grey">{tr(t.pricing.free.price, lang)}</div>
          <ul className="mt-6 flex-1 space-y-3">
            {t.pricing.free.features.map((f, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <Check className={`h-4 w-4 ${f.on ? "text-teal" : "text-light-grey"}`} />
                <span className={f.on ? "text-near-black" : "text-mid-grey line-through"}>{tr(f, lang)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 inline-flex h-[52px] items-center justify-center rounded-lg border border-light-grey text-cta text-mid-grey">
            {profile && !isPro ? (lang === "ar" ? "باقتك الحالية" : "Your current plan") : "—"}
          </div>
        </div>
        <div className="relative flex flex-col rounded-lg bg-teal p-6 text-white">
          <div className="absolute -top-3 start-6 rounded-full bg-gold px-3 py-1 text-[11px] font-bold tracking-wider text-teal-dark">
            {tr(t.pricing.pro.badge, lang)}
          </div>
          <h3 className="text-2xl font-semibold">{tr(t.pricing.pro.title, lang)}</h3>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-sm text-white/60 line-through">{tr(t.pricing.pro.original, lang)}</span>
            <span className="text-lg font-semibold text-gold">{tr(t.pricing.pro.price, lang)}</span>
          </div>
          <div className="mt-1 text-xs text-gold-light">{tr(t.pricing.pro.sub, lang)}</div>
          <ul className="mt-6 flex-1 space-y-3">
            {t.pricing.pro.features.map((f, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <Check className="h-4 w-4 text-gold" />
                <span>{tr(f, lang)}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => onUpgrade("monthly")}
            disabled={busy !== null}
            className="mt-8 inline-flex h-[52px] items-center justify-center gap-2 rounded-lg bg-white text-cta text-teal hover:bg-off-white disabled:opacity-60"
          >
            {busy === "monthly" && <Loader2 className="h-4 w-4 animate-spin" />}
            {tr(t.pricing.pro.cta, lang)}
          </button>

        </div>
        <div className="surface-card relative flex flex-col border-2 border-gold p-6">
          <div className="absolute -top-3 start-6 rounded-full bg-gold px-3 py-1 text-[11px] font-bold tracking-wider text-teal-dark">
            {tr(t.pricing.nine.badge, lang)}
          </div>
          <h3 className="text-2xl font-semibold text-near-black">{tr(t.pricing.nine.title, lang)}</h3>
          <div className="mt-1 text-lg font-semibold text-teal">{tr(t.pricing.nine.price, lang)}</div>
          <div className="mt-1 text-xs text-mid-grey">{tr(t.pricing.nine.sub, lang)}</div>
          <ul className="mt-6 flex-1 space-y-3">
            {t.pricing.nine.features.map((f, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <Check className="h-4 w-4 text-teal" />
                <span className="text-near-black">{tr(f, lang)}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => onUpgrade("nine_month")}
            disabled={busy !== null}
            className="mt-8 inline-flex h-[52px] items-center justify-center gap-2 rounded-lg bg-teal text-cta text-white hover:opacity-90 disabled:opacity-60"
          >
            {busy === "nine_month" && <Loader2 className="h-4 w-4 animate-spin" />}
            {tr(t.pricing.nine.cta, lang)}
          </button>

        </div>
      </div>

      <div className="mt-6 text-sm text-dark-grey">
        <Link to="/refund" className="text-teal underline">
          {tr(t.refund.nav, lang)}
        </Link>
        <span className="mx-2 text-light-grey">·</span>
        <a
          href="https://wa.me/201020943875"
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal underline"
        >
          {tr(t.contact.whatsapp, lang)}
        </a>
      </div>
    </div>
  );
}


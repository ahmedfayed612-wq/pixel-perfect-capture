import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { useLang } from "@/i18n/LangProvider";
import { tr, t } from "@/i18n/strings";
import { toast } from "sonner";

export const Route = createFileRoute("/app/upgrade")({ component: UpgradePage });

function UpgradePage() {
  const { profile } = useAuth();
  const { lang } = useLang();

  const onUpgrade = () => {
    toast.info(
      lang === "ar"
        ? "الدفع هييجي قريب — هنفعل فوري وفودافون كاش والكروت."
        : "Payments coming soon — Fawry, Vodafone Cash & cards will be enabled."
    );
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

      <div className="mt-8 grid gap-6 md:grid-cols-2">
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
            {profile && !profile.is_pro ? (lang === "ar" ? "باقتك الحالية" : "Your current plan") : "—"}
          </div>
        </div>
        <div className="relative flex flex-col rounded-lg bg-teal p-6 text-white">
          <div className="absolute -top-3 start-6 rounded-full bg-gold px-3 py-1 text-[11px] font-bold tracking-wider text-teal-dark">
            {tr(t.pricing.pro.badge, lang)}
          </div>
          <h3 className="text-2xl font-semibold">{tr(t.pricing.pro.title, lang)}</h3>
          <div className="mt-1 text-sm text-white/80">{tr(t.pricing.pro.price, lang)}</div>
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
            onClick={onUpgrade}
            className="mt-8 inline-flex h-[52px] items-center justify-center rounded-lg bg-white text-cta text-teal hover:bg-off-white"
          >
            {tr(t.pricing.pro.cta, lang)}
          </button>
        </div>
      </div>
    </div>
  );
}

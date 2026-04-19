import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LangProvider";
import { tr, t } from "@/i18n/strings";
import { toast } from "sonner";

export const Route = createFileRoute("/app/invite")({ component: InvitePage });

function InvitePage() {
  const { profile } = useAuth();
  const { lang } = useLang();
  const [count, setCount] = useState({ signed: 0, paid: 0 });

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await supabase
        .from("referrals")
        .select("status")
        .eq("referrer_user_id", profile.id);
      const signed = (data ?? []).length;
      const paid = (data ?? []).filter((r: any) => r.status === "converted").length;
      setCount({ signed, paid });
    })();
  }, [profile]);

  const link =
    typeof window !== "undefined" && profile?.referral_code
      ? `${window.location.origin}/signup?ref=${profile.referral_code}`
      : "";
  const copy = async () => {
    await navigator.clipboard.writeText(link);
    toast.success("✓");
  };
  const wa = `https://wa.me/?text=${encodeURIComponent(
    (lang === "ar" ? "جرب وقتي معايا! " : "Try Waqti with me! ") + link
  )}`;
  const credits = profile?.referral_credits_egp ?? 0;
  const earned = count.paid * 10;
  const needMore = Math.max(0, 3 - count.paid);

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <h1 className="text-2xl font-bold text-near-black md:text-3xl">{tr(t.nav.invite, lang)}</h1>

      {/* Reward cards */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <RewardCard
          title={lang === "ar" ? "أنت بتاخد" : "You get"}
          body={lang === "ar" ? "10 جنيه خصم على الشهر اللي بعده" : "10 EGP off your next month"}
          accent="teal"
        />
        <RewardCard
          title={lang === "ar" ? "صاحبك بياخد" : "Your friend gets"}
          body={lang === "ar" ? "أول شهر بـ 10 جنيه بدل 15" : "First month at 10 EGP instead of 15 EGP"}
          accent="gold"
        />
        <RewardCard
          title={lang === "ar" ? "3 أصحاب =" : "3 friends ="}
          body={lang === "ar" ? "شهر مجاني بالكامل 🎉" : "A completely free month 🎉"}
          accent="teal"
        />
      </div>

      {/* Link */}
      <div className="mt-8">
        <div className="text-label">{lang === "ar" ? "رابطك الشخصي" : "YOUR REFERRAL LINK"}</div>
        <div className="mt-3 flex items-stretch gap-3">
          <div className="flex h-12 flex-1 items-center overflow-hidden rounded-lg border border-light-grey bg-white px-4 font-mono text-sm text-near-black">
            <span className="truncate">{link || "…"}</span>
          </div>
          <button
            onClick={copy}
            className="inline-flex h-12 items-center gap-2 rounded-lg bg-teal px-4 text-cta text-white"
          >
            <Copy className="h-4 w-4" /> {lang === "ar" ? "انسخ" : "Copy"}
          </button>
        </div>
      </div>

      {/* Share */}
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-lg text-cta text-white"
          style={{ backgroundColor: "#25D366" }}
        >
          {lang === "ar" ? "شارك على واتساب" : "Share on WhatsApp"}
        </a>
        <button
          onClick={copy}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border-2 border-teal text-cta text-teal hover:bg-teal/5"
        >
          {lang === "ar" ? "انسخ الرابط" : "Copy Link"}
        </button>
      </div>

      {/* Progress */}
      <div className="mt-10">
        <h3 className="text-base font-semibold text-near-black">
          {lang === "ar" ? "إنجازاتك" : "Your Progress"}
        </h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Chip label={`${count.signed} ${lang === "ar" ? "اشتركوا" : "signed up"}`} color="grey" />
          <Chip label={`${count.paid} ${lang === "ar" ? "دفعوا برو" : "paid for Pro"}`} color="teal" />
          <Chip label={`${credits + earned} ${lang === "ar" ? "جنيه اتكسبت" : "EGP earned"}`} color="gold" />
        </div>
        <div className="mt-4">
          <div className="text-xs text-mid-grey">
            {needMore > 0
              ? lang === "ar"
                ? `${needMore} كمان للشهر المجاني`
                : `${needMore} more referrals for a free month`
              : lang === "ar"
                ? "وصلت للشهر المجاني!"
                : "You earned a free month!"}
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-light-grey">
            <div className="h-2 rounded-full bg-teal" style={{ width: `${Math.min(100, (count.paid / 3) * 100)}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function RewardCard({ title, body, accent }: { title: string; body: string; accent: "teal" | "gold" }) {
  return (
    <div className="surface-card overflow-hidden p-5">
      <div className="-mx-5 -mt-5 mb-4 h-[3px] bg-gold" />
      <div className="text-label">{title}</div>
      <div className={`mt-2 text-base font-bold ${accent === "gold" ? "text-gold" : "text-teal"}`}>{body}</div>
    </div>
  );
}

function Chip({ label, color }: { label: string; color: "grey" | "teal" | "gold" }) {
  const cls = color === "teal" ? "text-teal" : color === "gold" ? "text-gold" : "text-mid-grey";
  return (
    <div className="surface-card flex items-center justify-center px-4 py-3">
      <span className={`text-sm font-semibold ${cls}`}>{label}</span>
    </div>
  );
}

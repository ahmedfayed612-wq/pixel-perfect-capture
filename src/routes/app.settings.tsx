import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LangProvider";
import { tr, t } from "@/i18n/strings";
import { toast } from "sonner";

export const Route = createFileRoute("/app/settings")({ component: SettingsPage });

function SettingsPage() {
  const { profile, refresh, signOut, isPro } = useAuth();
  const { lang, setLang } = useLang();
  const navigate = useNavigate();
  const [name, setName] = useState(profile?.name ?? "");
  const [goal, setGoal] = useState(profile?.daily_goal_hours ?? 4);
  const [studentType, setStudentType] = useState(profile?.student_type ?? "highschool");
  const [dream, setDream] = useState(profile?.dream_college ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!profile) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        name: name.trim(),
        daily_goal_hours: goal,
        dream_college: dream.trim() || null,
        student_type: studentType,
        language: lang,
      })
      .eq("id", profile.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("✓");
      refresh();
    }
  };

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <h1 className="text-2xl font-bold text-near-black md:text-3xl">{tr(t.nav.settings, lang)}</h1>

      <Section title={lang === "ar" ? "الحساب" : "Profile"}>
        <Field label={tr(t.auth.name, lang)}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="block h-12 w-full rounded-lg border border-light-grey bg-white px-4 text-sm focus:border-teal focus:ring-2 focus:ring-teal/20"
          />
        </Field>
        <Field label={tr(t.auth.email, lang)}>
          <div className="flex h-12 items-center rounded-lg border border-light-grey bg-off-white px-4 text-sm text-mid-grey">
            {profile?.email}
          </div>
        </Field>
        <Field label={tr(t.onboarding.dreamLabel, lang)}>
          <input
            value={dream}
            onChange={(e) => setDream(e.target.value)}
            placeholder={tr(t.onboarding.dreamPlaceholder, lang)}
            className="block h-12 w-full rounded-lg border border-light-grey bg-white px-4 text-sm focus:border-teal focus:ring-2 focus:ring-teal/20"
          />
        </Field>
        <Field label={tr(t.auth.studentType, lang)}>
          <div className="grid grid-cols-2 gap-3">
            {(["highschool", "university"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStudentType(s)}
                className={`h-11 rounded-lg border text-sm font-medium ${
                  studentType === s ? "border-teal bg-teal text-white" : "border-light-grey bg-white text-near-black"
                }`}
              >
                {tr(s === "highschool" ? t.auth.highschool : t.auth.university, lang)}
              </button>
            ))}
          </div>
        </Field>
      </Section>

      <Section title={lang === "ar" ? "التفضيلات" : "Preferences"}>
        <Field label={lang === "ar" ? "اللغة" : "Language"}>
          <div className="grid grid-cols-2 gap-3">
            {(["ar", "en"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`h-11 rounded-lg border text-sm font-medium ${
                  lang === l ? "border-teal bg-teal text-white" : "border-light-grey bg-white text-near-black"
                }`}
              >
                {l === "ar" ? "عربي" : "English"}
              </button>
            ))}
          </div>
        </Field>
        <Field label={lang === "ar" ? "الهدف اليومي (ساعات)" : "Daily goal (hours)"}>
          <input
            type="number"
            min={1}
            max={12}
            value={goal}
            onChange={(e) => setGoal(Number(e.target.value))}
            className="block h-12 w-32 rounded-lg border border-light-grey bg-white px-4 text-sm"
          />
        </Field>
      </Section>

      <Section title={lang === "ar" ? "الاشتراك" : "Subscription"}>
        <div className="flex items-center justify-between rounded-lg border border-light-grey bg-white p-4">
          <div>
            <div className="text-sm font-semibold text-near-black">
              {isPro ? "Pro" : tr(t.pricing.free.title, lang)}
            </div>
            <div className="text-xs text-mid-grey">
              {isPro && profile?.subscription_end
                ? `${lang === "ar" ? "بيتجدد" : "Renews"}: ${profile.subscription_end}`
                : tr(t.subjects.upgradePrompt, lang)}
            </div>
          </div>
          {!isPro && (
            <button
              onClick={() => navigate({ to: "/app/upgrade" })}
              className="inline-flex h-10 items-center rounded-lg bg-teal px-4 text-cta text-white"
            >
              {tr(t.subjects.upgradeNow, lang)}
            </button>
          )}
        </div>
        {(profile?.referral_credits_egp ?? 0) > 0 && (
          <div className="mt-3 text-sm text-gold">
            {profile?.referral_credits_egp} {lang === "ar" ? "جنيه رصيد" : "EGP credit"}
          </div>
        )}
      </Section>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          onClick={save}
          disabled={busy}
          className="inline-flex h-12 items-center rounded-lg bg-teal px-6 text-cta text-white disabled:opacity-60"
        >
          {tr(t.subjects.save, lang)}
        </button>
        <button
          onClick={() => signOut().then(() => navigate({ to: "/" }))}
          className="inline-flex h-12 items-center rounded-lg border border-light-grey bg-white px-6 text-cta text-near-black hover:bg-off-white"
        >
          {tr(t.nav.logout, lang)}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-4 text-base font-semibold text-near-black">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-near-black">{label}</span>
      {children}
    </label>
  );
}

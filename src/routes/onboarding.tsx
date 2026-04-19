import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LangProvider";
import { tr, t } from "@/i18n/strings";
import { SUBJECT_COLORS } from "@/lib/waqti";
import { Logo } from "@/components/brand/Logo";
import { LangToggle } from "@/components/brand/LangToggle";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({ component: Onboarding });

function Onboarding() {
  const { lang } = useLang();
  const { user, profile, refresh, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (profile?.onboarding_complete) navigate({ to: "/app" });
  }, [profile, navigate]);

  const [subjectName, setSubjectName] = useState("");
  const [color, setColor] = useState(SUBJECT_COLORS[4]);
  const [goal, setGoal] = useState(profile?.daily_goal_hours ?? 4);
  const [busy, setBusy] = useState(false);

  const finish = async (skipSubject = false) => {
    if (!user) return;
    setBusy(true);
    try {
      if (!skipSubject && subjectName.trim()) {
        await supabase.from("subjects").insert({
          user_id: user.id,
          name: subjectName.trim(),
          color,
          weekly_goal_hours: 0,
        });
      }
      await supabase
        .from("profiles")
        .update({ daily_goal_hours: goal, onboarding_complete: true })
        .eq("id", user.id);
      await refresh();
      navigate({ to: "/app/timer" });
    } catch (e: any) {
      toast.error(tr(t.auth.genericError, lang));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-off-white">
      <header className="flex items-center justify-between px-5 py-5 md:px-8">
        <Logo size="sm" />
        <LangToggle />
      </header>
      <main className="mx-auto max-w-xl px-5 py-8 md:px-8">
        <div className="mb-8 flex items-center justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all ${i === step ? "w-8 bg-teal" : "w-2 bg-light-grey"}`}
            />
          ))}
        </div>

        {step === 0 && (
          <section className="surface-card p-8">
            <h1 className="text-2xl font-bold text-near-black">{tr(t.onboarding.step1Title, lang)}</h1>
            <p className="mt-2 text-sm text-mid-grey">{tr(t.onboarding.step1Sub, lang)}</p>
            <div className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-near-black">
                  {tr(t.onboarding.subjectName, lang)}
                </label>
                <input
                  className="block h-12 w-full rounded-lg border border-light-grey bg-white px-4 text-sm focus:border-teal focus:ring-2 focus:ring-teal/20"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder={lang === "ar" ? "مثال: الرياضيات" : "e.g. Mathematics"}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-near-black">
                  {tr(t.onboarding.chooseColor, lang)}
                </label>
                <div className="flex flex-wrap gap-3">
                  {SUBJECT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`h-10 w-10 rounded-full border-2 transition-transform ${color === c ? "scale-110 border-near-black" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-8 flex items-center gap-3">
              <button
                onClick={() => setStep(1)}
                disabled={!subjectName.trim()}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-lg bg-teal text-cta text-white disabled:opacity-50"
              >
                {tr(t.onboarding.next, lang)}
              </button>
              <button
                onClick={() => setStep(1)}
                className="text-sm font-medium text-mid-grey hover:text-near-black"
              >
                {tr(t.onboarding.skip, lang)}
              </button>
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="surface-card p-8">
            <h1 className="text-2xl font-bold text-near-black">{tr(t.onboarding.step2Title, lang)}</h1>
            <p className="mt-2 text-sm text-mid-grey">{tr(t.onboarding.step2Sub, lang)}</p>
            <div className="mt-8 text-center">
              <div className="text-display text-teal" style={{ fontSize: "72px", lineHeight: "1" }}>
                {goal}
              </div>
              <div className="mt-1 text-sm text-mid-grey">
                {lang === "ar" ? "ساعات في اليوم" : "hours per day"}
              </div>
              <input
                type="range"
                min={1}
                max={12}
                value={goal}
                onChange={(e) => setGoal(Number(e.target.value))}
                className="mt-6 w-full accent-teal"
              />
            </div>
            <div className="mt-8 flex items-center gap-3">
              <button
                onClick={() => setStep(2)}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-lg bg-teal text-cta text-white"
              >
                {tr(t.onboarding.next, lang)}
              </button>
              <button
                onClick={() => setStep(2)}
                className="text-sm font-medium text-mid-grey hover:text-near-black"
              >
                {tr(t.onboarding.skip, lang)}
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="surface-card p-8 text-center">
            <h1 className="text-2xl font-bold text-near-black">{tr(t.onboarding.step3Title, lang)}</h1>
            <p className="mt-2 text-sm text-mid-grey">{tr(t.onboarding.step3Sub, lang)}</p>
            <div className="my-10 text-display text-near-black" style={{ fontSize: "64px" }}>
              00:00:00
            </div>
            <button
              onClick={() => finish(false)}
              disabled={busy}
              className="inline-flex h-14 w-full items-center justify-center rounded-lg bg-teal text-base font-bold text-white disabled:opacity-60"
            >
              {tr(t.onboarding.startTimer, lang)}
            </button>
            <button
              onClick={() => finish(true)}
              disabled={busy}
              className="mt-3 text-sm font-medium text-mid-grey hover:text-near-black"
            >
              {tr(t.onboarding.skip, lang)}
            </button>
          </section>
        )}
      </main>
    </div>
  );
}

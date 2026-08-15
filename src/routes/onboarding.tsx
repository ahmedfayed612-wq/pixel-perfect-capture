import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LangProvider";
import { tr, t } from "@/i18n/strings";
import { SUBJECT_COLORS, SUBJECT_SUGGESTIONS } from "@/lib/waqti";
import { Logo } from "@/components/brand/Logo";
import { LangToggle } from "@/components/brand/LangToggle";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({ component: Onboarding });

type Draft = { name: string; color: string; weekly_goal_hours: number };

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

  const [dream, setDream] = useState("");
  const [subjects, setSubjects] = useState<Draft[]>([]);
  const [draftName, setDraftName] = useState("");
  const [draftColor, setDraftColor] = useState(SUBJECT_COLORS[4]);
  const [draftGoal, setDraftGoal] = useState(5);
  const [weekly, setWeekly] = useState(20);
  const [busy, setBusy] = useState(false);

  const level = profile?.student_type === "university" ? "university" : "highschool";
  const suggestions = SUBJECT_SUGGESTIONS[level].filter((s) => !subjects.some((x) => x.name === s));
  const capped = subjects.length >= 3 && !profile?.is_pro;

  const addSubject = (name: string) => {
    const clean = name.trim();
    if (!clean) return;
    if (capped) {
      toast.error(tr(t.onboarding.freeCap, lang));
      return;
    }
    setSubjects((s) => [...s, { name: clean, color: draftColor, weekly_goal_hours: draftGoal }]);
    setDraftName("");
    setDraftColor(SUBJECT_COLORS[(subjects.length + 5) % SUBJECT_COLORS.length]);
  };

  const finish = async () => {
    if (!user) return;
    setBusy(true);
    try {
      if (subjects.length) {
        await supabase.from("subjects").insert(
          subjects.map((s, i) => ({
            user_id: user.id,
            name: s.name,
            color: s.color,
            weekly_goal_hours: s.weekly_goal_hours,
            position: i,
          })),
        );
      }
      await supabase
        .from("profiles")
        .update({
          dream_college: dream.trim(),
          weekly_goal_hours: weekly,
          daily_goal_hours: Math.max(1, Math.round(weekly / 7)),
          onboarding_complete: true,
        })
        .eq("id", user.id);
      await refresh();
      navigate({ to: "/app" });
    } catch {
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
            <h1 className="text-2xl font-bold text-near-black">{tr(t.onboarding.dreamTitle, lang)}</h1>
            <p className="mt-2 text-sm text-mid-grey">{tr(t.onboarding.dreamSub, lang)}</p>
            <label className="mt-6 block">
              <span className="mb-2 block text-sm font-medium text-near-black">
                {tr(t.onboarding.dreamLabel, lang)}
              </span>
              <input
                className="block h-12 w-full rounded-lg border border-light-grey bg-white px-4 text-sm focus:border-teal focus:ring-2 focus:ring-teal/20"
                value={dream}
                onChange={(e) => setDream(e.target.value)}
                placeholder={tr(t.onboarding.dreamPlaceholder, lang)}
              />
            </label>
            <button
              onClick={() => setStep(1)}
              disabled={!dream.trim()}
              className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-lg bg-teal text-cta text-white disabled:opacity-50"
            >
              {tr(t.onboarding.next, lang)}
            </button>
          </section>
        )}

        {step === 1 && (
          <section className="surface-card p-8">
            <h1 className="text-2xl font-bold text-near-black">{tr(t.onboarding.step1Title, lang)}</h1>
            <p className="mt-2 text-sm text-mid-grey">{tr(t.onboarding.step1Sub, lang)}</p>

            {suggestions.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addSubject(s)}
                    className="inline-flex h-9 items-center gap-1 rounded-full border border-light-grey bg-white px-3 text-xs font-medium text-near-black hover:border-teal hover:text-teal"
                  >
                    <Plus className="h-3 w-3" /> {s}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-6 space-y-4">
              <div className="flex gap-2">
                <input
                  className="block h-12 flex-1 rounded-lg border border-light-grey bg-white px-4 text-sm focus:border-teal focus:ring-2 focus:ring-teal/20"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder={tr(t.onboarding.subjectName, lang)}
                />
                <input
                  type="number"
                  min={1}
                  max={40}
                  value={draftGoal}
                  onChange={(e) => setDraftGoal(Number(e.target.value))}
                  className="h-12 w-20 rounded-lg border border-light-grey bg-white px-3 text-sm"
                  aria-label={tr(t.subjects.weekly, lang)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {SUBJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setDraftColor(c)}
                    className={`h-8 w-8 rounded-full border-2 transition-transform ${draftColor === c ? "scale-110 border-near-black" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  />
                ))}
              </div>
              <button
                onClick={() => addSubject(draftName)}
                disabled={!draftName.trim() || capped}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-teal px-4 text-sm font-semibold text-teal disabled:opacity-50"
              >
                <Plus className="h-4 w-4" /> {tr(t.onboarding.addSubject, lang)}
              </button>
            </div>

            {subjects.length > 0 && (
              <ul className="mt-6 space-y-2">
                {subjects.map((s, i) => (
                  <li
                    key={`${s.name}-${i}`}
                    className="flex items-center gap-3 rounded-lg border border-light-grey bg-white px-3 py-2"
                  >
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-sm font-medium text-near-black">{s.name}</span>
                    <span className="text-xs text-mid-grey">
                      {s.weekly_goal_hours} {tr(t.dashboard.weekGoal, lang)}
                    </span>
                    <button
                      onClick={() => setSubjects((v) => v.filter((_, idx) => idx !== i))}
                      className="ms-auto text-mid-grey hover:text-rose-600"
                      aria-label="remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {capped && <p className="mt-4 text-xs text-gold">{tr(t.onboarding.freeCap, lang)}</p>}

            <div className="mt-8 flex items-center gap-3">
              <button
                onClick={() => setStep(0)}
                className="inline-flex h-12 items-center rounded-lg border border-light-grey px-4 text-sm font-medium text-mid-grey"
              >
                {tr(t.onboarding.back, lang)}
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={subjects.length === 0}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-lg bg-teal text-cta text-white disabled:opacity-50"
              >
                {tr(t.onboarding.next, lang)}
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="surface-card p-8">
            <h1 className="text-2xl font-bold text-near-black">{tr(t.onboarding.step2Title, lang)}</h1>
            <p className="mt-2 text-sm text-mid-grey">{tr(t.onboarding.step2Sub, lang)}</p>
            <div className="mt-8 text-center">
              <div className="text-display text-teal" style={{ fontSize: "72px", lineHeight: "1" }}>
                {weekly}
              </div>
              <div className="mt-1 text-sm text-mid-grey">{tr(t.onboarding.weeklyUnit, lang)}</div>
              <div className="mt-6 flex items-center justify-center gap-4">
                <button
                  onClick={() => setWeekly((w) => Math.max(1, w - 1))}
                  className="h-11 w-11 rounded-lg border border-light-grey bg-white text-lg font-bold text-near-black"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={80}
                  value={weekly}
                  onChange={(e) => setWeekly(Math.min(80, Math.max(1, Number(e.target.value))))}
                  className="h-11 w-24 rounded-lg border border-light-grey bg-white text-center text-sm"
                />
                <button
                  onClick={() => setWeekly((w) => Math.min(80, w + 1))}
                  className="h-11 w-11 rounded-lg border border-light-grey bg-white text-lg font-bold text-near-black"
                >
                  +
                </button>
              </div>
            </div>
            <div className="mt-8 flex items-center gap-3">
              <button
                onClick={() => setStep(1)}
                className="inline-flex h-12 items-center rounded-lg border border-light-grey px-4 text-sm font-medium text-mid-grey"
              >
                {tr(t.onboarding.back, lang)}
              </button>
              <button
                onClick={finish}
                disabled={busy}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-lg bg-teal text-cta text-white disabled:opacity-60"
              >
                {tr(t.onboarding.finish, lang)}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

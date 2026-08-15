import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Play, Lock, Quote } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LangProvider";
import { tr, t } from "@/i18n/strings";
import { LangToggle } from "@/components/brand/LangToggle";
import { todayISO, todayDow, weekStartISO, quoteOfDay, fmtDuration } from "@/lib/waqti";

export const Route = createFileRoute("/app/")({ component: Dashboard });

type Subject = { id: string; name: string; name_ar: string | null; color: string; weekly_goal_hours: number };
type Streak = { current_streak: number; longest_streak: number; last_study_date: string | null };
type ScheduleBlock = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  kind: "lecture" | "study" | "homework";
  title: string | null;
  subject_id: string | null;
};

function Dashboard() {
  const { profile } = useAuth();
  const { lang } = useLang();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [weekBySubject, setWeekBySubject] = useState<Record<string, number>>({});
  const [lastSession, setLastSession] = useState<Record<string, string>>({});
  const [streak, setStreak] = useState<Streak | null>(null);
  const [todayBlocks, setTodayBlocks] = useState<ScheduleBlock[]>([]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const dow = todayDow();
      const [{ data: subs }, { data: sess }, { data: st }, { data: sched }, { data: weekRows }] = await Promise.all([
        supabase.from("subjects").select("id,name,name_ar,color,weekly_goal_hours").order("position"),
        supabase.from("sessions").select("duration_minutes").eq("date", todayISO()),
        supabase
          .from("streaks")
          .select("current_streak,longest_streak,last_study_date")
          .eq("user_id", profile.id)
          .maybeSingle(),
        supabase
          .from("schedule")
          .select("id,day_of_week,start_time,end_time,kind,title,subject_id")
          .eq("day_of_week", dow)
          .order("start_time"),
        supabase.from("sessions").select("subject_id,duration_minutes,date,created_at").gte("date", weekStartISO()),
      ]);
      setSubjects((subs as Subject[]) ?? []);
      setTodayMinutes((sess ?? []).reduce((a: number, s: any) => a + s.duration_minutes, 0));
      setStreak((st as Streak) ?? { current_streak: 0, longest_streak: 0, last_study_date: null });
      setTodayBlocks((sched as ScheduleBlock[]) ?? []);

      const byS: Record<string, number> = {};
      const last: Record<string, string> = {};
      (weekRows ?? []).forEach((r: any) => {
        if (!r.subject_id) return;
        byS[r.subject_id] = (byS[r.subject_id] ?? 0) + r.duration_minutes;
        if (!last[r.subject_id] || r.created_at > last[r.subject_id]) last[r.subject_id] = r.created_at;
      });
      setWeekBySubject(byS);
      setLastSession(last);
    })();
  }, [profile]);

  const hours = (todayMinutes / 60).toFixed(1);
  const goalMin = (profile?.daily_goal_hours ?? 4) * 60;
  const pct = Math.min(100, Math.round((todayMinutes / goalMin) * 100));
  const hour = new Date().getHours();
  const greet = hour < 17 ? t.dashboard.morning : t.dashboard.evening;
  const dream = profile?.dream_college?.trim();
  const cur = streak?.current_streak ?? 0;
  const streakMsg = dream
    ? cur > 0
      ? `${cur} ${lang === "ar" ? "أيام متتاليين قرّبوك من" : "days in a row bringing you closer to"} ${dream} 🎯`
      : tr(t.streaks.msg0, lang)
    : tr(cur === 0 ? t.streaks.msg0 : cur < 7 ? t.streaks.msg1to6 : t.streaks.msg7plus, lang);
  const quote = quoteOfDay();

  const ordered = [...subjects].sort((a, b) => (lastSession[b.id] ?? "").localeCompare(lastSession[a.id] ?? ""));
  const visibleSubjects = profile?.is_pro ? ordered : ordered.slice(0, 3);
  const name = (s: Subject) => (lang === "ar" && s.name_ar ? s.name_ar : s.name);

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-near-black md:text-3xl">
            {tr(greet, lang)} {lang === "ar" ? "" : ","} {profile?.name?.split(" ")[0]}!
          </h1>
          <p className="mt-1 text-sm text-mid-grey">
            {new Date().toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          {dream && (
            <p className="mt-1 text-sm font-medium text-teal">
              {tr(t.dashboard.becauseDream, lang)} {dream} 🎯
            </p>
          )}
        </div>
        <div className="md:hidden">
          <LangToggle />
        </div>
      </div>

      {/* Today's summary */}
      <div className="mt-6 flex items-center justify-between rounded-lg bg-teal p-6 text-white">
        <div>
          <div className="text-tagline text-white/70">{tr(t.dashboard.today, lang)}</div>
          {todayMinutes === 0 ? (
            <div className="mt-2 max-w-xs text-sm">{tr(t.dashboard.noSessions, lang)}</div>
          ) : (
            <>
              <div className="mt-2 text-5xl font-extrabold tabular-nums">{hours}</div>
              <div className="mt-1 text-sm text-white/70">{tr(t.dashboard.hours, lang)}</div>
            </>
          )}
        </div>
        <div className="relative h-20 w-20">
          <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              stroke={pct >= 100 ? "var(--color-gold)" : "#ffffff"}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${pct}, 100`}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{pct}%</span>
        </div>
      </div>

      {/* Quote of the day */}
      <div className="mt-4 flex items-start gap-3 rounded-lg border border-light-grey bg-white p-4">
        <Quote className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
        <p className="text-sm text-near-black">{lang === "ar" ? quote.ar : quote.en}</p>
      </div>

      {/* Subjects */}
      <div className="mt-8">
        <div className="text-label">{tr(t.dashboard.yourSubjects, lang)}</div>
        {visibleSubjects.length === 0 ? (
          <Link
            to="/app/subjects"
            className="surface-card mt-3 flex items-center justify-center gap-2 border-2 border-dashed border-teal/40 bg-transparent p-6 text-sm font-medium text-teal hover:bg-teal/5"
          >
            <Plus className="h-4 w-4" /> {tr(t.dashboard.addFirstSubject, lang)}
          </Link>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-3">
            {visibleSubjects.map((s) => (
              <div
                key={s.id}
                className="surface-card overflow-hidden p-4"
                style={{ borderInlineStartWidth: 4, borderInlineStartColor: s.color }}
              >
                <h3 className="text-sm font-semibold text-near-black">{name(s)}</h3>
                <p className="text-xs text-mid-grey">
                  {fmtDuration(weekBySubject[s.id] ?? 0, lang)} / {s.weekly_goal_hours}{" "}
                  {tr(t.dashboard.weekGoal, lang)}
                </p>
                <Link
                  to="/app/timer"
                  className="mt-3 flex h-11 items-center justify-center gap-2 rounded-lg text-cta text-white"
                  style={{ backgroundColor: s.color }}
                >
                  <Play className="h-4 w-4 fill-current" /> {tr(t.dashboard.start, lang)}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Streak widget + today's schedule */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="surface-card p-5">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔥</span>
            <div>
              <div className="text-3xl font-extrabold tabular-nums text-gold">{cur}</div>
              <div className="text-xs text-mid-grey">{tr(t.dashboard.daysStreak, lang)}</div>
            </div>
            <Link to="/app/streaks" className="ms-auto text-xs font-semibold text-teal hover:underline">
              {tr(t.nav.streaks, lang)} →
            </Link>
          </div>
          <p className="mt-3 text-sm text-near-black">{streakMsg}</p>
        </div>

        <div className="surface-card p-5">
          <div className="flex items-center justify-between">
            <div className="text-label">{tr(t.dashboard.todaySchedule, lang)}</div>
            {profile?.is_pro && (
              <Link to="/app/schedule" className="text-xs font-semibold text-teal hover:underline">
                {tr(t.nav.schedule, lang)} →
              </Link>
            )}
          </div>
          {!profile?.is_pro ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-mid-grey">
              <Lock className="h-4 w-4 text-teal" /> {tr(t.dashboard.noScheduleFree, lang)}
            </div>
          ) : todayBlocks.length === 0 ? (
            <Link to="/app/schedule" className="mt-3 block text-sm text-teal hover:underline">
              {tr(t.dashboard.noSchedule, lang)}
            </Link>
          ) : (
            <ul className="mt-3 space-y-2">
              {todayBlocks.map((b) => {
                const subj = subjects.find((s) => s.id === b.subject_id);
                const label =
                  b.title || (subj ? name(subj) : tr(t.schedule[b.kind], lang));
                const color =
                  subj?.color ?? (b.kind === "lecture" ? "#0D7377" : b.kind === "homework" ? "#e11d48" : "#F4A261");
                return (
                  <li
                    key={b.id}
                    className="flex items-center gap-3 rounded-md border border-light-grey px-3 py-2 text-sm"
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="font-medium text-near-black">{label}</span>
                    <span className="ms-auto text-xs tabular-nums text-mid-grey">
                      {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="mt-8 flex flex-wrap gap-3">
        {[
          { to: "/app/analytics", label: t.dashboard.quickAnalytics },
          { to: "/app/readiness", label: t.dashboard.quickReadiness },
          { to: "/app/streaks", label: t.dashboard.quickStreaks },
          { to: "/app/invite", label: t.dashboard.quickInvite },
        ].map((q) => (
          <Link
            key={q.to}
            to={q.to}
            className="inline-flex h-9 items-center rounded-lg border border-teal bg-white px-4 text-xs font-semibold text-teal hover:bg-teal/5"
          >
            {tr(q.label, lang)}
          </Link>
        ))}
      </div>
    </div>
  );
}

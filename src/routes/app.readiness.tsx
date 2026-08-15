import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LangProvider";
import { tr, t } from "@/i18n/strings";
import { ProLockOverlay } from "@/components/brand/ProLockOverlay";
import { readinessScore, readinessLabel, weekStartISO, toISO } from "@/lib/waqti";

export const Route = createFileRoute("/app/readiness")({ component: ReadinessPage });

type Subject = { id: string; name: string; name_ar: string | null; color: string; weekly_goal_hours: number };
type Row = {
  subject_id: string | null;
  duration_minutes: number;
  date: string;
  focus_score: number | null;
  comprehension_score: number | null;
  fatigue_score: number | null;
};

function avg(nums: number[]) {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

function ReadinessPage() {
  const { profile } = useAuth();
  const { lang } = useLang();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const last7 = new Date();
      last7.setDate(last7.getDate() - 6);
      const since = [weekStartISO(), toISO(last7)].sort()[0];
      const [{ data: subs }, { data: sess }] = await Promise.all([
        supabase.from("subjects").select("id,name,name_ar,color,weekly_goal_hours").order("position"),
        supabase
          .from("sessions")
          .select("subject_id,duration_minutes,date,focus_score,comprehension_score,fatigue_score")
          .gte("date", since),
      ]);
      setSubjects((subs as Subject[]) ?? []);
      setRows((sess as Row[]) ?? []);
    })();
  }, [profile]);

  const weekStart = weekStartISO();
  const last7Start = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return toISO(d);
  })();

  const cards = subjects.map((s) => {
    const mine = rows.filter((r) => r.subject_id === s.id);
    const week = mine.filter((r) => r.date >= weekStart);
    const recent = mine.filter((r) => r.date >= last7Start);
    const result = readinessScore({
      hoursThisWeek: week.reduce((a, r) => a + r.duration_minutes, 0) / 60,
      weeklyGoalHours: s.weekly_goal_hours || 1,
      avgComprehension: avg(mine.map((r) => r.comprehension_score).filter((v): v is number => v != null)),
      avgFocus: avg(mine.map((r) => r.focus_score).filter((v): v is number => v != null)),
      daysWithSessionLast7: new Set(recent.map((r) => r.date)).size,
      avgFatigue: avg(mine.map((r) => r.fatigue_score).filter((v): v is number => v != null)),
    });
    const label = readinessLabel(result.score);
    const subjName = lang === "ar" && s.name_ar ? s.name_ar : s.name;
    const insight = {
      hours:
        lang === "ar"
          ? `محتاج ${result.hoursGap} ساعات أكتر في ${subjName} الأسبوع ده عشان توصل للمنطقة الخضرا`
          : `You need ${result.hoursGap} more hours in ${subjName} this week to reach the green zone`,
      comprehension:
        lang === "ar"
          ? `ركز على الفهم في ${subjName} — جرب تشرح لنفسك بعد كل جلسة`
          : `Focus on understanding in ${subjName} — try explaining it to yourself after each session`,
      focus:
        lang === "ar"
          ? `تركيزك في ${subjName} قليل — جرب بومودورو وشيل الموبايل`
          : `Your focus in ${subjName} is low — try Pomodoro and put your phone away`,
      consistency:
        lang === "ar"
          ? `ذاكر ${subjName} 30 دقيقة أيام أكتر في الأسبوع — أحسن من 3 ساعات يوم واحد`
          : `Study ${subjName} 30 minutes on more days — better than 3 hours in one day`,
      fatigue:
        lang === "ar"
          ? `إنت بتتعب ذهنياً بسرعة في ${subjName} — جرب تقصر الجلسات وتزود الراحة`
          : `You tire quickly in ${subjName} — shorten sessions and take more breaks`,
    }[result.weakest];

    return { s, subjName, result, label, insight };
  });

  const Content = (
    <div className="space-y-4">
      {cards.length === 0 ? (
        <p className="surface-card p-6 text-sm text-mid-grey">{tr(t.readiness.empty, lang)}</p>
      ) : (
        cards.map(({ s, subjName, result, label, insight }) => (
          <div key={s.id} className="surface-card p-5" style={{ borderInlineStartWidth: 4, borderInlineStartColor: s.color }}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-near-black">{subjName}</h3>
              <span className="text-3xl font-extrabold tabular-nums" style={{ color: label.color }}>
                {result.score}
              </span>
            </div>
            <div className="mt-1 text-sm" style={{ color: label.color }}>
              {lang === "ar" ? label.ar : label.en}
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-light-grey">
              <div className="h-full rounded-full" style={{ width: `${result.score}%`, backgroundColor: label.color }} />
            </div>
            <p className="mt-3 text-sm text-mid-grey">{insight}</p>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <h1 className="text-2xl font-bold text-near-black md:text-3xl">{tr(t.readiness.title, lang)}</h1>
      <p className="mt-1 text-sm text-mid-grey">{tr(t.readiness.sub, lang)}</p>
      <div className="mt-6">
        {profile?.is_pro ? Content : <ProLockOverlay message={tr(t.readiness.prompt, lang)}>{Content}</ProLockOverlay>}
      </div>
    </div>
  );
}

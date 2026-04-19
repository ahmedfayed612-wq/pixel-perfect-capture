import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LangProvider";
import { tr, t } from "@/i18n/strings";
import { ProLockOverlay } from "@/components/brand/ProLockOverlay";

export const Route = createFileRoute("/app/streaks")({ component: StreaksPage });

type Streak = { current_streak: number; longest_streak: number; last_study_date: string | null };

function StreaksPage() {
  const { profile } = useAuth();
  const { lang } = useLang();
  const [streak, setStreak] = useState<Streak | null>(null);
  const [totalDays, setTotalDays] = useState(0);
  const [heatmap, setHeatmap] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const since = new Date();
      since.setDate(since.getDate() - 90);
      const sinceISO = since.toISOString().slice(0, 10);

      const [{ data: st }, { data: sess }] = await Promise.all([
        supabase
          .from("streaks")
          .select("current_streak,longest_streak,last_study_date")
          .eq("user_id", profile.id)
          .maybeSingle(),
        supabase
          .from("sessions")
          .select("date,duration_minutes")
          .gte("date", sinceISO),
      ]);
      setStreak((st as Streak) ?? { current_streak: 0, longest_streak: 0, last_study_date: null });
      const map: Record<string, number> = {};
      (sess ?? []).forEach((s: any) => {
        map[s.date] = (map[s.date] ?? 0) + s.duration_minutes;
      });
      setHeatmap(map);
      setTotalDays(Object.keys(map).length);
    })();
  }, [profile]);

  const cur = streak?.current_streak ?? 0;
  const msg = cur === 0 ? t.streaks.msg0 : cur < 7 ? t.streaks.msg1to6 : t.streaks.msg7plus;

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <h1 className="text-2xl font-bold text-near-black md:text-3xl">{tr(t.streaks.title, lang)}</h1>

      {/* Hero card — the ONE allowed gradient */}
      <div className="gradient-streak mt-6 rounded-lg p-8 text-center text-white">
        <div className="text-5xl">🔥</div>
        <div className="mt-4 text-7xl font-extrabold tabular-nums md:text-8xl">{cur}</div>
        <div className="mt-2 text-base text-white/80" style={{ fontFamily: "Cairo, Inter, sans-serif" }}>
          {tr(t.streaks.daysStreak, lang)}
        </div>
        <p className="mt-4 text-sm text-white/90">{tr(msg, lang)}</p>
        <p className="mt-6 text-sm text-gold-light">
          {tr(t.streaks.longest, lang)}: {streak?.longest_streak ?? 0} {tr(t.streaks.days, lang)}
        </p>
      </div>

      {/* Stat cards */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard label={tr(t.streaks.current, lang)} value={cur} />
        <StatCard label={tr(t.streaks.longestCard, lang)} value={streak?.longest_streak ?? 0} />
        <StatCard label={tr(t.streaks.totalDays, lang)} value={totalDays} />
      </div>

      {/* Heatmap */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-near-black">{tr(t.streaks.last3, lang)}</h2>
        {profile?.is_pro ? (
          <Heatmap data={heatmap} />
        ) : (
          <ProLockOverlay message={tr(t.pro.heatmapPrompt, lang)}>
            <Heatmap data={heatmap} />
          </ProLockOverlay>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface-card p-5">
      <div className="text-label">{label}</div>
      <div className="mt-2 text-4xl font-extrabold tabular-nums text-teal">{value}</div>
    </div>
  );
}

function Heatmap({ data }: { data: Record<string, number> }) {
  // Build last 90 days, grouped into weeks
  const days: { date: string; mins: number }[] = [];
  const today = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    days.push({ date: iso, mins: data[iso] ?? 0 });
  }
  const cellColor = (mins: number) => {
    if (mins === 0) return "var(--color-light-grey)";
    if (mins < 60) return "color-mix(in oklab, var(--color-teal) 20%, white)";
    if (mins < 120) return "color-mix(in oklab, var(--color-teal) 40%, white)";
    if (mins < 240) return "color-mix(in oklab, var(--color-teal) 70%, white)";
    return "var(--color-teal)";
  };
  return (
    <div className="surface-card overflow-x-auto p-4">
      <div className="grid grid-flow-col grid-rows-7 gap-1">
        {days.map((d) => (
          <div
            key={d.date}
            title={`${d.date} — ${(d.mins / 60).toFixed(1)}h`}
            className="h-3 w-3 rounded-sm"
            style={{ backgroundColor: cellColor(d.mins) }}
          />
        ))}
      </div>
    </div>
  );
}

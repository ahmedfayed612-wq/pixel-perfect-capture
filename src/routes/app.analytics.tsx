import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line, Area, AreaChart } from "recharts";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LangProvider";
import { tr, t } from "@/i18n/strings";
import { ProLockOverlay } from "@/components/brand/ProLockOverlay";

export const Route = createFileRoute("/app/analytics")({ component: AnalyticsPage });

function AnalyticsPage() {
  const { profile } = useAuth();
  const { lang } = useLang();
  const [data, setData] = useState<{ date: string; minutes: number }[]>([]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data: rows } = await supabase
        .from("sessions")
        .select("date,duration_minutes")
        .gte("date", since.toISOString().slice(0, 10));
      const map: Record<string, number> = {};
      (rows ?? []).forEach((s: any) => {
        map[s.date] = (map[s.date] ?? 0) + s.duration_minutes;
      });
      const arr: { date: string; minutes: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const iso = d.toISOString().slice(0, 10);
        arr.push({ date: iso.slice(5), minutes: map[iso] ?? 0 });
      }
      setData(arr);
    })();
  }, [profile]);

  const last7 = data.slice(-7);
  const totalWeek = last7.reduce((a, b) => a + b.minutes, 0) / 60;
  const dailyAvg = totalWeek / 7;

  const Charts = (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <SumCard label={lang === "ar" ? "الأسبوع ده" : "This Week"} value={`${totalWeek.toFixed(1)}h`} />
        <SumCard label={lang === "ar" ? "متوسط اليوم" : "Daily Average"} value={`${dailyAvg.toFixed(1)}h`} />
        <SumCard label={lang === "ar" ? "كل الجلسات" : "Total Sessions"} value={String(data.filter((d) => d.minutes > 0).length)} accent="gold" />
        <SumCard label={lang === "ar" ? "أكتر يوم" : "Best Day"} value={`${(Math.max(...data.map((d) => d.minutes)) / 60).toFixed(1)}h`} />
      </div>

      <div className="surface-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-near-black">
          {lang === "ar" ? "آخر 7 أيام" : "Last 7 Days"}
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={last7}>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={(v) => `${(v / 60).toFixed(0)}h`} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="minutes" fill="var(--color-teal)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="surface-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-near-black">
          {lang === "ar" ? "منحنى المذاكرة" : "Study Trend"}
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-gold-light)" stopOpacity={0.8} />
                <stop offset="100%" stopColor="var(--color-gold-light)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={(v) => `${(v / 60).toFixed(0)}h`} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Area type="monotone" dataKey="minutes" stroke="var(--color-teal)" strokeWidth={2} fill="url(#g1)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <h1 className="text-2xl font-bold text-near-black md:text-3xl">{tr(t.nav.analytics, lang)}</h1>
      <div className="mt-6">
        {profile?.is_pro ? Charts : <ProLockOverlay message={tr(t.pro.analyticsPrompt, lang)}>{Charts}</ProLockOverlay>}
      </div>
    </div>
  );
}

function SumCard({ label, value, accent }: { label: string; value: string; accent?: "gold" }) {
  return (
    <div className="surface-card overflow-hidden p-5">
      <div className={`-mx-5 -mt-5 mb-4 h-1 ${accent === "gold" ? "bg-gold" : "bg-teal"}`} />
      <div className="text-label">{label}</div>
      <div className={`mt-2 text-3xl font-extrabold tabular-nums ${accent === "gold" ? "text-gold" : "text-teal"}`}>
        {value}
      </div>
    </div>
  );
}

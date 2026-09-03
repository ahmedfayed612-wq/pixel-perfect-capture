import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LangProvider";
import { tr, t } from "@/i18n/strings";
import { ProLockOverlay } from "@/components/brand/ProLockOverlay";
import { BLOCK_COLORS, DAYS_AR, DAYS_EN, toISO, weekStartISO, type BlockType } from "@/lib/waqti";

export const Route = createFileRoute("/app/analytics")({ component: AnalyticsPage });

type Subject = { id: string; name: string; name_ar: string | null; color: string };
type Session = {
  id: string;
  subject_id: string | null;
  duration_minutes: number;
  date: string;
  created_at: string;
  block_type: string;
  focus_score: number | null;
  comprehension_score: number | null;
};

type RangeKey = "7d" | "30d" | "all" | "custom";
type TabKey = "overview" | "focus" | "consistency" | "subjects";

const TEAL = "var(--color-teal)";
const GOLD = "var(--color-gold)";
const GREY = "var(--color-mid-grey)";

function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISO(d);
}

function avg(nums: number[]) {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

function EmptyState({ label }: { label: string }) {
  return <div className="flex h-[200px] items-center justify-center text-sm text-mid-grey">{label}</div>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface-card p-5">
      <h3 className="mb-4 text-sm font-semibold text-near-black">{title}</h3>
      {children}
    </div>
  );
}

function AnalyticsPage() {
  const { user, profile, isPro } = useAuth();
  const { lang } = useLang();
  const ar = lang === "ar";

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [all, setAll] = useState<Session[]>([]);
  const [tab, setTab] = useState<TabKey>("overview");
  const [range, setRange] = useState<RangeKey>(isPro ? "30d" : "7d");
  const [from, setFrom] = useState(daysAgoISO(13));
  const [to, setTo] = useState(toISO(new Date()));

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: subs }, { data: sess }] = await Promise.all([
        supabase.from("subjects").select("id,name,name_ar,color").order("position"),
        supabase
          .from("sessions")
          .select("id,subject_id,duration_minutes,date,created_at,block_type,focus_score,comprehension_score")
          .order("date"),
      ]);
      setSubjects((subs as Subject[]) ?? []);
      setAll((sess as Session[]) ?? []);
    })();
  }, [user]);

  const subjName = (s?: Subject) => (s ? (ar && s.name_ar ? s.name_ar : s.name) : ar ? "بدون مادة" : "No subject");

  const bounds = useMemo(() => {
    if (!isPro) return { start: daysAgoISO(6), end: toISO(new Date()) };
    if (range === "7d") return { start: daysAgoISO(6), end: toISO(new Date()) };
    if (range === "30d") return { start: daysAgoISO(29), end: toISO(new Date()) };
    if (range === "custom") return { start: from, end: to };
    return { start: "0000-01-01", end: "9999-12-31" };
  }, [range, from, to, isPro]);

  const rows = useMemo(
    () => all.filter((s) => s.date >= bounds.start && s.date <= bounds.end),
    [all, bounds],
  );

  const hoursOf = (list: Session[]) => list.reduce((a, r) => a + r.duration_minutes, 0) / 60;

  /* ---------- Tab 1: overview ---------- */
  const weekStart = weekStartISO();
  const totalHours = hoursOf(rows);
  const weekHours = hoursOf(all.filter((r) => r.date >= weekStart));
  const daySpan = useMemo(() => {
    const set = new Set(rows.map((r) => r.date));
    return Math.max(1, set.size);
  }, [rows]);
  const dailyAvg = totalHours / daySpan;
  const longestSession = rows.length ? Math.max(...rows.map((r) => r.duration_minutes)) / 60 : 0;

  const donut = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => map.set(r.subject_id ?? "none", (map.get(r.subject_id ?? "none") ?? 0) + r.duration_minutes));
    const total = [...map.values()].reduce((a, b) => a + b, 0);
    return [...map.entries()]
      .map(([id, min]) => {
        const s = subjects.find((x) => x.id === id);
        return {
          id,
          name: subjName(s),
          color: s?.color ?? GREY,
          hours: min / 60,
          pct: total ? Math.round((1000 * min) / total) / 10 : 0,
        };
      })
      .sort((a, b) => b.hours - a.hours);
  }, [rows, subjects, ar]);

  const dailyBar = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => map.set(r.date, (map.get(r.date) ?? 0) + r.duration_minutes));
    const start = bounds.start === "0000-01-01" ? (rows[0]?.date ?? toISO(new Date())) : bounds.start;
    const end = bounds.end === "9999-12-31" ? toISO(new Date()) : bounds.end;
    const out: { date: string; hours: number }[] = [];
    const d = new Date(start);
    const last = new Date(end);
    while (d <= last && out.length < 400) {
      const iso = toISO(d);
      out.push({ date: iso.slice(5), hours: (map.get(iso) ?? 0) / 60 });
      d.setDate(d.getDate() + 1);
    }
    return out;
  }, [rows, bounds]);

  const dailyGoal = (profile?.weekly_goal_hours ?? 20) / 7;

  const deltas = useMemo(() => {
    const prevStart = (() => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() - 7);
      return toISO(d);
    })();
    const cur = all.filter((r) => r.date >= weekStart);
    const prev = all.filter((r) => r.date >= prevStart && r.date < weekStart);
    const stat = (list: Session[]) => ({
      hours: hoursOf(list),
      focus: avg(list.map((r) => r.focus_score).filter((v): v is number => v != null)) ?? 0,
      comp: avg(list.map((r) => r.comprehension_score).filter((v): v is number => v != null)) ?? 0,
      count: list.length,
    });
    const a = stat(cur);
    const b = stat(prev);
    const pct = (x: number, y: number) => (y > 0 ? ((x - y) / y) * 100 : x > 0 ? 100 : 0);
    return [
      { label: ar ? "ساعات" : "Hours", value: a.hours.toFixed(1), delta: pct(a.hours, b.hours) },
      { label: ar ? "متوسط التركيز" : "Avg focus", value: a.focus.toFixed(1), delta: pct(a.focus, b.focus) },
      { label: ar ? "متوسط الفهم" : "Avg comprehension", value: a.comp.toFixed(1), delta: pct(a.comp, b.comp) },
      { label: ar ? "عدد الجلسات" : "Sessions", value: String(a.count), delta: pct(a.count, b.count) },
    ];
  }, [all, weekStart, ar]);

  /* ---------- Tab 2: focus ---------- */
  const [qualityMetric, setQualityMetric] = useState<"both" | "focus" | "comprehension">("both");
  const qualityLine = useMemo(() => {
    const map = new Map<string, { f: number[]; c: number[] }>();
    rows
      .filter((r) => r.focus_score != null || r.comprehension_score != null)
      .forEach((r) => {
        const e = map.get(r.date) ?? { f: [], c: [] };
        if (r.focus_score != null) e.f.push(r.focus_score);
        if (r.comprehension_score != null) e.c.push(r.comprehension_score);
        map.set(r.date, e);
      });
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, e]) => ({ date: date.slice(5), focus: avg(e.f), comprehension: avg(e.c) }));
  }, [rows]);

  const periods = useMemo(() => {
    const defs: { key: string; label: string; test: (h: number) => boolean }[] = [
      { key: "morning", label: ar ? "صباح" : "Morning", test: (h) => h >= 5 && h <= 11 },
      { key: "afternoon", label: ar ? "بعد الضهر" : "Afternoon", test: (h) => h >= 12 && h <= 16 },
      { key: "evening", label: ar ? "مساء" : "Evening", test: (h) => h >= 17 && h <= 20 },
      { key: "night", label: ar ? "بالليل" : "Night", test: (h) => h >= 21 || h <= 4 },
    ];
    const scored = rows.filter((r) => r.focus_score != null);
    return defs.map((d) => {
      const list = scored.filter((r) => d.test(new Date(r.created_at).getHours()));
      return {
        period: d.label,
        focus: avg(list.map((r) => r.focus_score as number)) ?? 0,
        count: list.length,
      };
    });
  }, [rows, ar]);

  const [dowMetric, setDowMetric] = useState<"hours" | "focus">("hours");
  const dow = useMemo(() => {
    const names = ar ? DAYS_AR : DAYS_EN;
    return names.map((label, idx) => {
      // idx 0 = Saturday in app convention
      const list = rows.filter((r) => (new Date(r.date).getDay() + 1) % 7 === idx);
      return {
        label,
        hours: hoursOf(list),
        focus: avg(list.map((r) => r.focus_score).filter((v): v is number => v != null)) ?? 0,
      };
    });
  }, [rows, ar]);
  const dowMax = Math.max(...dow.map((d) => d[dowMetric]), 0);

  /* ---------- Tab 3: consistency ---------- */
  const heatmap = useMemo(() => {
    const since = daysAgoISO(364);
    const map = new Map<string, number>();
    all
      .filter((r) => r.date >= since)
      .forEach((r) => map.set(r.date, (map.get(r.date) ?? 0) + r.duration_minutes));
    // start on the Saturday on/before `since`
    const start = new Date(weekStartISO(new Date(since)));
    const weeks: { date: string; hours: number }[][] = [];
    const end = new Date();
    const cur = new Date(start);
    while (cur <= end) {
      const week: { date: string; hours: number }[] = [];
      for (let i = 0; i < 7; i++) {
        const iso = toISO(cur);
        week.push({ date: iso, hours: (map.get(iso) ?? 0) / 60 });
        cur.setDate(cur.getDate() + 1);
      }
      weeks.push(week);
    }
    return weeks;
  }, [all]);

  const shade = (h: number) => {
    if (h <= 0) return "var(--color-light-grey)";
    if (h < 1) return "color-mix(in oklab, var(--color-teal) 25%, white)";
    if (h < 2) return "color-mix(in oklab, var(--color-teal) 45%, white)";
    if (h < 4) return "color-mix(in oklab, var(--color-teal) 70%, white)";
    return "var(--color-teal-dark)";
  };

  const weeklyAvgLen = useMemo(() => {
    const map = new Map<string, number[]>();
    rows.forEach((r) => {
      const w = weekStartISO(new Date(r.date));
      map.set(w, [...(map.get(w) ?? []), r.duration_minutes]);
    });
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, list]) => ({ week: week.slice(5), minutes: avg(list) ?? 0 }));
  }, [rows]);

  /* ---------- Tab 4: subjects ---------- */
  const [open, setOpen] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, boolean>>({});

  const typeSplit = useMemo(() => {
    const keys: BlockType[] = ["lecture", "homework", "study"];
    const row: Record<string, number | string> = { name: "x" };
    keys.forEach((k) => {
      row[k] = hoursOf(rows.filter((r) => r.block_type === k));
    });
    return [row];
  }, [rows]);

  const perSubject = useMemo(
    () =>
      subjects.map((s) => {
        const list = rows.filter((r) => r.subject_id === s.id);
        const byDay = new Map<string, { min: number; comp: number[] }>();
        rows
          .filter((r) => r.subject_id === s.id && r.comprehension_score != null)
          .forEach((r) => {
            const e = byDay.get(r.date) ?? { min: 0, comp: [] };
            e.min += r.duration_minutes;
            e.comp.push(r.comprehension_score as number);
            byDay.set(r.date, e);
          });
        return {
          s,
          hours: hoursOf(list),
          count: list.length,
          focus: avg(list.map((r) => r.focus_score).filter((v): v is number => v != null)),
          comp: avg(list.map((r) => r.comprehension_score).filter((v): v is number => v != null)),
          scatter: [...byDay.values()].map((e) => ({ hours: e.min / 60, comprehension: avg(e.comp) ?? 0 })),
        };
      }),
    [subjects, rows],
  );

  const noData = ar ? "مفيش بيانات كفاية لسه" : "Not enough data yet";

  /* ---------- render ---------- */
  const Overview = (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label={ar ? "إجمالي الساعات" : "Total hours"} value={`${totalHours.toFixed(1)}h`} />
        <Stat label={ar ? "ساعات الأسبوع" : "This week"} value={`${weekHours.toFixed(1)}h`} />
        <Stat label={ar ? "متوسط اليوم" : "Daily average"} value={`${dailyAvg.toFixed(1)}h`} accent="gold" />
        <Stat label={ar ? "أطول جلسة" : "Longest session"} value={`${longestSession.toFixed(1)}h`} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title={ar ? "توزيع المواد" : "By subject"}>
          {donut.length === 0 ? (
            <EmptyState label={noData} />
          ) : (
            <div className="relative">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={donut} dataKey="hours" nameKey="name" innerRadius={62} outerRadius={95} paddingAngle={2}
                    label={(e: any) => `${e.payload.pct}%`}>
                    {donut.map((d) => (
                      <Cell key={d.id} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}h`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-extrabold tabular-nums text-near-black">{totalHours.toFixed(1)}h</div>
              </div>
            </div>
          )}
        </Card>

        <Card title={ar ? "الساعات اليومية" : "Daily hours"}>
          {dailyBar.length === 0 ? (
            <EmptyState label={noData} />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dailyBar}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-light-grey)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}h`} />
                <ReferenceLine y={dailyGoal} stroke={GOLD} strokeDasharray="4 4" />
                <Bar dataKey="hours" fill={TEAL} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {deltas.map((d) => (
          <div key={d.label} className="surface-card p-5">
            <div className="text-label">{d.label}</div>
            <div className="mt-2 text-2xl font-extrabold tabular-nums text-near-black">{d.value}</div>
            <div className="mt-1 text-xs font-semibold" style={{ color: d.delta >= 0 ? "var(--color-teal)" : "var(--destructive)" }}>
              {d.delta >= 0 ? "▲" : "▼"} {Math.abs(d.delta).toFixed(0)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const Focus = (
    <div className="space-y-6">
      <Card title={ar ? "جودة الجلسات" : "Session quality"}>
        <div className="mb-3 flex gap-2">
          {(["both", "focus", "comprehension"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setQualityMetric(m)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${qualityMetric === m ? "bg-teal text-white" : "bg-light-grey/60 text-mid-grey"}`}
            >
              {m === "both" ? (ar ? "الاتنين" : "Both") : m === "focus" ? (ar ? "التركيز" : "Focus") : ar ? "الفهم" : "Comprehension"}
            </button>
          ))}
        </div>
        {qualityLine.length === 0 ? (
          <EmptyState label={noData} />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={qualityLine}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-light-grey)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis domain={[1, 5]} tick={{ fontSize: 10 }} />
              <Tooltip />
              {qualityMetric !== "comprehension" && (
                <Line type="monotone" dataKey="focus" stroke={TEAL} strokeWidth={2} dot={false} />
              )}
              {qualityMetric !== "focus" && (
                <Line type="monotone" dataKey="comprehension" stroke={GOLD} strokeWidth={2} dot={false} />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card title={ar ? "التركيز حسب وقت اليوم" : "Focus by time of day"}>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={periods}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-light-grey)" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
            <YAxis domain={[1, 5]} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="focus" radius={[4, 4, 0, 0]}>
              {periods.map((p) => (
                <Cell key={p.period} fill={p.count < 3 ? "var(--color-light-grey)" : TEAL} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-4 text-center text-xs text-mid-grey">
          {periods.map((p) => (
            <div key={p.period}>{p.count} {ar ? "جلسة" : "sessions"}</div>
          ))}
        </div>
      </Card>

      <Card title={ar ? "أحسن يوم في الأسبوع" : "Best day of week"}>
        <div className="mb-3 flex gap-2">
          {(["hours", "focus"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setDowMetric(m)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${dowMetric === m ? "bg-teal text-white" : "bg-light-grey/60 text-mid-grey"}`}
            >
              {m === "hours" ? (ar ? "الساعات" : "Hours") : ar ? "التركيز" : "Focus"}
            </button>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={dow}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-light-grey)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} domain={dowMetric === "focus" ? [1, 5] : [0, "auto"]} />
            <Tooltip />
            <Bar dataKey={dowMetric} radius={[4, 4, 0, 0]}>
              {dow.map((d) => (
                <Cell key={d.label} fill={dowMax > 0 && d[dowMetric] === dowMax ? GOLD : TEAL} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );

  const Consistency = (
    <div className="space-y-6">
      <Card title={ar ? "خريطة السنة" : "Year heatmap"}>
        <div className="overflow-x-auto">
          <div className="flex gap-[3px]">
            {heatmap.map((week, i) => (
              <div key={i} className="flex flex-col gap-[3px]">
                {week.map((d) => (
                  <div
                    key={d.date}
                    title={`${d.date} — ${d.hours.toFixed(1)}h`}
                    className="h-3 w-3 rounded-[3px]"
                    style={{ backgroundColor: shade(d.hours) }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card title={ar ? "متوسط طول الجلسة (أسبوعي)" : "Avg session length (weekly)"}>
        {weeklyAvgLen.length === 0 ? (
          <EmptyState label={noData} />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={weeklyAvgLen}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-light-grey)" />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: any) => `${Number(v).toFixed(0)} min`} />
              <ReferenceArea y1={25} y2={50} fill={GOLD} fillOpacity={0.15} />
              <Line type="monotone" dataKey="minutes" stroke={TEAL} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );

  const Subjects = (
    <div className="space-y-6">
      <div className="space-y-3">
        {perSubject.length === 0 ? (
          <div className="surface-card p-6 text-sm text-mid-grey">{noData}</div>
        ) : (
          perSubject.map((p) => (
            <div key={p.s.id} className="surface-card overflow-hidden">
              <button
                onClick={() => setOpen(open === p.s.id ? null : p.s.id)}
                className="flex w-full items-center justify-between px-5 py-4"
                style={{ borderInlineStartWidth: 4, borderInlineStartColor: p.s.color }}
              >
                <span className="text-sm font-semibold text-near-black">{subjName(p.s)}</span>
                <span className="flex items-center gap-3 text-sm text-mid-grey">
                  <span className="tabular-nums">{p.hours.toFixed(1)}h</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${open === p.s.id ? "rotate-180" : ""}`} />
                </span>
              </button>
              {open === p.s.id && (
                <div className="space-y-4 border-t border-light-grey px-5 py-4">
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <MiniStat label={ar ? "الجلسات" : "Sessions"} value={String(p.count)} />
                    <MiniStat label={ar ? "التركيز" : "Focus"} value={p.focus ? p.focus.toFixed(1) : "—"} />
                    <MiniStat label={ar ? "الفهم" : "Comprehension"} value={p.comp ? p.comp.toFixed(1) : "—"} />
                  </div>
                  <button
                    onClick={() => setDetails((d) => ({ ...d, [p.s.id]: !d[p.s.id] }))}
                    className="text-sm font-semibold text-teal"
                  >
                    {ar ? "عرض تفاصيل أكتر" : "Show more details"}
                  </button>
                  {details[p.s.id] &&
                    (p.scatter.length >= 10 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <ScatterChart>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-light-grey)" />
                          <XAxis dataKey="hours" name={ar ? "ساعات" : "hours"} tick={{ fontSize: 10 }} />
                          <YAxis dataKey="comprehension" domain={[1, 5]} tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Scatter data={p.scatter} fill={p.s.color} />
                        </ScatterChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyState label={ar ? "محتاج جلسات أكتر" : "Need more sessions"} />
                    ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <Card title={ar ? "توزيع نوع الجلسات" : "Session type split"}>
        <ResponsiveContainer width="100%" height={110}>
          <BarChart data={typeSplit} layout="vertical" barSize={28}>
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="name" hide />
            <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}h`} />
            {(["lecture", "homework", "study"] as BlockType[]).map((k) => (
              <Bar key={k} dataKey={k} stackId="a" fill={BLOCK_COLORS[k]} name={tr(t.schedule[k], lang)} />
            ))}
          </BarChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-4 text-xs text-mid-grey">
          {(["lecture", "homework", "study"] as BlockType[]).map((k) => (
            <span key={k} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: BLOCK_COLORS[k] }} />
              {tr(t.schedule[k], lang)}
            </span>
          ))}
        </div>
      </Card>
    </div>
  );

  const tabs: { key: TabKey; label: string; pro: boolean; content: React.ReactNode }[] = [
    { key: "overview", label: ar ? "نظرة عامة" : "Overview", pro: false, content: Overview },
    { key: "focus", label: ar ? "التركيز" : "Focus", pro: true, content: Focus },
    { key: "consistency", label: ar ? "الاتساق" : "Consistency", pro: true, content: Consistency },
    { key: "subjects", label: ar ? "حسب المادة" : "By subject", pro: true, content: Subjects },
  ];
  const active = tabs.find((x) => x.key === tab)!;

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <h1 className="text-2xl font-bold text-near-black md:text-3xl">{tr(t.nav.analytics, lang)}</h1>

      {/* Tabs */}
      <div className="mt-5 grid grid-cols-4 gap-2 rounded-lg bg-light-grey/60 p-1">
        {tabs.map((x) => (
          <button
            key={x.key}
            onClick={() => setTab(x.key)}
            className={`h-10 rounded-md text-xs font-semibold transition-colors md:text-sm ${
              tab === x.key ? "bg-white text-teal shadow-sm" : "text-mid-grey"
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      {/* Range filter */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {(["7d", "30d", "all", "custom"] as RangeKey[]).map((r) => (
          <button
            key={r}
            disabled={!isPro && r !== "7d"}
            onClick={() => setRange(r)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-40 ${
              range === r ? "bg-teal text-white" : "bg-light-grey/60 text-mid-grey"
            }`}
          >
            {r === "7d" ? (ar ? "٧ أيام" : "7 days") : r === "30d" ? (ar ? "٣٠ يوم" : "30 days") : r === "all" ? (ar ? "الكل" : "All time") : ar ? "مخصص" : "Custom"}
          </button>
        ))}
        {isPro && range === "custom" && (
          <div className="flex items-center gap-2">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-md border border-light-grey px-2 text-xs" />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-md border border-light-grey px-2 text-xs" />
          </div>
        )}
      </div>

      <div className="mt-6">
        {isPro || !active.pro ? (
          active.content
        ) : (
          <ProLockOverlay message={tr(t.pro.analyticsPrompt, lang)}>{active.content}</ProLockOverlay>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "gold" }) {
  return (
    <div className="surface-card overflow-hidden p-5">
      <div className={`-mx-5 -mt-5 mb-4 h-1 ${accent === "gold" ? "bg-gold" : "bg-teal"}`} />
      <div className="text-label">{label}</div>
      <div className={`mt-2 text-3xl font-extrabold tabular-nums ${accent === "gold" ? "text-gold" : "text-teal"}`}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-off-white p-3 text-center">
      <div className="text-label">{label}</div>
      <div className="mt-1 text-lg font-bold tabular-nums text-near-black">{value}</div>
    </div>
  );
}

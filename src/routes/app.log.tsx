import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LangProvider";
import { tr, t } from "@/i18n/strings";
import { fmtDuration, BLOCK_COLORS, type BlockType } from "@/lib/waqti";
import { toast } from "sonner";

export const Route = createFileRoute("/app/log")({ component: SessionLogPage });

type Subject = { id: string; name: string; name_ar: string | null; color: string };
type Session = {
  id: string;
  subject_id: string | null;
  duration_minutes: number;
  date: string;
  notes: string | null;
  topic: string | null;
  block_type: string;
  focus_score: number | null;
  comprehension_score: number | null;
  fatigue_score: number | null;
  created_at: string;
};

type Range = "7" | "30" | "all";

function SessionLogPage() {
  const { profile } = useAuth();
  const { lang } = useLang();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [range, setRange] = useState<Range>("30");

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [{ data: subs }, { data: sess }] = await Promise.all([
        supabase.from("subjects").select("id,name,name_ar,color").order("position"),
        supabase
          .from("sessions")
          .select(
            "id,subject_id,duration_minutes,date,notes,topic,block_type,focus_score,comprehension_score,fatigue_score,created_at",
          )
          .order("date", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);
      setSubjects((subs as Subject[]) ?? []);
      setSessions((sess as Session[]) ?? []);
    })();
  }, [profile]);

  const name = (s?: Subject) => (!s ? "—" : lang === "ar" && s.name_ar ? s.name_ar : s.name);

  const filtered = useMemo(() => {
    const cutoff = new Date();
    if (range !== "all") cutoff.setDate(cutoff.getDate() - Number(range));
    const cutISO = cutoff.toISOString().slice(0, 10);
    return sessions.filter((s) => {
      if (range !== "all" && s.date < cutISO) return false;
      if (subjectFilter !== "all" && s.subject_id !== subjectFilter) return false;
      if (typeFilter !== "all" && s.block_type !== typeFilter) return false;
      return true;
    });
  }, [sessions, subjectFilter, typeFilter, range]);

  const totalMinutes = filtered.reduce((a, s) => a + s.duration_minutes, 0);
  const scored = filtered.filter((s) => s.focus_score || s.comprehension_score);
  const avgQuality = scored.length
    ? (
        scored.reduce((a, s) => a + ((s.focus_score ?? 0) + (s.comprehension_score ?? 0)) / 2, 0) / scored.length
      ).toFixed(1)
    : "—";

  const grouped = useMemo(() => {
    const g: Record<string, Session[]> = {};
    filtered.forEach((s) => {
      (g[s.date] ??= []).push(s);
    });
    return Object.entries(g);
  }, [filtered]);

  const remove = async (id: string) => {
    const { error } = await supabase.from("sessions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    toast.success(lang === "ar" ? "اتمسحت" : "Deleted");
  };

  const selectCls =
    "h-11 rounded-lg border border-light-grey bg-white px-3 text-sm text-near-black focus:border-teal focus:ring-2 focus:ring-teal/20";

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <h1 className="text-2xl font-bold text-near-black md:text-3xl">{tr(t.log.title, lang)}</h1>

      {/* Filters */}
      <div className="mt-5 flex flex-wrap gap-3">
        <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className={selectCls}>
          <option value="all">{tr(t.log.allSubjects, lang)}</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {name(s)}
            </option>
          ))}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={selectCls}>
          <option value="all">{tr(t.log.allTypes, lang)}</option>
          <option value="study">{tr(t.schedule.study, lang)}</option>
          <option value="lecture">{tr(t.schedule.lecture, lang)}</option>
          <option value="homework">{tr(t.schedule.homework, lang)}</option>
        </select>
        <div className="flex overflow-hidden rounded-lg border border-light-grey bg-white">
          {(["7", "30", "all"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`h-11 px-4 text-xs font-semibold transition-colors ${
                range === r ? "bg-teal text-white" : "text-near-black hover:bg-teal/5"
              }`}
            >
              {tr(r === "7" ? t.log.range7 : r === "30" ? t.log.range30 : t.log.rangeAll, lang)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Stat label={tr(t.log.totalSessions, lang)} value={String(filtered.length)} />
        <Stat label={tr(t.log.totalTime, lang)} value={fmtDuration(totalMinutes, lang)} />
        <Stat label={tr(t.log.avgQuality, lang)} value={avgQuality === "—" ? "—" : `${avgQuality}/5`} />
      </div>

      {/* List */}
      {grouped.length === 0 ? (
        <div className="surface-card mt-6 p-8 text-center text-sm text-mid-grey">{tr(t.log.empty, lang)}</div>
      ) : (
        <div className="mt-6 space-y-6">
          {grouped.map(([date, rows]) => (
            <div key={date}>
              <div className="text-label">
                {new Date(date).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                })}
              </div>
              <ul className="mt-2 space-y-3">
                {rows.map((s) => {
                  const subj = subjects.find((x) => x.id === s.subject_id);
                  const color = subj?.color ?? BLOCK_COLORS[(s.block_type as BlockType) ?? "study"];
                  return (
                    <li
                      key={s.id}
                      className="surface-card p-4"
                      style={{ borderInlineStartWidth: 4, borderInlineStartColor: color }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-near-black">{name(subj)}</div>
                          {s.topic && <div className="text-xs text-mid-grey">{s.topic}</div>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold tabular-nums text-teal">
                            {fmtDuration(s.duration_minutes, lang)}
                          </span>
                          <button
                            onClick={() => remove(s.id)}
                            aria-label="delete"
                            className="text-mid-grey hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                          style={{ backgroundColor: BLOCK_COLORS[(s.block_type as BlockType) ?? "study"] }}
                        >
                          {tr(
                            s.block_type === "lecture"
                              ? t.schedule.lecture
                              : s.block_type === "homework"
                                ? t.schedule.homework
                                : t.schedule.study,
                            lang,
                          )}
                        </span>
                        {s.focus_score != null && (
                          <Score label={tr(t.log.focus, lang)} value={s.focus_score} />
                        )}
                        {s.comprehension_score != null && (
                          <Score label={tr(t.log.comprehension, lang)} value={s.comprehension_score} />
                        )}
                        {s.fatigue_score != null && (
                          <Score label={tr(t.log.fatigue, lang)} value={s.fatigue_score} />
                        )}
                        <span className="ms-auto text-[10px] tabular-nums text-mid-grey">
                          {new Date(s.created_at).toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {s.notes && <p className="mt-3 text-xs text-mid-grey">{s.notes}</p>}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full border border-light-grey px-2 py-0.5 text-[10px] font-medium text-near-black">
      {label} {value}/5
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card p-5">
      <div className="text-label">{label}</div>
      <div className="mt-2 text-2xl font-extrabold tabular-nums text-teal">{value}</div>
    </div>
  );
}

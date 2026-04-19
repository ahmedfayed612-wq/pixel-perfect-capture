import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LangProvider";
import { tr, t } from "@/i18n/strings";
import { fmtClock, todayISO } from "@/lib/waqti";
import { toast } from "sonner";

export const Route = createFileRoute("/app/timer")({ component: TimerPage });

type Subject = { id: string; name: string; color: string };
type Phase = "idle" | "running" | "paused";

function TimerPage() {
  const { user } = useAuth();
  const { lang } = useLang();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState<string>("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("subjects").select("id,name,color").order("position");
      setSubjects((data as Subject[]) ?? []);
      if (data && data.length && !subjectId) setSubjectId(data[0].id);
    })();
  }, []);

  useEffect(() => {
    if (phase !== "running") return;
    ref.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      if (ref.current) window.clearInterval(ref.current);
    };
  }, [phase]);

  const subject = subjects.find((s) => s.id === subjectId);
  const color = subject?.color ?? "var(--color-teal)";

  const onStart = () => {
    if (!subjectId) {
      toast.error(tr(t.timer.addSubjectFirst, lang));
      return;
    }
    setPhase("running");
  };
  const onEnd = () => {
    if (ref.current) window.clearInterval(ref.current);
    setPhase("idle");
    setShowSummary(true);
  };

  const onSave = async () => {
    if (!user || !subjectId) return;
    const minutes = Math.max(1, Math.round(seconds / 60));
    setSaving(true);
    const { error } = await supabase.from("sessions").insert({
      user_id: user.id,
      subject_id: subjectId,
      duration_minutes: minutes,
      date: todayISO(),
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("✓");
    setShowSummary(false);
    setSeconds(0);
    setNotes("");
  };

  const onDiscard = () => {
    setShowSummary(false);
    setSeconds(0);
    setNotes("");
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col px-5 py-8 md:px-10 md:py-12">
      {/* Subject selector */}
      <div className="mx-auto w-full max-w-md">
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          disabled={phase !== "idle"}
          className="block h-12 w-full rounded-lg border border-light-grey bg-white px-4 text-sm text-near-black focus:border-teal focus:ring-2 focus:ring-teal/20"
        >
          <option value="">{tr(t.timer.selectSubject, lang)}</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Timer display */}
      <div className="mx-auto mt-12 flex flex-col items-center md:mt-16">
        <motion.div
          key={phase}
          animate={phase === "running" ? { scale: [1, 1.02, 1] } : { scale: 1 }}
          transition={phase === "running" ? { duration: 2, repeat: Infinity } : {}}
          className="text-display tabular-nums"
          style={{
            fontSize: "clamp(72px, 14vw, 144px)",
            color: phase === "running" ? color : "var(--color-near-black)",
            lineHeight: 1,
          }}
        >
          {fmtClock(seconds)}
        </motion.div>
        {subject && (
          <div className="mt-4 flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: subject.color }} />
            <span className="text-base font-medium text-near-black">{subject.name}</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mx-auto mt-12 flex flex-col items-center gap-3">
        {phase === "idle" && (
          <button
            onClick={onStart}
            className="h-[60px] w-[200px] rounded-lg bg-teal text-base font-bold text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
          >
            {tr(t.timer.startSession, lang)}
          </button>
        )}
        {phase === "running" && (
          <div className="flex items-center gap-4">
            <button
              onClick={() => setPhase("paused")}
              className="h-14 w-32 rounded-lg border-2 border-teal text-cta text-teal hover:bg-teal/5"
            >
              {tr(t.timer.pause, lang)}
            </button>
            <button
              onClick={onEnd}
              className="h-14 w-32 rounded-lg bg-near-black text-cta text-white hover:opacity-90"
            >
              {tr(t.timer.end, lang)}
            </button>
          </div>
        )}
        {phase === "paused" && (
          <div className="flex items-center gap-4">
            <button
              onClick={() => setPhase("running")}
              className="h-14 w-32 rounded-lg bg-teal text-cta text-white hover:opacity-90"
            >
              {tr(t.timer.resume, lang)}
            </button>
            <button
              onClick={onEnd}
              className="h-14 w-32 rounded-lg bg-near-black text-cta text-white hover:opacity-90"
            >
              {tr(t.timer.end, lang)}
            </button>
          </div>
        )}
      </div>

      {/* Summary modal */}
      {showSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-near-black/40 px-4">
          <div className="surface-card w-full max-w-md p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-teal">{tr(t.timer.sessionComplete, lang)}</h2>
            <div className="mt-4 text-5xl font-extrabold tabular-nums text-near-black">
              {fmtClock(seconds)}
            </div>
            {subject && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: subject.color }} />
                <span className="text-near-black">{subject.name}</span>
              </div>
            )}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={tr(t.timer.addNote, lang)}
              className="mt-5 block h-24 w-full rounded-lg border border-light-grey bg-white p-3 text-sm focus:border-teal focus:ring-2 focus:ring-teal/20"
            />
            <button
              onClick={onSave}
              disabled={saving}
              className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-lg bg-teal text-cta text-white disabled:opacity-60"
            >
              {tr(t.timer.save, lang)}
            </button>
            <button
              onClick={onDiscard}
              className="mt-3 block w-full text-center text-sm text-mid-grey hover:text-near-black"
            >
              {tr(t.timer.discard, lang)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

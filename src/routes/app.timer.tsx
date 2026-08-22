import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Settings2 } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LangProvider";
import { tr, t } from "@/i18n/strings";
import { fmtClock, fmtDuration, todayISO, todayDow, type BlockType } from "@/lib/waqti";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/app/timer")({ component: TimerPage });

type Subject = { id: string; name: string; name_ar: string | null; color: string };
type Block = {
  id: string;
  subject_id: string | null;
  start_time: string;
  end_time: string;
  kind: BlockType;
  title: string | null;
};
type LogRow = { id: string; subject_id: string | null; duration_minutes: number; block_type: string };
type RunState = "idle" | "running" | "paused";
type PomoPhase = "focus" | "short" | "long";

const STORAGE_KEY = "waqti.timer.state";

/** All time values are wall-clock timestamps (ms) — never tick counters. */
type TimerState = {
  run: RunState;
  mode: "stopwatch" | "pomodoro";
  phase: PomoPhase;
  round: number;
  /** Date.now() when the current running segment began (null when idle/paused). */
  startTs: number | null;
  /** Focus milliseconds banked from finished/paused segments. */
  focusAccumMs: number;
  /** Pomodoro: timestamp the current phase should end. */
  phaseEndTs: number | null;
  /** Pomodoro: remaining ms of the current phase while paused. */
  phaseRemainingMs: number | null;
};

const IDLE: TimerState = {
  run: "idle",
  mode: "stopwatch",
  phase: "focus",
  round: 1,
  startTs: null,
  focusAccumMs: 0,
  phaseEndTs: null,
  phaseRemainingMs: null,
};

// short beep without any asset
function beep() {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    /* audio not available */
  }
}

function TimerPage() {
  const { user, profile, refresh } = useAuth();
  const { lang } = useLang();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [log, setLog] = useState<LogRow[]>([]);
  const [selection, setSelection] = useState<string>(""); // "subject:<id>" | "block:<id>"
  const [blockType, setBlockType] = useState<BlockType>("study");

  const [state, setState] = useState<TimerState>(IDLE);
  const [now, setNow] = useState(() => Date.now());

  const [showModal, setShowModal] = useState(false);
  const [showPomoSettings, setShowPomoSettings] = useState(false);
  const [focusScore, setFocusScore] = useState(0);
  const [compScore, setCompScore] = useState(0);
  const [fatigueScore, setFatigueScore] = useState(0);
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  /** Final wall-clock duration of the session shown in the modal. */
  const [finalMs, setFinalMs] = useState(0);

  const focusMin = profile?.pomodoro_focus_min ?? 25;
  const shortMin = profile?.pomodoro_short_break_min ?? 5;
  const longMin = profile?.pomodoro_long_break_min ?? 15;
  const totalRounds = profile?.pomodoro_rounds ?? 4;

  const [pf, setPf] = useState(focusMin);
  const [ps, setPs] = useState(shortMin);
  const [pl, setPl] = useState(longMin);
  const [pr, setPr] = useState(totalRounds);
  useEffect(() => {
    setPf(focusMin);
    setPs(shortMin);
    setPl(longMin);
    setPr(totalRounds);
  }, [focusMin, shortMin, longMin, totalRounds]);

  const loadLog = useCallback(async () => {
    const { data } = await supabase
      .from("sessions")
      .select("id,subject_id,duration_minutes,block_type")
      .eq("date", todayISO())
      .order("created_at", { ascending: false });
    setLog((data as LogRow[]) ?? []);
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: subs }, { data: sched }] = await Promise.all([
        supabase.from("subjects").select("id,name,name_ar,color").order("position"),
        supabase
          .from("schedule")
          .select("id,subject_id,start_time,end_time,kind,title")
          .eq("day_of_week", todayDow())
          .order("start_time"),
      ]);
      const list = (subs as Subject[]) ?? [];
      setSubjects(list);
      setBlocks((sched as Block[]) ?? []);
      setSelection((cur) => cur || (list[0] ? `subject:${list[0].id}` : ""));
      loadLog();
    })();
  }, [user, loadLog]);

  // ---- persistence: restore on mount ------------------------------------
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as TimerState & { selection?: string; blockType?: BlockType };
      if (!saved || saved.run === "idle") return;
      setState({
        run: saved.run,
        mode: saved.mode,
        phase: saved.phase,
        round: saved.round,
        startTs: saved.startTs ?? null,
        focusAccumMs: saved.focusAccumMs ?? 0,
        phaseEndTs: saved.phaseEndTs ?? null,
        phaseRemainingMs: saved.phaseRemainingMs ?? null,
      });
      if (saved.selection) setSelection(saved.selection);
      if (saved.blockType) setBlockType(saved.blockType);
      setNow(Date.now());
    } catch {
      /* ignore corrupt state */
    }
  }, []);

  // persist on every change
  useEffect(() => {
    try {
      if (state.run === "idle") window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, selection, blockType }));
    } catch {
      /* storage unavailable */
    }
  }, [state, selection, blockType]);

  // ---- ticking: only triggers a recompute, never holds the time ----------
  useEffect(() => {
    if (state.run !== "running") return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [state.run]);

  // catch up instantly when the tab becomes visible again
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") setNow(Date.now());
    };
    window.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    window.addEventListener("pageshow", onVis);
    return () => {
      window.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
      window.removeEventListener("pageshow", onVis);
    };
  }, []);

  // ---- derived values ----------------------------------------------------
  const inFocus = state.mode === "stopwatch" || state.phase === "focus";
  const focusMs =
    state.focusAccumMs + (state.run === "running" && inFocus && state.startTs ? Math.max(0, now - state.startTs) : 0);
  const seconds = Math.floor(focusMs / 1000);
  const remainingMs =
    state.mode === "pomodoro"
      ? state.run === "running" && state.phaseEndTs
        ? Math.max(0, state.phaseEndTs - now)
        : (state.phaseRemainingMs ?? 0)
      : 0;

  // ---- pomodoro phase transitions, driven by timestamps ------------------
  useEffect(() => {
    if (state.run !== "running" || state.mode !== "pomodoro" || !state.phaseEndTs) return;
    if (now < state.phaseEndTs) return;

    setState((s) => {
      if (s.run !== "running" || s.mode !== "pomodoro" || !s.phaseEndTs) return s;
      let next = { ...s };
      let ended = false;
      // resolve every phase boundary that elapsed while the tab was hidden
      while (!ended && next.phaseEndTs && Date.now() >= next.phaseEndTs) {
        const boundary = next.phaseEndTs;
        if (next.phase === "focus") {
          next.focusAccumMs += Math.max(0, boundary - (next.startTs ?? boundary));
          if (next.round >= totalRounds) {
            next = { ...next, phase: "long", startTs: boundary, phaseEndTs: boundary + longMin * 60_000 };
          } else {
            next = { ...next, phase: "short", startTs: boundary, phaseEndTs: boundary + shortMin * 60_000 };
          }
        } else if (next.phase === "long") {
          next = { ...next, run: "idle", startTs: null, phaseEndTs: null, phaseRemainingMs: 0 };
          ended = true;
        } else {
          next = {
            ...next,
            round: next.round + 1,
            phase: "focus",
            startTs: boundary,
            phaseEndTs: boundary + focusMin * 60_000,
          };
        }
      }
      if (ended) {
        setFinalMs(next.focusAccumMs);
        setShowModal(true);
      }
      return next;
    });
    beep();
  }, [now, state.run, state.mode, state.phaseEndTs, focusMin, shortMin, longMin, totalRounds]);

  const parsed = useMemo(() => {
    if (selection.startsWith("block:")) {
      const b = blocks.find((x) => x.id === selection.slice(6));
      return { subjectId: b?.subject_id ?? null, blockId: b?.id ?? null, blockType: (b?.kind ?? "study") as BlockType };
    }
    if (selection.startsWith("subject:")) {
      return { subjectId: selection.slice(8), blockId: null, blockType: "study" as BlockType };
    }
    return { subjectId: null, blockId: null, blockType: "study" as BlockType };
  }, [selection, blocks]);

  // Auto-set block type from a picked scheduled block (still editable)
  useEffect(() => {
    if (selection.startsWith("block:")) setBlockType(parsed.blockType);
  }, [selection, parsed.blockType]);

  const subject = subjects.find((s) => s.id === parsed.subjectId);
  const subjName = (s?: Subject) => (s ? (lang === "ar" && s.name_ar ? s.name_ar : s.name) : "");
  const color = subject?.color ?? "var(--color-teal)";

  const run = state.run;
  const mode = state.mode;
  const phase = state.phase;
  const round = state.round;

  const setMode = (m: "stopwatch" | "pomodoro") => setState((s) => ({ ...s, mode: m }));

  const onStart = () => {
    if (!selection) {
      toast.error(tr(t.timer.addSubjectFirst, lang));
      return;
    }
    const ts = Date.now();
    setNow(ts);
    setState((s) => ({
      ...s,
      run: "running",
      round: 1,
      phase: "focus",
      startTs: ts,
      focusAccumMs: 0,
      phaseEndTs: s.mode === "pomodoro" ? ts + focusMin * 60_000 : null,
      phaseRemainingMs: null,
    }));
  };

  const onPause = () => {
    const ts = Date.now();
    setNow(ts);
    setState((s) => ({
      ...s,
      run: "paused",
      focusAccumMs: s.focusAccumMs + (inFocus && s.startTs ? Math.max(0, ts - s.startTs) : 0),
      startTs: null,
      phaseRemainingMs: s.mode === "pomodoro" && s.phaseEndTs ? Math.max(0, s.phaseEndTs - ts) : null,
      phaseEndTs: null,
    }));
  };

  const onResume = () => {
    const ts = Date.now();
    setNow(ts);
    setState((s) => ({
      ...s,
      run: "running",
      startTs: ts,
      phaseEndTs: s.mode === "pomodoro" ? ts + (s.phaseRemainingMs ?? focusMin * 60_000) : null,
      phaseRemainingMs: null,
    }));
  };

  const onEnd = () => {
    const ts = Date.now();
    const total =
      state.focusAccumMs + (state.run === "running" && inFocus && state.startTs ? Math.max(0, ts - state.startTs) : 0);
    setFinalMs(total);
    setState((s) => ({ ...s, run: "idle", startTs: null, focusAccumMs: total, phaseEndTs: null, phaseRemainingMs: 0 }));
    setShowModal(true);
  };

  const reset = () => {
    setShowModal(false);
    setFinalMs(0);
    setState((s) => ({ ...IDLE, mode: s.mode }));
    setFocusScore(0);
    setCompScore(0);
    setFatigueScore(0);
    setTopic("");
    setNotes("");
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
  };

  const onSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("sessions").insert({
      user_id: user.id,
      subject_id: parsed.subjectId,
      schedule_block_id: parsed.blockId,
      block_type: blockType,
      duration_minutes: Math.max(1, Math.round(finalMs / 60_000)),
      date: todayISO(),
      notes: notes.trim() || null,
      topic: topic.trim() || null,
      focus_score: focusScore || null,
      comprehension_score: compScore || null,
      fatigue_score: fatigueScore || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(tr(t.session.save, lang));
    reset();
    loadLog();
  };

  const savePomo = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        pomodoro_focus_min: pf,
        pomodoro_short_break_min: ps,
        pomodoro_long_break_min: pl,
        pomodoro_rounds: pr,
      })
      .eq("id", user.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refresh();
    setShowPomoSettings(false);
    toast.success("✓");
  };

  const todayTotal = log.reduce((a, r) => a + r.duration_minutes, 0);
  const display = mode === "stopwatch" ? fmtClock(seconds) : fmtClock(Math.round(remainingMs / 1000));
  const phaseLabel =
    phase === "focus"
      ? `☕ ${tr(t.pomodoro.focus, lang)}`
      : phase === "short"
        ? `🌟 ${tr(t.pomodoro.shortBreak, lang)}`
        : `🍅 ${tr(t.pomodoro.longBreak, lang)}`;

  return (
    <div className="grid gap-8 px-5 py-8 md:grid-cols-[1fr_280px] md:px-10 md:py-12">
      <div className="flex flex-col">
        {/* Selector */}
        <div className="mx-auto w-full max-w-md">
          <select
            value={selection}
            onChange={(e) => setSelection(e.target.value)}
            disabled={run !== "idle"}
            className="block h-12 w-full rounded-lg border border-light-grey bg-white px-4 text-sm text-near-black focus:border-teal focus:ring-2 focus:ring-teal/20"
          >
            <option value="">{tr(t.timer.selectSubject, lang)}</option>
            {subjects.map((s) => (
              <option key={s.id} value={`subject:${s.id}`}>
                {subjName(s)}
              </option>
            ))}
            {blocks.map((b) => {
              const s = subjects.find((x) => x.id === b.subject_id);
              return (
                <option key={b.id} value={`block:${b.id}`}>
                  {`${b.title || subjName(s) || tr(t.schedule[b.kind], lang)} — ${tr(t.schedule[b.kind], lang)} (${b.start_time.slice(0, 5)} - ${b.end_time.slice(0, 5)})`}
                </option>
              );
            })}
          </select>

          {/* Block type segmented control */}
          <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-light-grey/60 p-1">
            {(["homework", "lecture", "study"] as const).map((k) => (
              <button
                key={k}
                onClick={() => run === "idle" && setBlockType(k)}
                className={`h-10 rounded-md text-sm font-semibold transition-colors ${
                  blockType === k ? "bg-white text-teal shadow-sm" : "text-mid-grey"
                }`}
              >
                {tr(t.schedule[k], lang)}
              </button>
            ))}
          </div>

          {/* Mode toggle */}
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-light-grey/60 p-1">
            {(["stopwatch", "pomodoro"] as const).map((m) => (
              <button
                key={m}
                onClick={() => run === "idle" && setMode(m)}
                className={`h-10 rounded-md text-sm font-semibold transition-colors ${
                  mode === m ? "bg-white text-teal shadow-sm" : "text-mid-grey"
                }`}
              >
                {tr(t.pomodoro[m], lang)}
              </button>
            ))}
          </div>

          {mode === "pomodoro" && (
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="font-medium text-near-black">{phaseLabel}</span>
              <span className="text-mid-grey">
                {round} {tr(t.pomodoro.round, lang)} {totalRounds} {tr(t.pomodoro.rounds, lang)}
              </span>
              <button
                onClick={() => setShowPomoSettings(true)}
                className="text-mid-grey hover:text-teal"
                aria-label={tr(t.pomodoro.settings, lang)}
              >
                <Settings2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Display */}
        <div className="mx-auto mt-12 flex flex-col items-center md:mt-16">
          <motion.div
            key={`${run}-${phase}`}
            animate={run === "running" ? { scale: [1, 1.02, 1] } : { scale: 1 }}
            transition={run === "running" ? { duration: 2, repeat: Infinity } : {}}
            className="text-display tabular-nums"
            style={{
              fontSize: "clamp(64px, 13vw, 132px)",
              color: run === "running" ? color : "var(--color-near-black)",
              lineHeight: 1,
            }}
          >
            {display}
          </motion.div>
          {subject && (
            <div className="mt-4 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: subject.color }} />
              <span className="text-base font-medium text-near-black">{subjName(subject)}</span>
            </div>
          )}
          {mode === "pomodoro" && seconds > 0 && (
            <div className="mt-2 text-xs text-mid-grey">
              {tr(t.pomodoro.focus, lang)}: {fmtDuration(Math.round(seconds / 60), lang)}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="mx-auto mt-12 flex flex-col items-center gap-3">
          {run === "idle" && (
            <button
              onClick={onStart}
              className="h-[60px] w-[200px] rounded-lg bg-teal text-base font-bold text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
            >
              {tr(t.timer.startSession, lang)}
            </button>
          )}
          {run === "running" && (
            <div className="flex items-center gap-4">
              <button
                onClick={onPause}
                className="h-14 w-32 rounded-lg border-2 border-teal text-cta text-teal hover:bg-teal/5"
              >
                {tr(t.timer.pause, lang)}
              </button>
              <button onClick={onEnd} className="h-14 w-32 rounded-lg bg-near-black text-cta text-white hover:opacity-90">
                {tr(t.timer.end, lang)}
              </button>
            </div>
          )}
          {run === "paused" && (
            <div className="flex items-center gap-4">
              <button
                onClick={onResume}
                className="h-14 w-32 rounded-lg bg-teal text-cta text-white hover:opacity-90"
              >
                {tr(t.timer.resume, lang)}
              </button>
              <button onClick={onEnd} className="h-14 w-32 rounded-lg bg-near-black text-cta text-white hover:opacity-90">
                {tr(t.timer.end, lang)}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Today's log */}
      <aside className="surface-card h-fit p-5">
        <div className="text-label">{tr(t.pomodoro.todayLog, lang)}</div>
        <div className="mt-2 text-lg font-bold text-teal">
          {tr(t.pomodoro.todayTotal, lang)}: {fmtDuration(todayTotal, lang)}
        </div>
        {log.length === 0 ? (
          <p className="mt-4 text-sm text-mid-grey">{tr(t.pomodoro.emptyLog, lang)}</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {log.map((r) => {
              const s = subjects.find((x) => x.id === r.subject_id);
              return (
                <li key={r.id} className="flex items-center gap-2 text-sm">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: s?.color ?? "var(--color-mid-grey)" }}
                  />
                  <span className="text-near-black">{subjName(s) || tr(t.pomodoro.freeSession, lang)}</span>
                  <span className="ms-auto tabular-nums text-mid-grey">{fmtDuration(r.duration_minutes, lang)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* Post-session modal */}
      <Dialog open={showModal} onOpenChange={() => {}}>
        <DialogContent
          className="max-h-[90vh] max-w-md overflow-y-auto [&>button]:hidden"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{tr(t.session.done, lang)}</DialogTitle>
          </DialogHeader>
          <div className="text-4xl font-extrabold tabular-nums text-near-black">
            {fmtClock(Math.floor(finalMs / 1000))}
          </div>
          <div className="text-sm text-mid-grey">
            {tr(t.schedule[blockType], lang)}
            {subject ? ` — ${subjName(subject)}` : ""}
          </div>

          <div className="mt-2 space-y-4">
            <Rating label={tr(t.session.q1, lang)} value={focusScore} onChange={setFocusScore} />
            <Rating label={tr(t.session.q2, lang)} value={compScore} onChange={setCompScore} />
            <Rating label={tr(t.session.q3, lang)} value={fatigueScore} onChange={setFatigueScore} />
            <div>
              <label className="mb-2 block text-xs font-semibold text-mid-grey">{tr(t.session.topic, lang)}</label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={tr(t.session.topicPlaceholder, lang)}
                className="block h-11 w-full rounded-lg border border-light-grey bg-white px-3 text-sm"
              />
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={tr(t.session.note, lang)}
              className="block h-20 w-full rounded-lg border border-light-grey bg-white p-3 text-sm"
            />
          </div>

          <DialogFooter className="mt-2 flex-col gap-2 sm:flex-col">
            <button
              onClick={onSave}
              disabled={saving}
              className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-teal text-cta text-white disabled:opacity-60"
            >
              {tr(t.session.save, lang)}
            </button>
            <button onClick={reset} className="w-full text-center text-sm text-mid-grey hover:text-near-black">
              {tr(t.session.discard, lang)}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pomodoro settings */}
      <Dialog open={showPomoSettings} onOpenChange={setShowPomoSettings}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{tr(t.pomodoro.settings, lang)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <NumField label={tr(t.pomodoro.focusMin, lang)} value={pf} onChange={setPf} />
            <NumField label={tr(t.pomodoro.shortMin, lang)} value={ps} onChange={setPs} />
            <NumField label={tr(t.pomodoro.longMin, lang)} value={pl} onChange={setPl} />
            <NumField label={tr(t.pomodoro.roundsField, lang)} value={pr} onChange={setPr} max={10} />
          </div>
          <DialogFooter>
            <button
              onClick={savePomo}
              className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-teal text-cta text-white"
            >
              {tr(t.common.save, lang)}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Rating({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold text-mid-grey">{label}</div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`h-10 flex-1 rounded-lg border text-sm font-semibold transition-colors ${
              value >= n ? "border-gold bg-gold/15 text-amber-700" : "border-light-grey text-mid-grey"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  max = 120,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-mid-grey">{label}</span>
      <input
        type="number"
        min={1}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.min(max, Math.max(1, Number(e.target.value))))}
        className="block h-11 w-full rounded-lg border border-light-grey bg-white px-3 text-sm"
      />
    </label>
  );
}

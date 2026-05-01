import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, BookOpen, GraduationCap, FileText } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { useLang } from "@/i18n/LangProvider";
import { tr, t } from "@/i18n/strings";
import { ProLockOverlay } from "@/components/brand/ProLockOverlay";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/app/schedule")({ component: SchedulePage });

const DAYS_AR = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
const DAYS_EN = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 7 AM - 10 PM
type Kind = "lecture" | "study" | "homework";

type Block = {
  id: string;
  user_id: string;
  subject_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  kind: Kind;
  title: string | null;
};

type Subject = {
  id: string;
  name: string;
  name_ar: string | null;
  color: string;
};

const KIND_META: Record<Kind, { icon: typeof BookOpen; bg: string; ring: string; tint: string }> = {
  lecture: { icon: GraduationCap, bg: "bg-teal", ring: "ring-teal", tint: "bg-teal/10 text-teal" },
  study: { icon: BookOpen, bg: "bg-gold", ring: "ring-gold", tint: "bg-gold/15 text-amber-700" },
  homework: { icon: FileText, bg: "bg-rose-500", ring: "ring-rose-500", tint: "bg-rose-500/10 text-rose-600" },
};

function SchedulePage() {
  const { user, profile } = useAuth();
  const { lang } = useLang();

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Block> | null>(null);

  const reload = async () => {
    if (!user) return;
    const [{ data: b }, { data: s }] = await Promise.all([
      supabase.from("schedule").select("*").eq("user_id", user.id),
      supabase.from("subjects").select("id,name,name_ar,color").eq("user_id", user.id).order("position"),
    ]);
    setBlocks((b as Block[]) ?? []);
    setSubjects((s as Subject[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (user) reload();
  }, [user]);

  const subjectMap = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s])), [subjects]);
  const days = lang === "ar" ? DAYS_AR : DAYS_EN;

  const openNew = (day?: number, hour?: number) => {
    setEditing({
      day_of_week: day ?? 0,
      start_time: hour != null ? `${String(hour).padStart(2, "0")}:00` : "09:00",
      end_time: hour != null ? `${String(hour + 1).padStart(2, "0")}:00` : "10:00",
      kind: "lecture",
      subject_id: null,
      title: "",
    });
  };

  const handleSave = async () => {
    if (!user || !editing) return;
    if (!editing.start_time || !editing.end_time || editing.end_time <= editing.start_time) {
      toast.error(tr(t.schedule.invalidTime, lang));
      return;
    }
    const payload = {
      user_id: user.id,
      day_of_week: editing.day_of_week ?? 0,
      start_time: editing.start_time,
      end_time: editing.end_time,
      kind: (editing.kind as Kind) ?? "study",
      subject_id: editing.subject_id || null,
      title: editing.title?.trim() || null,
    };
    const { error } = editing.id
      ? await supabase.from("schedule").update(payload).eq("id", editing.id)
      : await supabase.from("schedule").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(tr(t.schedule.saved, lang));
    setEditing(null);
    reload();
  };

  const handleDelete = async () => {
    if (!editing?.id) return;
    const { error } = await supabase.from("schedule").delete().eq("id", editing.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(tr(t.schedule.deleted, lang));
    setEditing(null);
    reload();
  };

  const Grid = (
    <div className="surface-card overflow-x-auto p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        {(["lecture", "study", "homework"] as Kind[]).map((k) => (
          <span key={k} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${KIND_META[k].tint}`}>
            <span className={`h-2 w-2 rounded-full ${KIND_META[k].bg}`} />
            {tr(t.schedule[k], lang)}
          </span>
        ))}
      </div>
      <div
        className="relative grid min-w-[760px] gap-1 text-xs"
        style={{ gridTemplateColumns: "60px repeat(7, minmax(0, 1fr))" }}
      >
        <div />
        {days.map((d) => (
          <div key={d} className="px-1 py-1 text-center font-semibold text-near-black">
            {d}
          </div>
        ))}

        {HOURS.map((hour) => (
          <Row
            key={hour}
            hour={hour}
            blocks={blocks.filter((b) => Number(b.start_time.slice(0, 2)) === hour)}
            subjectMap={subjectMap}
            lang={lang}
            onCellClick={(day) => openNew(day, hour)}
            onBlockClick={(b) => setEditing(b)}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-near-black md:text-3xl">{tr(t.schedule.title, lang)}</h1>
          <p className="mt-1 text-sm text-mid-grey">
            {lang === "ar" ? "محاضرات، مذاكرة، وواجبات." : "Lectures, study, and homework."}
          </p>
        </div>
        {profile?.is_pro && (
          <button
            onClick={() => openNew()}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-teal px-4 text-cta text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> {tr(t.schedule.addBlock, lang)}
          </button>
        )}
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="surface-card flex h-40 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal/30 border-t-teal" />
          </div>
        ) : profile?.is_pro ? (
          Grid
        ) : (
          <ProLockOverlay message={tr(t.pro.schedulePrompt, lang)}>{Grid}</ProLockOverlay>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? tr(t.schedule.editBlock, lang) : tr(t.schedule.newBlock, lang)}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Kind */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-mid-grey">{tr(t.schedule.kind, lang)}</label>
              <div className="grid grid-cols-3 gap-2">
                {(["lecture", "study", "homework"] as Kind[]).map((k) => {
                  const Icon = KIND_META[k].icon;
                  const active = editing?.kind === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setEditing((e) => ({ ...e!, kind: k }))}
                      className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-xs font-medium transition-colors ${
                        active
                          ? `border-teal ${KIND_META[k].tint}`
                          : "border-light-grey text-mid-grey hover:border-mid-grey"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {tr(t.schedule[k], lang)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Day */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-mid-grey">{tr(t.schedule.day, lang)}</label>
              <select
                value={editing?.day_of_week ?? 0}
                onChange={(e) => setEditing((s) => ({ ...s!, day_of_week: Number(e.target.value) }))}
                className="w-full rounded-lg border border-light-grey bg-white px-3 py-2 text-sm"
              >
                {(lang === "ar" ? DAYS_AR : ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]).map(
                  (d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ),
                )}
              </select>
            </div>

            {/* Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-xs font-semibold text-mid-grey">{tr(t.schedule.start, lang)}</label>
                <input
                  type="time"
                  value={editing?.start_time?.slice(0, 5) ?? ""}
                  onChange={(e) => setEditing((s) => ({ ...s!, start_time: e.target.value }))}
                  className="w-full rounded-lg border border-light-grey bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-mid-grey">{tr(t.schedule.end, lang)}</label>
                <input
                  type="time"
                  value={editing?.end_time?.slice(0, 5) ?? ""}
                  onChange={(e) => setEditing((s) => ({ ...s!, end_time: e.target.value }))}
                  className="w-full rounded-lg border border-light-grey bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-mid-grey">{tr(t.schedule.subject, lang)}</label>
              <select
                value={editing?.subject_id ?? ""}
                onChange={(e) => setEditing((s) => ({ ...s!, subject_id: e.target.value || null }))}
                className="w-full rounded-lg border border-light-grey bg-white px-3 py-2 text-sm"
              >
                <option value="">—</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {lang === "ar" && s.name_ar ? s.name_ar : s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-mid-grey">{tr(t.schedule.titleField, lang)}</label>
              <input
                type="text"
                value={editing?.title ?? ""}
                placeholder={tr(t.schedule.titlePlaceholder, lang)}
                onChange={(e) => setEditing((s) => ({ ...s!, title: e.target.value }))}
                className="w-full rounded-lg border border-light-grey bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>

          <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
            {editing?.id ? (
              <button
                onClick={handleDelete}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-rose-200 px-3 text-sm font-medium text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="h-4 w-4" />
                {tr(t.schedule.delete, lang)}
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(null)}
                className="inline-flex h-10 items-center rounded-lg border border-light-grey px-4 text-sm font-medium text-mid-grey hover:bg-off-white"
              >
                {tr(t.common.cancel, lang)}
              </button>
              <button
                onClick={handleSave}
                className="inline-flex h-10 items-center rounded-lg bg-teal px-4 text-sm font-semibold text-white hover:opacity-90"
              >
                {tr(t.schedule.save, lang)}
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({
  hour,
  blocks,
  subjectMap,
  lang,
  onCellClick,
  onBlockClick,
}: {
  hour: number;
  blocks: Block[];
  subjectMap: Record<string, Subject>;
  lang: "ar" | "en";
  onCellClick: (day: number) => void;
  onBlockClick: (b: Block) => void;
}) {
  return (
    <>
      <div className="border-t border-light-grey px-2 py-2 text-mid-grey">
        {String(hour).padStart(2, "0")}:00
      </div>
      {Array.from({ length: 7 }).map((_, day) => {
        const block = blocks.find((b) => b.day_of_week === day);
        if (block) {
          const meta = KIND_META[block.kind];
          const subj = block.subject_id ? subjectMap[block.subject_id] : null;
          const label =
            block.title ||
            (subj ? (lang === "ar" && subj.name_ar ? subj.name_ar : subj.name) : tr(t.schedule[block.kind], lang));
          return (
            <button
              key={day}
              onClick={() => onBlockClick(block)}
              className={`group h-12 rounded-md ${meta.bg} px-1.5 py-1 text-start text-[10px] leading-tight text-white transition-transform hover:scale-[1.02]`}
              style={subj ? { backgroundColor: subj.color } : undefined}
            >
              <div className="truncate font-semibold">{label}</div>
              <div className="truncate opacity-80">
                {block.start_time.slice(0, 5)}–{block.end_time.slice(0, 5)}
              </div>
            </button>
          );
        }
        return (
          <button
            key={day}
            onClick={() => onCellClick(day)}
            className="h-12 rounded-md border border-dashed border-transparent transition-colors hover:border-teal/40 hover:bg-teal/5"
          />
        );
      })}
    </>
  );
}

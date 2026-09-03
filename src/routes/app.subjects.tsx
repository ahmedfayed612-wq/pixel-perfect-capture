import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Lock } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LangProvider";
import { tr, t } from "@/i18n/strings";
import { SUBJECT_COLORS } from "@/lib/waqti";
import { toast } from "sonner";

export const Route = createFileRoute("/app/subjects")({ component: SubjectsPage });

type Subject = {
  id: string;
  name: string;
  name_ar: string | null;
  color: string;
  weekly_goal_hours: number;
  position: number;
};

function SubjectsPage() {
  const { user, profile, isPro } = useAuth();
  const { lang } = useLang();
  const [list, setList] = useState<Subject[]>([]);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [showCap, setShowCap] = useState(false);
  const [drawer, setDrawer] = useState(false);

  const reload = async () => {
    const { data } = await supabase
      .from("subjects")
      .select("*")
      .order("position", { ascending: true });
    setList((data as Subject[]) ?? []);
  };

  useEffect(() => {
    reload();
  }, []);

  const onAdd = () => {
    if (!isPro && list.length >= 3) {
      setShowCap(true);
      return;
    }
    setEditing(null);
    setDrawer(true);
  };

  const onEdit = (s: Subject) => {
    setEditing(s);
    setDrawer(true);
  };

  const onDelete = async (s: Subject) => {
    if (!confirm(`${s.name}?`)) return;
    const { error } = await supabase.from("subjects").delete().eq("id", s.id);
    if (error) toast.error(error.message);
    else {
      toast.success("✓");
      reload();
    }
  };

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-near-black md:text-3xl">{tr(t.subjects.title, lang)}</h1>
        <button
          onClick={onAdd}
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-teal px-4 text-cta text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> {tr(t.subjects.add, lang)}
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {list.length === 0 && (
          <div className="surface-card p-8 text-center text-sm text-mid-grey">
            {tr(t.dashboard.addFirstSubject, lang)}
          </div>
        )}
        {list.map((s, i) => {
          const locked = !isPro && i >= 3;
          return (
            <div
              key={s.id}
              className="surface-card flex items-center gap-4 p-4"
              style={{ borderInlineStartWidth: 4, borderInlineStartColor: s.color, opacity: locked ? 0.5 : 1 }}
            >
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-base font-semibold text-near-black">{s.name}</h3>
                  {locked && <Lock className="h-3 w-3 text-mid-grey" />}
                </div>
                <p className="text-xs text-mid-grey">
                  {tr(t.subjects.weekly, lang)}: {s.weekly_goal_hours}
                </p>
              </div>
              <button onClick={() => onEdit(s)} className="rounded-md p-2 text-mid-grey hover:bg-off-white">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => onDelete(s)} className="rounded-md p-2 text-mid-grey hover:bg-off-white hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {drawer && (
        <SubjectDrawer
          editing={editing}
          onClose={() => setDrawer(false)}
          onSaved={() => {
            setDrawer(false);
            reload();
          }}
          userId={user!.id}
          nextPosition={list.length}
        />
      )}

      {showCap && <UpgradeCapModal onClose={() => setShowCap(false)} />}
    </div>
  );
}

function SubjectDrawer({
  editing,
  onClose,
  onSaved,
  userId,
  nextPosition,
}: {
  editing: Subject | null;
  onClose: () => void;
  onSaved: () => void;
  userId: string;
  nextPosition: number;
}) {
  const { lang } = useLang();
  const [name, setName] = useState(editing?.name ?? "");
  const [nameAr, setNameAr] = useState(editing?.name_ar ?? "");
  const [color, setColor] = useState(editing?.color ?? SUBJECT_COLORS[4]);
  const [weekly, setWeekly] = useState(editing?.weekly_goal_hours ?? 0);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const payload = {
      name: name.trim(),
      name_ar: nameAr.trim() || null,
      color,
      weekly_goal_hours: weekly,
    };
    const { error } = editing
      ? await supabase.from("subjects").update(payload).eq("id", editing.id)
      : await supabase.from("subjects").insert({ ...payload, user_id: userId, position: nextPosition });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("✓");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-near-black/40 md:items-stretch md:justify-end">
      <div className="surface-card max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl p-6 md:max-h-screen md:rounded-none md:rounded-s-2xl">
        <h2 className="text-xl font-semibold text-near-black">
          {editing ? tr(t.subjects.edit, lang) : tr(t.subjects.new, lang)}
        </h2>
        <div className="mt-5 space-y-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={tr(t.onboarding.subjectName, lang)}
            className="block h-12 w-full rounded-lg border border-light-grey bg-white px-4 text-sm focus:border-teal focus:ring-2 focus:ring-teal/20"
          />
          <input
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            placeholder={tr(t.subjects.nameAr, lang)}
            className="block h-12 w-full rounded-lg border border-light-grey bg-white px-4 text-sm focus:border-teal focus:ring-2 focus:ring-teal/20"
          />
          <div>
            <span className="mb-2 block text-sm font-medium text-near-black">{tr(t.onboarding.chooseColor, lang)}</span>
            <div className="flex flex-wrap gap-3">
              {SUBJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-9 w-9 rounded-full border-2 ${color === c ? "scale-110 border-near-black" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-near-black">{tr(t.subjects.weekly, lang)}</label>
            <input
              type="number"
              min={0}
              max={80}
              value={weekly}
              onChange={(e) => setWeekly(Number(e.target.value))}
              className="block h-12 w-32 rounded-lg border border-light-grey bg-white px-4 text-sm"
            />
          </div>
        </div>
        <button
          onClick={save}
          disabled={busy || !name.trim()}
          className="mt-6 inline-flex h-[52px] w-full items-center justify-center rounded-lg bg-teal text-cta text-white disabled:opacity-60"
        >
          {tr(t.subjects.save, lang)}
        </button>
        <button onClick={onClose} className="mt-3 block w-full text-center text-sm text-mid-grey">
          {tr(t.common.cancel, lang)}
        </button>
      </div>
    </div>
  );
}

function UpgradeCapModal({ onClose }: { onClose: () => void }) {
  const { lang } = useLang();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-near-black/40 px-4">
      <div className="surface-card w-full max-w-sm p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-off-white">
          <Lock className="h-7 w-7 text-teal" />
        </div>
        <h3 className="mt-5 text-base font-semibold text-near-black">{tr(t.subjects.capTitle, lang)}</h3>
        <p className="mt-2 text-sm text-mid-grey">{tr(t.subjects.upgradePrompt, lang)}</p>
        <Link
          to="/app/upgrade"
          onClick={onClose}
          className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-lg bg-teal text-cta text-white"
        >
          {tr(t.subjects.upgradeNow, lang)}
        </Link>
        <button onClick={onClose} className="mt-3 block w-full text-sm text-mid-grey hover:text-near-black">
          {tr(t.subjects.later, lang)}
        </button>
      </div>
    </div>
  );
}

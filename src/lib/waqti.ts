// 10 preset colors from spec for subjects
export const SUBJECT_COLORS = [
  "#EF4444", // red
  "#F97316", // orange
  "#EAB308", // yellow
  "#22C55E", // green
  "#0D7377", // teal
  "#3B82F6", // blue
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#6B7280", // grey
  "#1A1A2E", // dark
];

export function fmtDuration(minutes: number, lang: "ar" | "en") {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (lang === "ar") {
    if (h && m) return `${h} س ${m} د`;
    if (h) return `${h} ساعة`;
    return `${m} دقيقة`;
  }
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function fmtClock(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

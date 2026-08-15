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

export type BlockType = "lecture" | "study" | "homework";

// Fixed system colors per block type (independent of subject colors)
export const BLOCK_COLORS: Record<BlockType, string> = {
  lecture: "#0D7377",
  study: "#F4A261",
  homework: "#E11D48",
};

export function fmtDuration(minutes: number, lang: "ar" | "en") {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (lang === "ar") {
    if (h && m) return `${h}س ${m}د`;
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

export function fmtMMSS(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function toISO(d: Date) {
  const c = new Date(d);
  c.setMinutes(c.getMinutes() - c.getTimezoneOffset());
  return c.toISOString().slice(0, 10);
}

export function todayISO() {
  return toISO(new Date());
}

// Egyptian week starts Saturday. Returns ISO date of this week's Saturday.
export function weekStartISO(from = new Date()) {
  const d = new Date(from);
  const diff = (d.getDay() + 1) % 7; // Sat=0
  d.setDate(d.getDate() - diff);
  return toISO(d);
}

// JS Date.getDay(): Sun=0..Sat=6 → app convention Sat=0, Sun=1, ... Fri=6
export const todayDow = () => (new Date().getDay() + 1) % 7;

export const DAYS_AR = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
export const DAYS_EN = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
export const DAYS_EN_FULL = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// Subject suggestions by education level
export const SUBJECT_SUGGESTIONS = {
  highschool: ["رياضيات", "فيزياء", "كيمياء", "أحياء", "عربي", "إنجليزي", "تاريخ", "جغرافيا"],
  university: ["Calculus", "Physics", "Programming", "Statistics", "English", "Economics"],
};

// Daily rotating Arabic motivational quotes
export const QUOTES: { ar: string; en: string }[] = [
  { ar: "الساعة اللي بتذاكرها النهارده هي المقعد بتاعك في الكلية.", en: "The hour you study today is your seat in college." },
  { ar: "مش لازم تكون الأذكى. لازم تكون الأثبت.", en: "You don't need to be the smartest. Just the most consistent." },
  { ar: "التعب النهارده راحة بكرة.", en: "Today's effort is tomorrow's ease." },
  { ar: "كل جلسة مذاكرة خطوة على السلم.", en: "Every session is one step up the ladder." },
  { ar: "المذاكرة القليلة كل يوم أحسن من الكتير مرة واحدة.", en: "A little every day beats a lot once." },
  { ar: "ابدأ وأنت مش جاهز — الجاهزية بتيجي بعد البداية.", en: "Start before you feel ready. Readiness follows." },
  { ar: "حلمك مستني منك ساعة النهارده بس.", en: "Your dream is waiting on just one hour today." },
];

export function quoteOfDay() {
  const day = Math.floor(Date.now() / 86_400_000);
  return QUOTES[day % QUOTES.length];
}

// ---- Exam readiness ----
export type ReadinessInput = {
  hoursThisWeek: number;
  weeklyGoalHours: number;
  avgComprehension: number | null;
  avgFocus: number | null;
  daysWithSessionLast7: number;
  avgFatigue: number | null;
};

export type ReadinessResult = {
  score: number;
  components: { key: "hours" | "comprehension" | "focus" | "consistency" | "fatigue"; value: number; max: number }[];
  weakest: "hours" | "comprehension" | "focus" | "consistency" | "fatigue";
  hoursGap: number;
};

export function readinessScore(i: ReadinessInput): ReadinessResult {
  const goal = i.weeklyGoalHours > 0 ? i.weeklyGoalHours : 1;
  const hours = Math.min(30, (i.hoursThisWeek / goal) * 30);
  const comprehension = ((i.avgComprehension ?? 0) / 5) * 25;
  const focus = ((i.avgFocus ?? 0) / 5) * 20;
  const consistency = (Math.min(7, i.daysWithSessionLast7) / 7) * 15;
  const fatigue = ((5 - (i.avgFatigue ?? 5)) / 5) * 10;

  const components = [
    { key: "hours" as const, value: hours, max: 30 },
    { key: "comprehension" as const, value: comprehension, max: 25 },
    { key: "focus" as const, value: focus, max: 20 },
    { key: "consistency" as const, value: consistency, max: 15 },
    { key: "fatigue" as const, value: fatigue, max: 10 },
  ];
  const weakest = components.reduce((a, b) => (b.value / b.max < a.value / a.max ? b : a)).key;
  const score = Math.round(components.reduce((a, c) => a + c.value, 0));
  const hoursGap = Math.max(0, Math.ceil(goal * 0.7 - i.hoursThisWeek));
  return { score, components, weakest, hoursGap };
}

export function readinessLabel(score: number) {
  if (score <= 40) return { ar: "🔴 محتاج تشتغل أكتر", en: "🔴 Needs more work", color: "#EF4444" };
  if (score <= 65) return { ar: "🟡 في الطريق الصح", en: "🟡 On the right track", color: "#EAB308" };
  if (score <= 85) return { ar: "🟢 مستعد بشكل كويس", en: "🟢 Well prepared", color: "#22C55E" };
  return { ar: "💪 جاهز للامتحان", en: "💪 Exam ready", color: "#0D7377" };
}

export const BADGE_MILESTONES = [
  { days: 7, emoji: "🔥" },
  { days: 14, emoji: "⚡" },
  { days: 30, emoji: "💎" },
  { days: 60, emoji: "🏆" },
  { days: 100, emoji: "👑" },
  { days: 365, emoji: "🌟" },
];

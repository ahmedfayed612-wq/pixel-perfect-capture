import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/auth/AuthProvider";
import { useLang } from "@/i18n/LangProvider";
import { tr, t } from "@/i18n/strings";
import { ProLockOverlay } from "@/components/brand/ProLockOverlay";

export const Route = createFileRoute("/app/schedule")({ component: SchedulePage });

const DAYS_AR = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
const DAYS_EN = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function SchedulePage() {
  const { profile } = useAuth();
  const { lang } = useLang();
  const days = lang === "ar" ? DAYS_AR : DAYS_EN;

  const Grid = (
    <div className="surface-card overflow-x-auto p-4">
      <div className="grid min-w-[640px] grid-cols-8 gap-1 text-xs">
        <div />
        {days.map((d) => (
          <div key={d} className="px-2 py-1 text-center font-semibold text-near-black">
            {d}
          </div>
        ))}
        {Array.from({ length: 12 }).map((_, hour) => (
          <Row key={hour} hour={hour + 8} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <h1 className="text-2xl font-bold text-near-black md:text-3xl">{tr(t.nav.schedule, lang)}</h1>
      <p className="mt-2 text-sm text-mid-grey">
        {lang === "ar" ? "الجدول الأسبوعي" : "Weekly Schedule"}
      </p>
      <div className="mt-6">
        {profile?.is_pro ? Grid : <ProLockOverlay message={tr(t.pro.schedulePrompt, lang)}>{Grid}</ProLockOverlay>}
      </div>
    </div>
  );
}

function Row({ hour }: { hour: number }) {
  return (
    <>
      <div className="border-t border-light-grey px-2 py-2 text-mid-grey">
        {String(hour).padStart(2, "0")}:00
      </div>
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="h-10 border-t border-light-grey" />
      ))}
    </>
  );
}

import { useLang } from "@/i18n/LangProvider";

type Props = { size?: "sm" | "md" | "lg"; withTagline?: boolean; onDark?: boolean };

export function Logo({ size = "md", withTagline = false, onDark = false }: Props) {
  const { lang } = useLang();
  const wordSize = size === "sm" ? "text-xl" : size === "md" ? "text-2xl" : "text-4xl";
  const arSize = size === "sm" ? "text-lg" : size === "md" ? "text-xl" : "text-3xl";

  return (
    <div className="inline-flex items-center gap-2">
      <ClockMark className={size === "lg" ? "h-9 w-9" : size === "md" ? "h-7 w-7" : "h-6 w-6"} />
      <div className="flex flex-col leading-none">
        <div className="flex items-baseline gap-2">
          <span className={`${wordSize} font-extrabold tracking-tight ${onDark ? "text-off-white" : "text-teal"}`}>
            WAQTI
          </span>
          <span className={`${arSize} font-bold text-gold`} style={{ fontFamily: "Cairo, sans-serif" }}>
            وقتي
          </span>
        </div>
        {withTagline && (
          <span className={`mt-1 text-tagline ${onDark ? "text-off-white/70" : "text-mid-grey"}`}>
            {lang === "ar" ? "وقتك. أهدافك. نجاحك." : "YOUR TIME. YOUR GOALS. YOUR SUCCESS."}
          </span>
        )}
      </div>
    </div>
  );
}

function ClockMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--color-teal)" />
      <circle cx="16" cy="16" r="9" stroke="white" strokeWidth="1.75" fill="none" />
      <path d="M16 10 V16 L20 18.5" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

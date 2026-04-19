import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import { LangToggle } from "@/components/brand/LangToggle";
import { useLang } from "@/i18n/LangProvider";
import { tr, t } from "@/i18n/strings";

export function PublicNavbar() {
  const { lang } = useLang();
  return (
    <header className="sticky top-0 z-40 border-b border-light-grey bg-white">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 md:px-8">
        <Link to="/"><Logo size="sm" /></Link>
        <div className="flex items-center gap-2 md:gap-4">
          <LangToggle />
          <Link
            to="/login"
            className="hidden text-sm font-semibold text-near-black hover:text-teal md:inline"
          >
            {tr(t.nav.login, lang)}
          </Link>
          <Link
            to="/signup"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-teal px-4 text-cta text-white transition-opacity hover:opacity-90"
          >
            {tr(t.nav.startFree, lang)}
          </Link>
        </div>
      </div>
    </header>
  );
}

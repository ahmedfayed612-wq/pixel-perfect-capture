import { Link } from "@tanstack/react-router";
import { useLang } from "@/i18n/LangProvider";
import { tr, t } from "@/i18n/strings";
import { Logo } from "@/components/brand/Logo";
import { LangToggle } from "@/components/brand/LangToggle";

export function PublicFooter() {
  const { lang } = useLang();
  return (
    <footer className="bg-near-black px-5 py-12 md:px-8">
      <div className="mx-auto grid max-w-[1200px] gap-8 md:grid-cols-3">
        <div>
          <Logo size="md" onDark />
          <p className="mt-3 text-tagline text-gold">{tr(t.brand.ar === "وقتي" ? t.tagline : t.tagline, lang)}</p>
        </div>
        <nav className="flex flex-col gap-2 text-sm text-off-white/80 md:items-center">
          <Link to="/" className="hover:text-off-white">{tr(t.nav.home, lang)}</Link>
          <a href="#pricing" className="hover:text-off-white">{tr(t.nav.pricing, lang)}</a>
          <Link to="/refund" className="hover:text-off-white">{tr(t.refund.nav, lang)}</Link>
          <a
            href="https://wa.me/201020943875"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-off-white"
          >
            {tr(t.contact.whatsapp, lang)}
          </a>
          <Link to="/login" className="hover:text-off-white">{tr(t.nav.login, lang)}</Link>
          <Link to="/signup" className="hover:text-off-white">{tr(t.nav.signup, lang)}</Link>
        </nav>
        <div className="flex md:justify-end">
          <LangToggle onDark />
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-[1200px] border-t border-white/10 pt-6 text-xs text-mid-grey">
        {tr(t.footer.copy, lang)}
      </div>
    </footer>
  );
}

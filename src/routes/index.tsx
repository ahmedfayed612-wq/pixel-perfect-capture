import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, Globe, CreditCard, Timer, Calendar, BarChart3, Flame, Check, X, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { PublicNavbar } from "@/components/public/PublicNavbar";
import { PublicFooter } from "@/components/public/PublicFooter";
import { useLang } from "@/i18n/LangProvider";
import { tr, t } from "@/i18n/strings";
import { Logo } from "@/components/brand/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Waqti — وقتي | Study tracker for Egyptian students" },
      {
        name: "description",
        content:
          "Egypt's first study tracker built for Egyptian students. Arabic. Affordable. Yours. Track sessions, build streaks, hit your goals.",
      },
      { property: "og:title", content: "Waqti — وقتي" },
      {
        property: "og:description",
        content: "Your time. Your goals. Your success. Built for Egyptian students.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { lang } = useLang();
  return (
    <div className="min-h-screen bg-off-white">
      <PublicNavbar />
      <Hero />
      <Problem />
      <Features />
      <Pricing />
      <Charity />
      <Trust />
      <PublicFooter />
    </div>
  );
}

function Hero() {
  const { lang } = useLang();
  return (
    <section className="bg-off-white px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto grid max-w-[1200px] items-center gap-12 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-6"><Logo size="lg" withTagline /></div>
          <h1 className="text-4xl font-bold leading-[1.15] text-near-black md:text-5xl">
            {tr(t.hero.h1, lang)}
          </h1>
          <p className="mt-5 max-w-lg text-base leading-[1.7] text-dark-grey">
            {tr(t.hero.sub, lang)}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/signup"
              className="inline-flex h-[52px] items-center justify-center rounded-lg bg-teal px-8 text-cta text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
            >
              {tr(t.hero.primary, lang)}
            </Link>
            <a
              href="#pricing"
              className="inline-flex h-[52px] items-center justify-center rounded-lg border-2 border-teal px-8 text-cta text-teal transition-colors hover:bg-teal/5"
            >
              {tr(t.hero.secondary, lang)}
            </a>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex justify-center md:justify-end"
        >
          <TimerMockup />
        </motion.div>
      </div>
    </section>
  );
}

function TimerMockup() {
  const { lang } = useLang();
  return (
    <div className="surface-card flex w-full max-w-md flex-col items-center gap-6 px-8 py-12 shadow-sm">
      <div className="text-tagline text-mid-grey">
        {lang === "ar" ? "مادة" : "SUBJECT"}
      </div>
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-teal" />
        <span className="text-base font-medium text-near-black">
          {lang === "ar" ? "الرياضيات" : "Mathematics"}
        </span>
      </div>
      <div className="text-display tabular-nums text-near-black" style={{ fontSize: "72px", lineHeight: "1" }}>
        02:34:18
      </div>
      <div className="h-1 w-32 rounded-full bg-teal/20">
        <div className="h-1 w-2/3 rounded-full bg-teal" />
      </div>
      <button className="mt-2 inline-flex h-12 w-48 items-center justify-center rounded-lg bg-teal text-cta text-white">
        {tr(t.timer.pause, lang)}
      </button>
    </div>
  );
}

function Problem() {
  const { lang } = useLang();
  const icons = [Eye, Globe, CreditCard];
  return (
    <section className="bg-white px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1200px]">
        <div className="text-label text-teal">{tr(t.problem.label, lang)}</div>
        <h2 className="mt-3 max-w-3xl text-2xl font-semibold leading-snug text-near-black md:text-3xl">
          {tr(t.problem.h2, lang)}
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {t.problem.cards.map((card, i) => {
            const Icon = icons[i];
            return (
              <div key={i} className="surface-card surface-card-hover overflow-hidden p-6">
                <div className="-mx-6 -mt-6 mb-5 h-1 bg-teal" />
                <Icon className="h-8 w-8 text-teal" strokeWidth={1.5} />
                <h3 className="mt-4 text-lg font-semibold text-near-black">{tr(card.title, lang)}</h3>
                <p className="mt-2 text-sm leading-[1.7] text-dark-grey">{tr(card.body, lang)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const { lang } = useLang();
  const icons = { Timer, Calendar, BarChart3, Flame } as const;
  return (
    <section className="bg-off-white px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1200px]">
        <div className="text-label text-teal">{tr(t.features.label, lang)}</div>
        <h2 className="mt-3 text-2xl font-semibold text-near-black md:text-3xl">{tr(t.features.h2, lang)}</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {t.features.cards.map((c, i) => {
            const Icon = icons[c.icon as keyof typeof icons];
            return (
              <div key={i} className="surface-card surface-card-hover p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal/10">
                    <Icon className="h-6 w-6 text-teal" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-semibold text-near-black">{tr(c.title, lang)}</h3>
                  {c.pro && (
                    <span className="ms-auto rounded-full bg-gold-light px-2 py-1 text-[11px] font-medium text-teal-dark">
                      PRO
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm leading-[1.7] text-dark-grey">{tr(c.body, lang)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const { lang } = useLang();
  return (
    <section id="pricing" className="bg-white px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1200px]">
        <div className="text-label text-teal">{tr(t.pricing.label, lang)}</div>
        <h2 className="mt-3 text-2xl font-semibold text-near-black md:text-3xl">{tr(t.pricing.h2, lang)}</h2>

        <div className="mt-6 rounded-lg border-s-4 border-gold bg-gold-light p-4 text-sm text-near-black">
          {tr(t.pricing.launch, lang)}
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {/* Free */}
          <div className="surface-card flex flex-col p-6">
            <h3 className="text-2xl font-semibold text-near-black">{tr(t.pricing.free.title, lang)}</h3>
            <div className="mt-1 text-sm text-mid-grey">{tr(t.pricing.free.price, lang)}</div>
            <ul className="mt-6 flex-1 space-y-3">
              {t.pricing.free.features.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  {f.on ? (
                    <Check className="h-4 w-4 text-teal" />
                  ) : (
                    <X className="h-4 w-4 text-light-grey" />
                  )}
                  <span className={f.on ? "text-near-black" : "text-mid-grey line-through"}>
                    {tr({ en: f.en, ar: f.ar }, lang)}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              to="/signup"
              className="mt-8 inline-flex h-[52px] items-center justify-center rounded-lg border-2 border-teal text-cta text-teal hover:bg-teal/5"
            >
              {tr(t.pricing.free.cta, lang)}
            </Link>
          </div>

          {/* Pro monthly */}
          <div className="relative flex flex-col rounded-lg bg-teal p-6 text-white">
            <div className="absolute -top-3 start-6 rounded-full bg-gold px-3 py-1 text-[11px] font-bold tracking-wider text-teal-dark">
              {tr(t.pricing.pro.badge, lang)}
            </div>
            <h3 className="text-2xl font-semibold">{tr(t.pricing.pro.title, lang)}</h3>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-sm text-white/60 line-through">{tr(t.pricing.pro.original, lang)}</span>
              <span className="text-lg font-semibold text-gold">{tr(t.pricing.pro.price, lang)}</span>
            </div>
            <div className="mt-1 text-xs text-gold-light">{tr(t.pricing.pro.sub, lang)}</div>
            <ul className="mt-6 flex-1 space-y-3">
              {t.pricing.pro.features.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <Check className="h-4 w-4 text-gold" />
                  <span>{tr(f, lang)}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/signup"
              className="mt-8 inline-flex h-[52px] items-center justify-center rounded-lg bg-white text-cta text-teal hover:bg-off-white"
            >
              {tr(t.pricing.pro.cta, lang)}
            </Link>
          </div>

          {/* 9 months */}
          <div className="surface-card relative flex flex-col border-2 border-gold p-6">
            <div className="absolute -top-3 start-6 rounded-full bg-gold px-3 py-1 text-[11px] font-bold tracking-wider text-teal-dark">
              {tr(t.pricing.nine.badge, lang)}
            </div>
            <h3 className="text-2xl font-semibold text-near-black">{tr(t.pricing.nine.title, lang)}</h3>
            <div className="mt-1 text-lg font-semibold text-teal">{tr(t.pricing.nine.price, lang)}</div>
            <div className="mt-1 text-xs text-mid-grey">{tr(t.pricing.nine.sub, lang)}</div>
            <ul className="mt-6 flex-1 space-y-3">
              {t.pricing.nine.features.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <Check className="h-4 w-4 text-teal" />
                  <span className="text-near-black">{tr(f, lang)}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/signup"
              className="mt-8 inline-flex h-[52px] items-center justify-center rounded-lg bg-teal text-cta text-white hover:opacity-90"
            >
              {tr(t.pricing.nine.cta, lang)}
            </Link>
          </div>
        </div>

        <div className="mt-6 text-sm text-dark-grey">
          <Link to="/refund" className="text-teal underline">
            {tr(t.refund.nav, lang)}
          </Link>
          <span className="mx-2 text-light-grey">·</span>
          <a
            href="https://wa.me/201020943875"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal underline"
          >
            {tr(t.contact.whatsapp, lang)}
          </a>
        </div>
      </div>
    </section>
  );
}


function Charity() {
  const { lang } = useLang();
  return (
    <section className="bg-teal px-5 py-16 text-white md:px-8">
      <div className="mx-auto max-w-[1200px] text-center">
        <Heart className="mx-auto h-8 w-8 text-gold" />
        <div className="mt-4 text-5xl font-extrabold text-gold md:text-6xl">0 EGP</div>
        <p className="mt-3 text-lg">{tr(t.charity.body, lang)}</p>
        <p className="mt-1 text-sm text-white/70">{tr(t.charity.sub, lang)}</p>
        <p className="mt-6 text-tagline text-gold-light">RESALA CHARITY · جمعية رسالة</p>
      </div>
    </section>
  );
}

function Trust() {
  const { lang } = useLang();
  return (
    <section className="bg-off-white px-5 py-16 md:px-8">
      <div className="mx-auto max-w-[1200px]">
        <h2 className="text-2xl font-semibold text-near-black md:text-3xl">{tr(t.trust.h2, lang)}</h2>
        <p className="mt-4 max-w-3xl text-sm leading-[1.7] text-dark-grey">{tr(t.trust.body, lang)}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {t.trust.badges.map((b, i) => (
            <div key={i} className="surface-card flex items-center gap-3 p-4">
              <span className="text-2xl">{["🇪🇬", "💳", "🤝"][i]}</span>
              <span className="text-sm font-medium text-near-black">{tr(b, lang)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, MessageCircle } from "lucide-react";
import { PublicNavbar } from "@/components/public/PublicNavbar";
import { PublicFooter } from "@/components/public/PublicFooter";
import { useLang } from "@/i18n/LangProvider";
import { tr, t } from "@/i18n/strings";

export const WHATSAPP_URL = "https://wa.me/201020943875";

export const Route = createFileRoute("/refund")({
  head: () => ({
    meta: [
      { title: "Refund Policy — Waqti | سياسة الاسترجاع" },
      {
        name: "description",
        content:
          "Waqti offers a 7-day money-back guarantee from the purchase date, no questions asked. Request your refund on WhatsApp.",
      },
      { property: "og:title", content: "Refund Policy — Waqti" },
      {
        property: "og:description",
        content: "7-day money-back guarantee, no questions asked. Request via WhatsApp.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RefundPage,
});

function RefundPage() {
  const { lang } = useLang();
  return (
    <div className="min-h-screen bg-off-white">
      <PublicNavbar />
      <main className="mx-auto max-w-[760px] px-5 py-16 md:px-8 md:py-24">
        <h1 className="text-3xl font-bold text-near-black md:text-4xl">{tr(t.refund.h1, lang)}</h1>

        <div className="surface-card mt-8 flex items-start gap-4 p-6">
          <ShieldCheck className="h-7 w-7 shrink-0 text-teal" strokeWidth={1.5} />
          <p className="text-base font-medium leading-[1.7] text-near-black">
            {tr(t.refund.guarantee, lang)}
          </p>
        </div>

        <div className="mt-8 space-y-5 text-sm leading-[1.8] text-dark-grey">
          <p>{tr(t.refund.body, lang)}</p>
          <p>{tr(t.refund.how, lang)}</p>
          <p>{tr(t.refund.after, lang)}</p>
        </div>

        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-10 inline-flex h-[52px] items-center justify-center gap-2 rounded-lg bg-teal px-8 text-cta text-white transition-opacity hover:opacity-90"
        >
          <MessageCircle className="h-5 w-5" />
          {tr(t.contact.whatsapp, lang)}
        </a>

        <div className="mt-10">
          <Link to="/" className="text-sm text-teal underline">
            {tr(t.nav.home, lang)}
          </Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

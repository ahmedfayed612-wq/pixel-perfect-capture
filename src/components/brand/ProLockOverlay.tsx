import { Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useLang } from "@/i18n/LangProvider";
import { tr, t } from "@/i18n/strings";
import type { ReactNode } from "react";

export function ProLockOverlay({ children, message }: { children: ReactNode; message: string }) {
  const { lang } = useLang();
  return (
    <div className="relative">
      <div className="pro-blur">{children}</div>
      <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
        <div className="surface-card flex max-w-sm flex-col items-center gap-4 px-6 py-8 text-center shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-off-white">
            <Lock className="h-6 w-6 text-teal" />
          </div>
          <p className="text-sm font-medium text-near-black">{message}</p>
          <Link
            to="/app/upgrade"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-teal px-6 text-cta text-white transition-colors hover:opacity-90"
          >
            {tr(t.pro.upgrade, lang)}
          </Link>
        </div>
      </div>
    </div>
  );
}

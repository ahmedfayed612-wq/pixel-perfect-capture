import { Globe } from "lucide-react";
import { useLang } from "@/i18n/LangProvider";
import { Button } from "@/components/ui/button";

export function LangToggle({ onDark = false }: { onDark?: boolean }) {
  const { lang, toggle } = useLang();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      className={`gap-2 rounded-lg ${onDark ? "text-off-white hover:bg-white/10 hover:text-off-white" : "text-near-black hover:bg-off-white"}`}
      aria-label="Toggle language"
    >
      <Globe className="h-4 w-4" />
      <span className="text-cta">{lang === "ar" ? "EN" : "عربي"}</span>
    </Button>
  );
}

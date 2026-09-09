import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLang } from "@/i18n/LangProvider";
import { tr, t } from "@/i18n/strings";

interface WhatsAppPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planCode: string;
  userEmail: string;
  onConfirm: () => void;
}

export function WhatsAppPaymentModal({
  open,
  onOpenChange,
  planCode,
  userEmail,
  onConfirm,
}: WhatsAppPaymentModalProps) {
  const { lang } = useLang();

  const handleWhatsAppRedirect = () => {
    const waNumber = import.meta.env.VITE_WA_BUSINESS_NUMBER || "201020943875";
    const message = `${planCode} - ${userEmail}`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${waNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, "_blank");
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {tr(t.whatsappPayment.modalTitle, lang)}
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal text-white text-xs font-bold">
                1
              </span>
              <span className="text-near-black">{tr(t.whatsappPayment.step1, lang)}</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal text-white text-xs font-bold">
                2
              </span>
              <span className="text-near-black">{tr(t.whatsappPayment.step2, lang)}</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal text-white text-xs font-bold">
                3
              </span>
              <span className="text-near-black">{tr(t.whatsappPayment.step3, lang)}</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal text-white text-xs font-bold">
                4
              </span>
              <span className="text-near-black">{tr(t.whatsappPayment.step4, lang)}</span>
            </li>
          </ol>

          <p className="mt-4 text-xs text-mid-grey">
            {tr(t.whatsappPayment.trustLine, lang)}
          </p>

          <Button
            onClick={handleWhatsAppRedirect}
            className="w-full bg-teal text-white hover:opacity-90"
          >
            {tr(t.whatsappPayment.ctaButton, lang)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
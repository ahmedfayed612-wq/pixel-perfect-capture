import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, Field, PasswordInput, PrimaryButton } from "@/components/auth/AuthShell";
import { useLang } from "@/i18n/LangProvider";
import { tr, t } from "@/i18n/strings";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({ component: ResetPage });

function ResetPage() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("✓");
    navigate({ to: "/app" });
  };

  return (
    <AuthShell title={tr(t.auth.resetTitle, lang)}>
      <form onSubmit={onSubmit} className="space-y-5">
        <Field label={tr(t.auth.password, lang)}>
          <PasswordInput required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <PrimaryButton loading={loading}>{tr(t.auth.submitReset, lang)}</PrimaryButton>
      </form>
    </AuthShell>
  );
}

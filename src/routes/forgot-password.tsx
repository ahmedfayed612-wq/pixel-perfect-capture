import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, Field, TextInput, PrimaryButton } from "@/components/auth/AuthShell";
import { useLang } from "@/i18n/LangProvider";
import { tr, t } from "@/i18n/strings";

export const Route = createFileRoute("/forgot-password")({ component: ForgotPage });

function ForgotPage() {
  const { lang } = useLang();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    setDone(true);
  };

  return (
    <AuthShell title={tr(t.auth.forgotTitle, lang)}>
      {done ? (
        <div className="rounded-lg border border-light-grey bg-white p-6 text-sm text-near-black">
          {tr(t.auth.resetSent, lang)}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <Field label={tr(t.auth.email, lang)}>
            <TextInput type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <PrimaryButton loading={loading}>{tr(t.auth.submitForgot, lang)}</PrimaryButton>
        </form>
      )}
      <p className="mt-6 text-sm text-mid-grey">
        <Link to="/login" className="font-semibold text-teal hover:underline">{tr(t.auth.submitLogin, lang)}</Link>
      </p>
    </AuthShell>
  );
}

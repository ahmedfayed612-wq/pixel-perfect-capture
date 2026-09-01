import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, Field, TextInput, PasswordInput, PrimaryButton } from "@/components/auth/AuthShell";
import { useLang } from "@/i18n/LangProvider";
import { tr, t } from "@/i18n/strings";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search.redirect === "string" ? { redirect: search.redirect } : {},
  component: LoginPage,
});

function LoginPage() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message || tr(t.auth.genericError, lang));
      return;
    }
    navigate({ to: (redirectTo && redirectTo.startsWith("/") ? redirectTo : "/app") as string });
  };

  return (
    <AuthShell title={tr(t.auth.loginTitle, lang)}>
      <form onSubmit={onSubmit} className="space-y-5">
        <Field label={tr(t.auth.email, lang)}>
          <TextInput type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label={tr(t.auth.password, lang)}>
          <PasswordInput required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm font-medium text-teal hover:underline">
            {tr(t.auth.forgotLink, lang)}
          </Link>
        </div>
        <PrimaryButton loading={loading}>{tr(t.auth.submitLogin, lang)}</PrimaryButton>
      </form>
      <p className="mt-6 text-sm text-mid-grey">
        {tr(t.auth.noAccount, lang)}{" "}
        <Link to="/signup" className="font-semibold text-teal hover:underline">{tr(t.auth.submitSignup, lang)}</Link>
      </p>
    </AuthShell>
  );
}

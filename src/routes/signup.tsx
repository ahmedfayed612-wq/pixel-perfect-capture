import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, Field, TextInput, PrimaryButton } from "@/components/auth/AuthShell";
import { useLang } from "@/i18n/LangProvider";
import { tr, t } from "@/i18n/strings";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  validateSearch: (s: Record<string, unknown>): { ref?: string } =>
    typeof s.ref === "string" ? { ref: s.ref } : {},
  component: SignupPage,
});

function SignupPage() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [studentType, setStudentType] = useState<"highschool" | "university">("highschool");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const redirectTo = `${window.location.origin}/onboarding`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          name,
          student_type: studentType,
          language: lang,
          ref: search.ref ?? null,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message || tr(t.auth.genericError, lang));
      return;
    }
    setSuccess(true);
  };

  if (success) {
    return (
      <AuthShell title={tr(t.auth.signupTitle, lang)}>
        <div className="rounded-lg border border-light-grey bg-white p-6 text-sm text-near-black">
          {tr(t.auth.confirmEmail, lang)}
        </div>
        <p className="mt-6 text-sm text-mid-grey">
          {tr(t.auth.haveAccount, lang)}{" "}
          <Link to="/login" className="font-semibold text-teal hover:underline">{tr(t.auth.submitLogin, lang)}</Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={tr(t.auth.signupTitle, lang)}>
      <form onSubmit={onSubmit} className="space-y-5">
        <Field label={tr(t.auth.name, lang)}>
          <TextInput required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={tr(t.auth.email, lang)}>
          <TextInput type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label={tr(t.auth.password, lang)}>
          <TextInput type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <div>
          <span className="mb-2 block text-sm font-medium text-near-black">{tr(t.auth.studentType, lang)}</span>
          <div className="grid grid-cols-2 gap-3">
            {(["highschool", "university"] as const).map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setStudentType(s)}
                className={`h-12 rounded-lg border text-sm font-medium transition-colors ${
                  studentType === s
                    ? "border-teal bg-teal text-white"
                    : "border-light-grey bg-white text-near-black hover:border-teal/40"
                }`}
              >
                {tr(s === "highschool" ? t.auth.highschool : t.auth.university, lang)}
              </button>
            ))}
          </div>
        </div>
        {search.ref && (
          <div className="rounded-lg border border-gold bg-gold-light px-3 py-2 text-xs text-near-black">
            🎁 Referral: <span className="font-mono">{search.ref}</span>
          </div>
        )}
        <PrimaryButton loading={loading}>{tr(t.auth.submitSignup, lang)}</PrimaryButton>
      </form>
      <p className="mt-6 text-sm text-mid-grey">
        {tr(t.auth.haveAccount, lang)}{" "}
        <Link to="/login" className="font-semibold text-teal hover:underline">{tr(t.auth.submitLogin, lang)}</Link>
      </p>
    </AuthShell>
  );
}

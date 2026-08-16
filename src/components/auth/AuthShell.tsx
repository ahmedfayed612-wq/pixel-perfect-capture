import { useState, type ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { LangToggle } from "@/components/brand/LangToggle";
import { useLang } from "@/i18n/LangProvider";
import { tr, t } from "@/i18n/strings";

export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* Brand panel */}
      <div className="bg-teal-dark px-8 py-10 text-white md:flex md:flex-col md:justify-between md:px-12 md:py-16">
        <div className="flex items-center justify-between">
          <Logo size="md" onDark />
          <div className="md:hidden"><LangToggle onDark /></div>
        </div>
        <div className="mt-10 hidden md:block">
          <h2 className="max-w-md text-3xl font-bold leading-tight">
            {tr(t.hero.h1, useLang().lang)}
          </h2>
          <p className="mt-4 max-w-md text-sm text-white/80">{tr(t.hero.sub, useLang().lang)}</p>
        </div>
        <div className="hidden md:block">
          <LangToggle onDark />
        </div>
      </div>
      {/* Form panel */}
      <div className="bg-off-white px-6 py-10 md:px-16 md:py-16">
        <div className="mx-auto max-w-md">
          <h1 className="text-2xl font-bold text-near-black md:text-3xl">{title}</h1>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-near-black">{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="block h-12 w-full rounded-lg border border-light-grey bg-white px-4 text-sm text-near-black outline-none transition-colors placeholder:text-mid-grey focus:border-teal focus:ring-2 focus:ring-teal/20"
    />
  );
}

export function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={show ? "text" : "password"}
        className="block h-12 w-full rounded-lg border border-light-grey bg-white px-4 pe-12 text-sm text-near-black outline-none transition-colors placeholder:text-mid-grey focus:border-teal focus:ring-2 focus:ring-teal/20"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute inset-y-0 end-0 flex w-12 items-center justify-center text-mid-grey hover:text-teal"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function PrimaryButton({
  children,
  loading,
  ...rest
}: { loading?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      disabled={loading || rest.disabled}
      className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-teal text-cta text-white transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
    >
      {loading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : children}
    </button>
  );
}

export function useFormState<T extends Record<string, string>>(initial: T) {
  const [state, setState] = useState<T>(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  return { state, setState, error, setError, loading, setLoading };
}

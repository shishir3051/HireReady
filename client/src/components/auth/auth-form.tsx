"use client";

import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleAlert, Eye, EyeOff, LockKeyhole, LogIn, Mail, TriangleAlert, User, UserPlus } from "lucide-react";
import { getErrorMessage, getFieldErrors, isApiError } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, fieldDescribedBy } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { AuthDivider, GoogleButton } from "./google-button";
import { PasswordStrength } from "./password-strength";

type Mode = "login" | "register";
type Values = { name: string; email: string; password: string };
type Errors = Partial<Record<keyof Values, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const OAUTH_ERRORS: Record<string, string> = {
  google: "Google sign-in didn't finish. Try again, or use your email and password.",
};

function validate(mode: Mode, v: Values): Errors {
  const errors: Errors = {};
  if (mode === "register") {
    const name = v.name.trim();
    if (!name) errors.name = "Enter your name.";
    else if (name.length < 2) errors.name = "Name must be at least 2 characters.";
    else if (name.length > 60) errors.name = "Name must be at most 60 characters.";
  }
  if (!v.email.trim()) errors.email = "Enter your email address.";
  else if (!EMAIL_RE.test(v.email.trim())) errors.email = "Enter a valid email address.";
  if (!v.password) errors.password = "Enter your password.";
  else if (mode === "register" && v.password.length < 8) errors.password = "Use at least 8 characters.";
  else if (v.password.length > 128) errors.password = "Password must be at most 128 characters.";
  return errors;
}

export function AuthForm({
  mode,
  next,
  google = false,
  oauthError,
}: {
  mode: Mode;
  next: string;
  /** show "Continue with Google" (the API has a Google client configured) */
  google?: boolean;
  /** `?error=` from a failed Google redirect */
  oauthError?: string;
}) {
  const { user, loading, login, register } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [values, setValues] = useState<Values>({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState<string | null>(oauthError ? (OAUTH_ERRORS[oauthError] ?? OAUTH_ERRORS.google!) : null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  // Already logged in (or just logged in): go to the destination.
  useEffect(() => {
    if (!loading && user) router.replace(next);
  }, [loading, user, next, router]);

  function set<K extends keyof Values>(key: K, value: string) {
    const nextValues = { ...values, [key]: value };
    setValues(nextValues);
    if (touched) setErrors(validate(mode, nextValues));
    if (serverError) setServerError(null);
  }

  function onPasswordKey(e: KeyboardEvent<HTMLInputElement>) {
    setCapsLock(e.getModifierState("CapsLock"));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTouched(true);
    const found = validate(mode, values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = (["name", "email", "password"] as const).find((k) => found[k]);
      if (first) document.getElementById(`auth-${first}`)?.focus();
      return;
    }
    setSubmitting(true);
    setServerError(null);
    try {
      const me =
        mode === "login"
          ? await login({ email: values.email, password: values.password })
          : await register({ name: values.name, email: values.email, password: values.password });
      toast({
        variant: "success",
        title: mode === "login" ? `Welcome back, ${me.name.split(" ")[0]}!` : `Welcome to HireReady, ${me.name.split(" ")[0]}!`,
        description: mode === "login" ? "Your progress is synced." : "Your progress will now be saved as you study.",
      });
      router.replace(next);
    } catch (err) {
      const fieldErrors = getFieldErrors(err) as Errors;
      if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors);
      if (isApiError(err) && err.status === 409) {
        setErrors((prev) => ({ ...prev, email: "An account with this email already exists." }));
        setServerError(null);
      } else if (isApiError(err) && err.status === 401) {
        setServerError("Incorrect email or password.");
      } else {
        setServerError(getErrorMessage(err));
      }
      setSubmitting(false);
    }
  }

  if (!loading && user) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted">
          You&apos;re logged in as <span className="font-medium text-foreground">{user.name}</span>. Redirecting…
        </p>
        <ButtonLink href={next} variant="outline" className="w-full">
          Continue
        </ButtonLink>
      </div>
    );
  }

  const isLogin = mode === "login";

  return (
    <div className="space-y-3">
      {google && (
        <>
          <GoogleButton next={next} label={isLogin ? "Continue with Google" : "Sign up with Google"} />
          <AuthDivider />
        </>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-3" aria-describedby={serverError ? "auth-server-error" : undefined}>
        {serverError && (
          <div
            id="auth-server-error"
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm"
            style={{
              borderColor: "color-mix(in oklch, var(--viz-danger) 35%, transparent)",
              backgroundColor: "color-mix(in oklch, var(--viz-danger) 10%, transparent)",
            }}
          >
            <CircleAlert className="mt-0.5 size-4 shrink-0" style={{ color: "var(--viz-danger)" }} aria-hidden />
            <span>{serverError}</span>
          </div>
        )}

        {!isLogin && (
          <Field id="auth-name" label="Full name" error={errors.name} className="space-y-1.5">
            <Input
              id="auth-name"
              name="name"
              autoComplete="name"
              autoFocus={!google}
              leftIcon={<User aria-hidden />}
              className="h-10"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              invalid={!!errors.name}
              aria-describedby={fieldDescribedBy("auth-name", { error: errors.name })}
              placeholder="Ayesha Rahman"
              maxLength={60}
            />
          </Field>
        )}

        <Field id="auth-email" label="Email" error={errors.email} className="space-y-1.5">
          <Input
            id="auth-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus={isLogin && !google}
            spellCheck={false}
            leftIcon={<Mail aria-hidden />}
            className="h-10"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            invalid={!!errors.email}
            aria-describedby={fieldDescribedBy("auth-email", { error: errors.email })}
            placeholder="you@university.edu"
          />
        </Field>

        <Field
          id="auth-password"
          label="Password"
          error={errors.password}
          className="space-y-1.5"
          labelAside={
            isLogin ? (
              <Link href="/forgot-password" className="text-xs font-medium text-brand hover:underline">
                Forgot password?
              </Link>
            ) : undefined
          }
        >
          <Input
            id="auth-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete={isLogin ? "current-password" : "new-password"}
            leftIcon={<LockKeyhole aria-hidden />}
            className="h-10"
            value={values.password}
            onChange={(e) => set("password", e.target.value)}
            onKeyDown={onPasswordKey}
            onKeyUp={onPasswordKey}
            onBlur={() => setCapsLock(false)}
            invalid={!!errors.password}
            aria-describedby={
              [fieldDescribedBy("auth-password", { error: errors.password, hint: !isLogin && values.password }), capsLock ? "auth-caps" : null]
                .filter(Boolean)
                .join(" ") || undefined
            }
            placeholder={isLogin ? "Your password" : "At least 8 characters"}
            maxLength={128}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="grid size-7 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              </button>
            }
          />
          {capsLock && (
            <p id="auth-caps" className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--viz-warning)" }}>
              <TriangleAlert className="size-3.5" aria-hidden /> Caps Lock is on
            </p>
          )}
          {/* appears once typing starts, so the empty form stays short enough to fit one screen */}
          {!isLogin && !errors.password && values.password && <PasswordStrength id="auth-password-hint" password={values.password} />}
        </Field>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={submitting}
          leftIcon={isLogin ? <LogIn aria-hidden /> : <UserPlus aria-hidden />}
        >
          {isLogin ? (submitting ? "Logging in…" : "Log in") : submitting ? "Creating account…" : "Create account"}
        </Button>

        {isLogin && (
          <Link
            href="/topics"
            className="group flex items-center justify-center gap-1.5 border-t border-border pt-3 text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            Browse questions without an account
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        )}
      </form>
    </div>
  );
}

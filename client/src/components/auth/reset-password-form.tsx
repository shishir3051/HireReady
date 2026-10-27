"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert, Eye, EyeOff, KeyRound, LockKeyhole } from "lucide-react";
import { api, getErrorMessage, isApiError } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, fieldDescribedBy } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { PasswordStrength } from "./password-strength";

type Errors = { password?: string; confirm?: string };

export function ResetPasswordForm({ token }: { token: string | undefined }) {
  const { refresh } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [expired, setExpired] = useState(!token);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const found: Errors = {};
    if (password.length < 8) found.password = "Use at least 8 characters.";
    else if (password.length > 128) found.password = "Password must be at most 128 characters.";
    if (!found.password && confirm !== password) found.confirm = "Passwords don't match.";
    setErrors(found);
    if (found.password || found.confirm) {
      document.getElementById(found.password ? "reset-password" : "reset-confirm")?.focus();
      return;
    }
    setSubmitting(true);
    setServerError(null);
    try {
      await api.auth.resetPassword({ token: token!, password });
      await refresh();
      toast({ variant: "success", title: "Password updated", description: "You're logged in. Other devices were signed out." });
      router.replace("/dashboard");
    } catch (err) {
      if (isApiError(err) && (err.code === "INVALID_TOKEN" || err.status === 400)) setExpired(true);
      else setServerError(getErrorMessage(err));
      setSubmitting(false);
    }
  }

  if (expired) {
    return (
      <div className="space-y-4" role="alert">
        <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-2/60 p-3.5 text-sm">
          <CircleAlert className="mt-0.5 size-4 shrink-0" style={{ color: "var(--viz-warning)" }} aria-hidden />
          <div>
            <p className="font-medium">This reset link can&apos;t be used</p>
            <p className="mt-1 text-muted">
              Links work once and expire after 30 minutes. Request a new one and use the latest email.
            </p>
          </div>
        </div>
        <ButtonLink href="/forgot-password" size="lg" className="w-full">
          Request a new link
        </ButtonLink>
        <Link href="/login" className="block text-center text-sm font-medium text-muted hover:text-foreground">
          Back to log in
        </Link>
      </div>
    );
  }

  const toggle = (
    <button
      type="button"
      onClick={() => setShow((s) => !s)}
      className="grid size-7 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-foreground"
      aria-label={show ? "Hide passwords" : "Show passwords"}
      aria-pressed={show}
    >
      {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
    </button>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3">
      {serverError && (
        <div
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
      <Field id="reset-password" label="New password" error={errors.password} className="space-y-1.5">
        <Input
          id="reset-password"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          autoFocus
          leftIcon={<LockKeyhole aria-hidden />}
          className="h-10"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
          }}
          invalid={!!errors.password}
          aria-describedby={fieldDescribedBy("reset-password", { error: errors.password, hint: password })}
          placeholder="At least 8 characters"
          maxLength={128}
          rightSlot={toggle}
        />
        {!errors.password && password && <PasswordStrength id="reset-password-hint" password={password} />}
      </Field>
      <Field id="reset-confirm" label="Confirm new password" error={errors.confirm} className="space-y-1.5">
        <Input
          id="reset-confirm"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          leftIcon={<KeyRound aria-hidden />}
          className="h-10"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            if (errors.confirm) setErrors((p) => ({ ...p, confirm: undefined }));
          }}
          invalid={!!errors.confirm}
          aria-describedby={fieldDescribedBy("reset-confirm", { error: errors.confirm })}
          placeholder="Type it again"
          maxLength={128}
        />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={submitting} leftIcon={<KeyRound aria-hidden />}>
        {submitting ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}

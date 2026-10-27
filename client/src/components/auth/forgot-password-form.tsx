"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, CircleAlert, Mail, MailCheck, MailWarning, Send } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, fieldDescribedBy } from "@/components/ui/input";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** `emailConfigured` = the API has SMTP settings; false means the reset email was only printed in the API terminal. */
export function ForgotPasswordForm({ emailConfigured = true }: { emailConfigured?: boolean }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = email.trim();
    if (!value) return setError("Enter your email address.");
    if (!EMAIL_RE.test(value)) return setError("Enter a valid email address.");
    setError(null);
    setServerError(null);
    setSubmitting(true);
    try {
      await api.auth.forgotPassword({ email: value });
      setSentTo(value);
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (sentTo && !emailConfigured) {
    return (
      <div className="space-y-4" role="status">
        <div
          className="flex items-start gap-3 rounded-xl border p-3.5"
          style={{
            borderColor: "color-mix(in oklch, var(--viz-warning) 45%, transparent)",
            backgroundColor: "color-mix(in oklch, var(--viz-warning) 10%, transparent)",
          }}
        >
          <MailWarning className="mt-0.5 size-4.5 shrink-0" style={{ color: "var(--viz-warning)" }} aria-hidden />
          <div className="min-w-0 text-sm">
            <p className="font-medium">Email isn&apos;t set up on this server yet</p>
            <p className="mt-1 text-muted">
              Nothing was sent to <span className="break-all font-medium text-foreground">{sentTo}</span>. The reset link
              was printed in the API terminal instead. To deliver real emails, add SMTP settings to{" "}
              <code className="rounded bg-surface-2 px-1 font-mono text-xs">server/.env</code> (see the README).
            </p>
          </div>
        </div>
        <ButtonLink href="/login" variant="outline" size="lg" className="w-full" leftIcon={<ArrowLeft aria-hidden />}>
          Back to log in
        </ButtonLink>
      </div>
    );
  }

  if (sentTo) {
    return (
      <div className="space-y-4" role="status">
        <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-2/60 p-3.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
            <MailCheck className="size-4.5" aria-hidden />
          </span>
          <div className="min-w-0 text-sm">
            <p className="font-medium">Check your inbox</p>
            <p className="mt-1 text-muted">
              If an account exists for <span className="break-all font-medium text-foreground">{sentTo}</span>, we&apos;ve
              sent a link to reset your password. It expires in 30 minutes.
            </p>
          </div>
        </div>
        <p className="text-xs text-muted">
          Nothing after a few minutes? Check your spam folder, or{" "}
          <button type="button" onClick={() => setSentTo(null)} className="font-medium text-brand hover:underline">
            try a different email
          </button>
          .
        </p>
        <ButtonLink href="/login" variant="outline" size="lg" className="w-full" leftIcon={<ArrowLeft aria-hidden />}>
          Back to log in
        </ButtonLink>
      </div>
    );
  }

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
      <Field id="forgot-email" label="Email" error={error} className="space-y-1.5">
        <Input
          id="forgot-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          spellCheck={false}
          leftIcon={<Mail aria-hidden />}
          className="h-10"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          invalid={!!error}
          aria-describedby={fieldDescribedBy("forgot-email", { error })}
          placeholder="you@university.edu"
        />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={submitting} leftIcon={<Send aria-hidden />}>
        {submitting ? "Sending…" : "Send reset link"}
      </Button>
      <Link
        href="/login"
        className="flex items-center justify-center gap-1.5 border-t border-border pt-3 text-sm font-medium text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden /> Back to log in
      </Link>
    </form>
  );
}

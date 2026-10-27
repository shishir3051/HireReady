import type { Metadata } from "next";
import { api, orFallback } from "@/lib/api";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Get a link to reset your HireReady password.",
};

export default async function ForgotPasswordPage() {
  // no-store: the notice must disappear as soon as SMTP is configured and the API restarted
  const providers = await orFallback(api.auth.providers({ revalidate: 0 }));
  return (
    <AuthShell title="Forgot your password?" subtitle="Enter your account email and we'll send you a link to choose a new one.">
      <ForgotPasswordForm emailConfigured={providers?.email ?? true} />
    </AuthShell>
  );
}

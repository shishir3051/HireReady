import type { Metadata } from "next";
import { firstParam } from "@/lib/utils";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Set a new password for your HireReady account.",
  // the URL carries a one-time token: keep it out of search engines and referrers
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const token = firstParam((await searchParams).token);
  return (
    <AuthShell title="Choose a new password" subtitle="Pick something you don't use on other sites. You'll be logged in right after.">
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}

import type { Metadata } from "next";
import { api, orFallback } from "@/lib/api";
import { firstParam, safeRedirect } from "@/lib/utils";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Create a free HireReady account to track progress, keep notes and follow the 30-day roadmap.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const next = safeRedirect(firstParam(sp.next));
  const providers = await orFallback(api.auth.providers({ revalidate: 60 }));
  return (
    <AuthShell mode="register" next={next} title="Create your free account" subtitle="Free. We only store your name, email and progress.">
      <AuthForm mode="register" next={next} google={providers?.google ?? false} oauthError={firstParam(sp.error)} />
    </AuthShell>
  );
}

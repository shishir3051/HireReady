import type { Metadata } from "next";
import { api, orFallback } from "@/lib/api";
import { firstParam, safeRedirect } from "@/lib/utils";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to HireReady to sync your solved questions, notes, bookmarks and roadmap.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const next = safeRedirect(firstParam(sp.next));
  const providers = await orFallback(api.auth.providers({ revalidate: 60 }));
  return (
    <AuthShell mode="login" next={next} title="Welcome back" subtitle="Log in to continue your interview prep.">
      <AuthForm mode="login" next={next} google={providers?.google ?? false} oauthError={firstParam(sp.error)} />
    </AuthShell>
  );
}

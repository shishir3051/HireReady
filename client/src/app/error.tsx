"use client";

import { useEffect } from "react";
import { House, RotateCcw, ServerCrash } from "lucide-react";
import { Container } from "@/components/layout/page";
import { Button, ButtonLink } from "@/components/ui/button";

export default function RouteError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest = error instanceof Error ? (error as Error & { digest?: string }).digest : undefined;

  return (
    <Container size="narrow" className="flex flex-1 flex-col items-center justify-center py-14 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand">
        <ServerCrash className="size-7" aria-hidden />
      </span>
      <h1 className="mt-4 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
        We couldn&apos;t load this page
      </h1>
      <p className="mt-3 max-w-md text-pretty text-muted">
        The HireReady API may be restarting or unreachable. Your progress is safe — try again in a moment.
      </p>
      {digest && <p className="mt-2 font-mono text-xs text-muted">Reference: {digest}</p>}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => retry()} leftIcon={<RotateCcw aria-hidden />}>
          Try again
        </Button>
        <ButtonLink href="/" variant="outline" leftIcon={<House aria-hidden />}>
          Go home
        </ButtonLink>
      </div>
    </Container>
  );
}

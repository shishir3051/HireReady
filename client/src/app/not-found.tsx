import type { Metadata } from "next";
import { ArrowLeft, BookOpen, Search } from "lucide-react";
import { Container } from "@/components/layout/page";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <Container size="narrow" className="flex flex-1 flex-col items-center justify-center py-14 text-center">
      <p className="font-mono text-sm font-medium text-brand">404 · Not found</p>
      <h1 className="mt-3 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
        This page isn&apos;t in the question bank
      </h1>
      <p className="mt-3 max-w-md text-pretty text-muted">
        The link may be outdated or the question was renamed. Search for it, or head back to the topics.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <ButtonLink href="/topics" leftIcon={<BookOpen aria-hidden />}>
          Browse topics
        </ButtonLink>
        <ButtonLink href="/questions" variant="outline" leftIcon={<Search aria-hidden />}>
          Search questions
        </ButtonLink>
        <ButtonLink href="/" variant="ghost" leftIcon={<ArrowLeft aria-hidden />}>
          Home
        </ButtonLink>
      </div>
    </Container>
  );
}

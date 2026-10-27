import type { LucideIcon } from "lucide-react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Container, PageHeader } from "@/components/layout/page";
import { Card, CardContent } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";

/** Placeholder for routes that are being built (keeps nav links from 404ing). */
export function ComingSoon({
  title,
  description,
  icon: Icon,
  bullets,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  bullets: string[];
}) {
  return (
    <Container className="pb-12">
      <PageHeader eyebrow="Coming soon" title={title} description={description} />
      <Card className="overflow-hidden">
        <CardContent className="grid gap-5 p-4 sm:p-5 md:grid-cols-[auto_1fr] md:items-center">
          <span className="grid size-16 place-items-center rounded-2xl bg-brand-soft text-brand">
            <Icon className="size-8" aria-hidden />
          </span>
          <div className="space-y-3">
            <p className="flex items-center gap-2 font-semibold">
              <Sparkles className="size-4 text-brand" aria-hidden /> This feature is on its way
            </p>
            <ul className="grid gap-2 text-sm text-muted sm:grid-cols-2">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                  {b}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2 pt-2">
              <ButtonLink href="/questions" rightIcon={<ArrowRight aria-hidden />}>
                Practice questions meanwhile
              </ButtonLink>
              <ButtonLink href="/topics" variant="outline">
                Browse topics
              </ButtonLink>
            </div>
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}

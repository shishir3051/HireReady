import type { Metadata } from "next";
import { api } from "@/lib/api";
import type { TopicSummary } from "@/lib/types";
import { listParam } from "@/lib/utils";
import { Container } from "@/components/layout/page";
import { MockInterview } from "@/components/mock/mock-interview";
import type { TopicOption } from "@/components/mock/mock-setup";

export const metadata: Metadata = {
  title: "Mock Interview",
  description:
    "Timed mock interviews for junior software engineers: random questions, per-question countdowns, private notes, model answers with visual walkthroughs and self-rating.",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function MockInterviewPage({ searchParams }: Props) {
  const requested = listParam((await searchParams).topics).filter((t) => /^[a-z0-9-]+$/.test(t));

  let topics: TopicSummary[] = [];
  try {
    topics = (await api.topics.list()).items;
  } catch {
    // The form still works without topic names: questions are drawn from every topic.
  }

  const options: TopicOption[] = [...topics]
    .sort((a, b) => a.order - b.order)
    .map((t) => ({ slug: t.slug, title: t.title, category: t.category }));
  const known = new Set(options.map((t) => t.slug));
  const initialTopics = options.length ? requested.filter((t) => known.has(t)) : requested;

  return (
    <Container>
      <MockInterview key={initialTopics.join(",")} topics={options} initialTopics={initialTopics} />
    </Container>
  );
}

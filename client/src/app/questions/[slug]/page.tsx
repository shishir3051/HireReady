import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api, orNull } from "@/lib/api";
import type { QuestionDetailResponse } from "@/lib/types";
import { titleFromSlug } from "@/lib/utils";
import { QuestionView } from "@/components/question/question-view";

type Props = { params: Promise<{ slug: string }> };

const getQuestion = (slug: string) => orNull(api.questions.get(slug));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  let data: QuestionDetailResponse | null;
  try {
    data = await getQuestion(slug);
  } catch {
    return { title: titleFromSlug(slug) };
  }
  if (!data) return { title: "Question not found" };
  const { question, topic } = data;
  const summary = question.solution.summary;
  return {
    title: `${question.title} — ${topic.title}`,
    description: summary.length > 160 ? `${summary.slice(0, 157)}…` : summary,
    openGraph: { title: question.title, description: summary },
  };
}

export default async function QuestionPage({ params }: Props) {
  const { slug } = await params;
  const data = await getQuestion(slug);
  if (!data) notFound();

  const related = (
    await Promise.all(
      (data.question.related ?? [])
        .filter((s) => s !== data.question.slug)
        .slice(0, 6)
        .map((s) => getQuestion(s).catch(() => null)),
    )
  ).filter((r): r is QuestionDetailResponse => r !== null);

  return <QuestionView data={data} related={related} />;
}

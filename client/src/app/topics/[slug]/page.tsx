import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api, orNull } from "@/lib/api";
import type { TopicDetailResponse } from "@/lib/types";
import { titleFromSlug } from "@/lib/utils";
import { TopicView } from "@/components/topics/topic-view";

type Props = { params: Promise<{ slug: string }> };

const getTopic = (slug: string) => orNull(api.topics.get(slug));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  let data: TopicDetailResponse | null;
  try {
    data = await getTopic(slug);
  } catch {
    return { title: titleFromSlug(slug) };
  }
  if (!data) return { title: "Topic not found" };
  return {
    title: `${data.topic.title} interview questions`,
    description: data.topic.summary,
  };
}

export default async function TopicPage({ params }: Props) {
  const { slug } = await params;
  const data = await getTopic(slug);
  if (!data) notFound();
  return <TopicView data={data} />;
}

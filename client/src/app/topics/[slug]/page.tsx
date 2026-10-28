import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { api, orNull } from "@/lib/api";
import type { TopicDetailResponse } from "@/lib/types";
import { LANG_COOKIE, type AppLang } from "@/lib/constants";
import { getDictionary } from "@/i18n/dictionary";
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
  const cookieStore = await cookies();
  const lang: AppLang = cookieStore.get(LANG_COOKIE)?.value === "bn" ? "bn" : "en";
  const dict = getDictionary(lang);
  const data = await getTopic(slug);
  if (!data) notFound();
  return <TopicView data={data} dict={dict} lang={lang} />;
}

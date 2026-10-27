import type { LucideProps } from "lucide-react";
import { BookOpen } from "lucide-react";
import { TOPIC_ICONS } from "@/lib/icons";

/** Lucide icon for a topic slug (BookOpen for unknown slugs). */
export function TopicIcon({ slug, ...props }: { slug: string } & LucideProps) {
  const Icon = TOPIC_ICONS[slug] ?? BookOpen;
  return <Icon aria-hidden {...props} />;
}

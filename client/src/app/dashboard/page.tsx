import type { Metadata } from "next";
import { api, orFallback } from "@/lib/api";
import { Container } from "@/components/layout/page";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { fetchQuestionIndex } from "@/components/dashboard/question-index";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your interview prep at a glance: solved questions, streak, activity, quiz scores, mock interviews and bookmarks.",
  robots: { index: false },
};

export default async function DashboardPage() {
  // Public content only; the personal data loads in the browser (the page requires login).
  const [questionIndex, roadmap] = await Promise.all([orFallback(fetchQuestionIndex()), orFallback(api.roadmap.get())]);
  return (
    <Container>
      <DashboardView questionIndex={questionIndex ?? {}} roadmap={roadmap} />
    </Container>
  );
}

import { Container } from "@/components/layout/page";
import { LoadingLabel, Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Container size="wide" className="pb-12">
      <LoadingLabel label="Loading quizzes…" />
      <div className="space-y-3 pb-5 pt-6 sm:pt-8">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-9 w-full max-w-lg" />
        <Skeleton className="h-5 w-full max-w-2xl" />
      </div>
      <Skeleton className="-mt-2 mb-5 h-[72px] w-full max-w-xl rounded-xl" />
      <Skeleton className="mb-4 h-7 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {Array.from({ length: 6 }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </Container>
  );
}

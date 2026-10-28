import { Container } from "@/components/layout/page";
import { LoadingLabel, Skeleton, SkeletonText } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Container size="wide" className="pb-12">
      <LoadingLabel label="Loading roadmap…" />
      <div className="space-y-3 pb-5 pt-6 sm:pt-8">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-full max-w-md sm:h-9" />
        <Skeleton className="h-5 w-full max-w-2xl" />
      </div>
      <Skeleton className="mb-5 h-36 w-full rounded-xl" />
      <Skeleton className="mb-3 h-7 w-32" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="size-12 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
            <SkeletonText lines={4} className="mt-3" />
            <Skeleton className="mt-4 h-8 w-full" />
          </div>
        ))}
      </div>
    </Container>
  );
}

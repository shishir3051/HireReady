import { Container } from "@/components/layout/page";
import { LoadingLabel, Skeleton, SkeletonText } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Container size="wide" className="pb-12 pt-4 sm:pt-5">
      <LoadingLabel label="Loading question…" />
      <Skeleton className="h-4 w-56" />
      <div className="mt-4 border-b border-border pb-4">
        <div className="flex gap-2">
          <Skeleton className="h-7 w-16 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
        <Skeleton className="mt-3 h-8 w-full max-w-xl sm:h-9" />
        <div className="mt-4 flex gap-2">
          <Skeleton className="h-9 w-64 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>
      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px] xl:gap-8">
        <div className="space-y-8">
          <div className="space-y-3">
            <Skeleton className="h-6 w-32" />
            <SkeletonText lines={4} />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-80 w-full rounded-2xl" />
          </div>
        </div>
        <div className="hidden space-y-2 lg:block">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-4 w-32" />
          ))}
        </div>
      </div>
    </Container>
  );
}

import { Container } from "@/components/layout/page";
import { LoadingLabel, Skeleton, SkeletonText } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="pb-12">
      <LoadingLabel label="Loading topic…" />
      <div className="border-b border-border bg-surface/60">
        <Container size="wide" className="py-5 sm:py-8">
          <Skeleton className="h-4 w-40" />
          <div className="mt-4 flex items-start gap-4">
            <Skeleton className="size-14 rounded-2xl" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-full max-w-md sm:h-9" />
              <Skeleton className="h-4 w-full max-w-xl" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-[74px] rounded-xl" />
            ))}
          </div>
        </Container>
      </div>
      <Container size="wide" className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Skeleton className="h-6 w-40" />
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
            <SkeletonText lines={6} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        </div>
        <Skeleton className="hidden h-64 rounded-xl lg:block" />
      </Container>
    </div>
  );
}

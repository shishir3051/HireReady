import { Container } from "@/components/layout/page";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Container className="pb-12">
      <LoadingLabel label="Loading mock interview…" />
      <div className="space-y-3 pb-5 pt-6 sm:pt-8">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-full max-w-xl" />
        <Skeleton className="h-5 w-full max-w-2xl" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5 rounded-xl border border-border bg-surface p-4 sm:p-5">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-9 w-full" />
          <div className="grid gap-2 sm:grid-cols-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    </Container>
  );
}

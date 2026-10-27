import { Container } from "@/components/layout/page";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Container size="narrow" className="pb-12 pt-4 sm:pt-5">
      <LoadingLabel label="Loading quiz…" />
      <Skeleton className="h-4 w-36" />
      <div className="mb-5 mt-4 flex items-start gap-4">
        <Skeleton className="size-12 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-8 w-full max-w-sm" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <Skeleton className="mb-4 h-6 w-full" />
      <div className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-2.5 sm:px-5">
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="space-y-3 p-4 sm:p-5">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="mb-2 h-24 w-full rounded-xl" />
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </Container>
  );
}

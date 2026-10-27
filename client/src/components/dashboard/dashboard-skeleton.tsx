import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";

/** Placeholder for the dashboard while auth / stats load (server-safe; also used by app/dashboard/loading.tsx). */
export function DashboardSkeleton({ label = "Loading your dashboard…" }: { label?: string }) {
  return (
    <div className="pb-12">
      <LoadingLabel label={label} />
      <div className="space-y-3 pb-5 pt-6 sm:pt-8">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-full max-w-md sm:h-9" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-[104px] rounded-xl" />
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-42 rounded-xl" />
            <Skeleton className="h-42 rounded-xl" />
          </div>
          <Skeleton className="h-58 rounded-xl" />
          <Skeleton className="h-94 rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-54 rounded-xl" />
          <Skeleton className="h-70 rounded-xl" />
          <Skeleton className="h-62 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

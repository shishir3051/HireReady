import { Container } from "@/components/layout/page";
import { LoadingLabel, Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Container className="pb-12 pt-6 sm:pt-8">
      <LoadingLabel />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-2 h-8 w-2/3 max-w-md sm:h-9" />
      <Skeleton className="mt-2 h-4 w-full max-w-xl" />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </Container>
  );
}

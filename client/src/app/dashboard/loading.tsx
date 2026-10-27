import { Container } from "@/components/layout/page";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

export default function Loading() {
  return (
    <Container>
      <DashboardSkeleton />
    </Container>
  );
}

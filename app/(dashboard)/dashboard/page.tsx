import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { Suspense } from "react";

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardView />
    </Suspense>
  );
}

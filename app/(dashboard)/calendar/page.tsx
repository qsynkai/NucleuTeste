import { CalendarView } from "@/components/calendar/calendar-view";
import { CalendarLoadingSkeleton } from "@/components/calendar/calendar-loading-skeleton";
import { Suspense } from "react";

export default function CalendarPage() {
  return (
    <Suspense fallback={<CalendarLoadingSkeleton />}>
      <CalendarView />
    </Suspense>
  );
}

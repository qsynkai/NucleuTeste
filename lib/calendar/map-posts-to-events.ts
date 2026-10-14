import type { CalendarEventExtendedProps } from "@/lib/calendar/calendar-event-props";
import { sumMoneyCents } from "@/lib/money/brl";
import { postStatusClassName } from "@/lib/posts/status-meta";
import type { PostCalendarItem } from "@/lib/types/post-api";
import type { EntryType } from "@prisma/client";
import type { EventInput } from "@fullcalendar/core";

const DEFAULT_EVENT_DURATION_MS = 60 * 60 * 1000;

type MapOptions = {
  /** Na visão "Todos os projetos" cada evento exibe o projeto de origem. */
  showProject?: boolean;
};

function entryTypeClassName(entryType: EntryType): string {
  return `fc-event-entry fc-event-entry--${entryType.toLowerCase().replace(/_/g, "-")}`;
}

function resolveDurationMs(post: PostCalendarItem): number {
  if (post.durationMinutes && post.durationMinutes > 0) {
    return post.durationMinutes * 60 * 1000;
  }
  if (post.entryType === "SIMPLE_REMINDER") {
    return 30 * 60 * 1000;
  }
  return DEFAULT_EVENT_DURATION_MS;
}

/**
 * Tudo que o renderer do evento precisa viaja em `extendedProps`:
 * o `eventContent` do FullCalendar roda fora do ciclo de hooks do React.
 */
export function mapPostsToCalendarEvents(
  posts: PostCalendarItem[],
  { showProject = false }: MapOptions = {},
): EventInput[] {
  return posts
    .filter((post): post is PostCalendarItem & { scheduledAt: string } =>
      Boolean(post.scheduledAt),
    )
    .map((post) => {
      const start = new Date(post.scheduledAt);
      const end = new Date(start.getTime() + resolveDurationMs(post));
      const entryType = post.entryType ?? "SOCIAL_POST";
      const productionTotalCents = sumMoneyCents(post.tasks.map((task) => task.price));

      const extendedProps: CalendarEventExtendedProps = {
        entryType,
        content: post.content,
        channels: post.channels,
        status: post.status,
        project: post.project,
        showProject,
        currentStatus: post.currentStatus ?? "OPEN",
        productionTotalCents,
        attendanceType: post.attendanceType,
        clientName: post.clientName,
        appointmentStatus: post.appointmentStatus,
        serviceChannel: post.serviceChannel,
      };

      return {
        id: post.id,
        title: post.title,
        start,
        end,
        classNames: [postStatusClassName(post.status), entryTypeClassName(entryType)],
        extendedProps,
      } satisfies EventInput;
    });
}

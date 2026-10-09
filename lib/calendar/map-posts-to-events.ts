import type { EventInput } from "@fullcalendar/core";
import type { PostCalendarItem } from "@/lib/types/post-api";
import { postStatusClassName } from "@/lib/posts/status-meta";

const DEFAULT_EVENT_DURATION_MS = 60 * 60 * 1000;

type MapOptions = {
  /** Na visão "Todos os projetos" cada evento exibe o projeto de origem. */
  showProject?: boolean;
};

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
      const end = new Date(start.getTime() + DEFAULT_EVENT_DURATION_MS);

      return {
        id: post.id,
        title: post.title,
        start,
        end,
        classNames: [postStatusClassName(post.status)],
        extendedProps: {
          content: post.content,
          channels: post.channels,
          status: post.status,
          project: post.project,
          showProject,
        },
      } satisfies EventInput;
    });
}

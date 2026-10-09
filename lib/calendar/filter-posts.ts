import type { PostCalendarItem } from "@/lib/types/post-api";
import type { PostStatus, SocialChannel } from "@prisma/client";

export type CalendarFilters = {
  channels: SocialChannel[];
  statuses: PostStatus[];
  searchQuery: string;
};

export const DEFAULT_CALENDAR_FILTERS: CalendarFilters = {
  channels: [],
  statuses: [],
  searchQuery: "",
};

export const CALENDAR_STATUS_FILTER_OPTIONS: PostStatus[] = [
  "DRAFT",
  "SCHEDULED",
  "PUBLISHED",
];

export function filterPostsForCalendar(
  posts: PostCalendarItem[],
  filters: CalendarFilters,
): PostCalendarItem[] {
  const query = filters.searchQuery.trim().toLowerCase();
  const { channels, statuses } = filters;

  return posts.filter((post) => {
    if (!post.scheduledAt) return false;

    if (statuses.length > 0 && !statuses.includes(post.status)) {
      return false;
    }

    if (channels.length > 0) {
      const matchesChannel = post.channels.some((channel) =>
        channels.includes(channel),
      );
      if (!matchesChannel) return false;
    }

    if (query) {
      const haystack = `${post.title} ${post.content}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });
}

import { defaultVisibleEntryTypes } from "@/lib/calendar/calendar-entry-types";
import type { PostCalendarItem } from "@/lib/types/post-api";
import type { EntryType, PostStatus, SocialChannel } from "@prisma/client";

export type CalendarFilters = {
  channels: SocialChannel[];
  statuses: PostStatus[];
  searchQuery: string;
  /** Tipos visíveis na grade; vazio = nenhum evento. */
  visibleEntryTypes: EntryType[];
};

export const DEFAULT_CALENDAR_FILTERS: CalendarFilters = {
  channels: [],
  statuses: [],
  searchQuery: "",
  visibleEntryTypes: defaultVisibleEntryTypes(),
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
  const { channels, statuses, visibleEntryTypes } = filters;

  return posts.filter((post) => {
    if (!post.scheduledAt) return false;

    const entryType = post.entryType ?? "SOCIAL_POST";
    if (
      visibleEntryTypes.length === 0 ||
      !visibleEntryTypes.includes(entryType)
    ) {
      return false;
    }

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

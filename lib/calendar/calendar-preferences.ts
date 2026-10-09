import {
  CALENDAR_STATUS_FILTER_OPTIONS,
  DEFAULT_CALENDAR_FILTERS,
  type CalendarFilters,
} from "@/lib/calendar/filter-posts";
import type { PostStatus, SocialChannel } from "@prisma/client";

import { APP_SLUG } from "@/lib/constants/brand";

const STORAGE_KEY = `${APP_SLUG}:calendar-preferences`;

export type CalendarViewType = "dayGridMonth" | "timeGridWeek" | "listWeek";

export type CalendarPreferences = {
  view: CalendarViewType;
  filters: CalendarFilters;
};

const DEFAULT_PREFERENCES: CalendarPreferences = {
  view: "timeGridWeek",
  filters: DEFAULT_CALENDAR_FILTERS,
};

const CHANNEL_VALUES: SocialChannel[] = [
  "INSTAGRAM",
  "FACEBOOK",
  "YOUTUBE",
  "LINKEDIN",
];

function isCalendarViewType(value: unknown): value is CalendarViewType {
  return (
    value === "dayGridMonth" ||
    value === "timeGridWeek" ||
    value === "listWeek"
  );
}

export function getDefaultCalendarView(): CalendarViewType {
  if (typeof window === "undefined") return "timeGridWeek";
  return window.matchMedia("(max-width: 767px)").matches
    ? "listWeek"
    : "timeGridWeek";
}

function parseChannels(value: unknown): SocialChannel[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is SocialChannel =>
      typeof item === "string" &&
      CHANNEL_VALUES.includes(item as SocialChannel),
  );
}

function parseStatuses(value: unknown): PostStatus[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is PostStatus =>
      typeof item === "string" &&
      CALENDAR_STATUS_FILTER_OPTIONS.includes(item as PostStatus),
  );
}

function parseFilters(value: unknown): CalendarFilters {
  if (!value || typeof value !== "object") {
    return DEFAULT_CALENDAR_FILTERS;
  }

  const record = value as Record<string, unknown>;
  return {
    channels: parseChannels(record.channels),
    statuses: parseStatuses(record.statuses),
    searchQuery:
      typeof record.searchQuery === "string" ? record.searchQuery : "",
  };
}

export function loadCalendarPreferences(): CalendarPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_PREFERENCES;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        ...DEFAULT_PREFERENCES,
        view: getDefaultCalendarView(),
      };
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      view: isCalendarViewType(parsed.view)
        ? parsed.view
        : DEFAULT_PREFERENCES.view,
      filters: parseFilters(parsed.filters),
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function saveCalendarPreferences(preferences: CalendarPreferences): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Ignore quota / private mode errors.
  }
}

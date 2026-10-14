import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PostCalendarItem } from "@/lib/types/post-api";
import {
  DEFAULT_CALENDAR_FILTERS,
  filterPostsForCalendar,
} from "./filter-posts";

const project = {
  id: "proj_1",
  name: "Sanca",
  avatarUrl: null,
  type: "COMPANY" as const,
  accentColor: null,
};

function basePost(entryType: PostCalendarItem["entryType"]): PostCalendarItem {
  return {
    id: `p-${entryType}`,
    title: entryType,
    content: "x",
    scheduledAt: "2026-10-12T13:00:00.000Z",
    status: "SCHEDULED",
    channels: [],
    mediaUrls: [],
    projectId: project.id,
    project,
    entryType,
    durationMinutes: 30,
    currentStatus: "OPEN",
    attendanceType: null,
    clientName: null,
    appointmentStatus: null,
    serviceChannel: null,
    tasks: [],
  };
}

describe("filterPostsForCalendar entry types", () => {
  it("filtra por tipos visíveis sem recarregar", () => {
    const posts = [
      basePost("SOCIAL_POST"),
      basePost("PRODUCTION_EVENT"),
      basePost("SIMPLE_REMINDER"),
    ];
    const filtered = filterPostsForCalendar(posts, {
      ...DEFAULT_CALENDAR_FILTERS,
      visibleEntryTypes: ["SOCIAL_POST", "SIMPLE_REMINDER"],
    });
    assert.equal(filtered.length, 2);
    assert.ok(filtered.every((post) => post.entryType !== "PRODUCTION_EVENT"));
  });
});

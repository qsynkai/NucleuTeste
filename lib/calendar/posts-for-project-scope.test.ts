import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PostCalendarItem } from "@/lib/types/post-api";
import { postsForProjectScope } from "./posts-for-project-scope";

const project = {
  id: "proj_a",
  name: "A",
  avatarUrl: null,
  type: "COMPANY" as const,
  accentColor: null,
};

function item(
  id: string,
  projectId: string,
  sharedAsParticipant: boolean,
): PostCalendarItem {
  return {
    id,
    title: id,
    content: "",
    scheduledAt: "2026-10-12T13:00:00.000Z",
    status: "SCHEDULED",
    channels: [],
    mediaUrls: [],
    projectId,
    project: { ...project, id: projectId, name: projectId },
    entryType: "SIMPLE_REMINDER",
    durationMinutes: null,
    currentStatus: "OPEN",
    attendanceType: null,
    clientName: null,
    appointmentStatus: null,
    serviceChannel: null,
    tasks: [],
    sharedAsParticipant,
  };
}

describe("postsForProjectScope", () => {
  it("mantém convites mesmo em outro projeto", () => {
    const scoped = postsForProjectScope(
      [
        item("own", "proj_a", false),
        item("invite", "proj_b", true),
        item("other", "proj_b", false),
      ],
      "proj_a",
    );
    assert.deepEqual(scoped.map((p) => p.id), ["own", "invite"]);
  });
});

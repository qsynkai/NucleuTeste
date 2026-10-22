import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PostCalendarItem } from "@/lib/types/post-api";
import { mapPostsToCalendarEvents } from "./map-posts-to-events";

const project = {
  id: "proj_1",
  name: "Sanca",
  avatarUrl: null,
  type: "COMPANY" as const,
  accentColor: null,
};

function post(overrides: Partial<PostCalendarItem>): PostCalendarItem {
  return {
    id: "p1",
    title: "Post",
    content: "Legenda",
    scheduledAt: "2026-10-12T13:00:00.000Z",
    status: "SCHEDULED",
    channels: ["INSTAGRAM"],
    mediaUrls: [],
    projectId: project.id,
    project,
    entryType: "SOCIAL_POST",
    durationMinutes: 60,
    currentStatus: "OPEN",
    attendanceType: null,
    clientName: null,
    appointmentStatus: null,
    serviceChannel: null,
    tasks: [],
    sharedAsParticipant: false,
    ...overrides,
  };
}

describe("mapPostsToCalendarEvents", () => {
  it("ignora posts sem data", () => {
    assert.equal(mapPostsToCalendarEvents([post({ scheduledAt: null })]).length, 0);
  });

  it("leva projeto e flag de exibição em extendedProps", () => {
    const [event] = mapPostsToCalendarEvents([post({})], { showProject: true });
    assert.equal(event.extendedProps?.showProject, true);
    assert.equal(event.extendedProps?.project.name, "Sanca");
    assert.deepEqual(event.extendedProps?.channels, ["INSTAGRAM"]);
  });

  it("esconde o indicador de projeto por padrão", () => {
    const [event] = mapPostsToCalendarEvents([post({})]);
    assert.equal(event.extendedProps?.showProject, false);
  });

  it("propaga entryType e total de produção", () => {
    const [event] = mapPostsToCalendarEvents([
      post({
        entryType: "PRODUCTION_EVENT",
        tasks: [{ price: "150.50" }, { price: "49.50" }],
      }),
    ]);
    assert.equal(event.extendedProps?.entryType, "PRODUCTION_EVENT");
    assert.equal(event.extendedProps?.productionTotalCents, 20000);
  });
});

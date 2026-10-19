import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveEventAccess } from "@/lib/events/event-access";

describe("resolveEventAccess", () => {
  const event = {
    userId: "owner",
    participants: [
      { userId: "viewer", accessLevel: "VIEW" as const },
      { userId: "editor", accessLevel: "EDIT_CONTENT" as const },
    ],
    tasks: [],
  };

  it("dá edição ao participante com EDIT_CONTENT", () => {
    const access = resolveEventAccess(
      { id: "editor", role: "COLLABORATOR", isActive: true },
      event,
    );
    assert.equal(access.canEditContent, true);
    assert.equal(access.canManageParticipants, false);
  });

  it("limita parceiro convidado a visualização", () => {
    const access = resolveEventAccess(
      { id: "editor", role: "PARTNER", isActive: true },
      event,
    );
    assert.equal(access.canView, true);
    assert.equal(access.canEditContent, false);
  });
});

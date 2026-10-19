import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseEventParticipantsInput } from "@/lib/validators/event-participants";

describe("parseEventParticipantsInput", () => {
  it("ignora o dono e duplicatas", () => {
    const parsed = parseEventParticipantsInput(
      [
        { userId: "owner-1", accessLevel: "EDIT_CONTENT" },
        { userId: "u2", accessLevel: "VIEW" },
        { userId: "u2", accessLevel: "ADD_INFO" },
      ],
      "owner-1",
    );
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].userId, "u2");
    assert.equal(parsed[0].accessLevel, "VIEW");
  });

  it("rejeita nível inválido", () => {
    assert.throws(
      () =>
        parseEventParticipantsInput(
          [{ userId: "u2", accessLevel: "SUPERADMIN" }],
          "owner",
        ),
      /inválido/,
    );
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsePostPayload } from "./post-api";

const valid = {
  projectId: "proj_1",
  title: "Lançamento",
  content: "Legenda final",
  scheduledAt: "2026-10-12T13:00:00.000Z",
  channels: ["INSTAGRAM", "YOUTUBE"],
};

describe("parsePostPayload", () => {
  it("aceita um post completo e preserva o projeto", () => {
    const parsed = parsePostPayload({ ...valid, projectId: "  proj_1 " });
    assert.equal(parsed.projectId, "proj_1");
    assert.deepEqual(parsed.channels, ["INSTAGRAM", "YOUTUBE"]);
    assert.deepEqual(parsed.mediaUrls, []);
  });

  it("exige o projeto com mensagem clara", () => {
    assert.throws(() => parsePostPayload({ ...valid, projectId: undefined }), /Selecione o projeto/);
    assert.throws(() => parsePostPayload({ ...valid, projectId: "   " }), /Selecione o projeto/);
  });

  it("mantém as validações existentes", () => {
    assert.throws(() => parsePostPayload({ ...valid, title: "" }), /title/);
    assert.throws(() => parsePostPayload({ ...valid, channels: [] }), /ao menos uma rede/);
    assert.throws(() => parsePostPayload({ ...valid, channels: ["TIKTOK"] }), /Canal inválido/);
    assert.throws(() => parsePostPayload({ ...valid, scheduledAt: "ontem" }), /inválido/);
  });
});

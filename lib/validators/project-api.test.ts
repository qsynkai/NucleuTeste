import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseAccentColor,
  parseAvatarUrl,
  parseCreateProjectPayload,
  parseUpdateProjectPayload,
} from "./project-api";

const PNG_DATA_URL = "data:image/png;base64,iVBORw0KGgo=";

describe("parseCreateProjectPayload", () => {
  it("aceita o mínimo (nome) e aplica padrões", () => {
    const parsed = parseCreateProjectPayload({ name: "  Sanca  " });
    assert.equal(parsed.name, "Sanca");
    assert.equal(parsed.type, "OTHER");
    assert.equal(parsed.slug, null);
    assert.equal(parsed.avatarUrl, null);
    assert.equal(parsed.accentColor, null);
  });

  it("exige nome", () => {
    assert.throws(() => parseCreateProjectPayload({ name: "   " }), /nome/i);
    assert.throws(() => parseCreateProjectPayload({}), /nome/i);
    assert.throws(() => parseCreateProjectPayload(null), /inválido/i);
  });

  it("valida o tipo", () => {
    assert.throws(
      () => parseCreateProjectPayload({ name: "X", type: "AGENCY" }),
      /Tipo de projeto/,
    );
    assert.equal(
      parseCreateProjectPayload({ name: "X", type: "CAMPAIGN" }).type,
      "CAMPAIGN",
    );
  });

  it("valida slug explícito", () => {
    assert.equal(parseCreateProjectPayload({ name: "X", slug: "meu-slug" }).slug, "meu-slug");
    assert.throws(() => parseCreateProjectPayload({ name: "X", slug: "Meu Slug" }), /Slug/);
  });
});

describe("parseUpdateProjectPayload", () => {
  it("retorna apenas os campos enviados", () => {
    assert.deepEqual(parseUpdateProjectPayload({ isActive: false }), { isActive: false });
  });

  it("permite limpar avatar, descrição e cor com null", () => {
    assert.deepEqual(
      parseUpdateProjectPayload({ avatarUrl: null, description: "", accentColor: null }),
      { avatarUrl: null, description: null, accentColor: null },
    );
  });

  it("rejeita corpo sem campos e isActive não booleano", () => {
    assert.throws(() => parseUpdateProjectPayload({}), /Nenhum campo/);
    assert.throws(() => parseUpdateProjectPayload({ isActive: "false" }), /isActive/);
  });
});

describe("parseAvatarUrl", () => {
  it("aceita http(s) e data URL de imagem", () => {
    assert.equal(parseAvatarUrl("https://cdn.example.com/a.png"), "https://cdn.example.com/a.png");
    assert.equal(parseAvatarUrl(PNG_DATA_URL), PNG_DATA_URL);
    assert.equal(parseAvatarUrl(""), null);
  });

  it("aceita imagem hospedada no próprio app, mas não URLs protocol-relative", () => {
    assert.equal(parseAvatarUrl("/preview/avatars/ana.jpg"), "/preview/avatars/ana.jpg");
    assert.throws(() => parseAvatarUrl("//evil.example/a.png"), /inválido/);
    assert.throws(() => parseAvatarUrl("/a b.png"), /inválido/);
  });

  it("bloqueia esquemas perigosos e data URLs que não são imagem", () => {
    assert.throws(() => parseAvatarUrl("javascript:alert(1)"), /http/);
    assert.throws(() => parseAvatarUrl("data:text/html;base64,PGgxPg=="), /inválida/);
    assert.throws(() => parseAvatarUrl("data:image/svg+xml;base64,PHN2Zz4="), /inválida/);
  });
});

describe("parseAccentColor", () => {
  it("normaliza #RRGGBB para maiúsculas", () => {
    assert.equal(parseAccentColor("#a5d8ff"), "#A5D8FF");
    assert.equal(parseAccentColor(null), null);
  });

  it("rejeita formatos inválidos", () => {
    assert.throws(() => parseAccentColor("azul"), /Cor inválida/);
    assert.throws(() => parseAccentColor("#fff"), /Cor inválida/);
  });
});

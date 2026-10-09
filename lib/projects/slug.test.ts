import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findAvailableSlug, isValidSlug, slugify } from "./slug";

describe("slugify", () => {
  it("remove acentos, espaços e símbolos", () => {
    assert.equal(slugify("Campanha de Lançamento"), "campanha-de-lancamento");
    assert.equal(slugify("  Lucas   Souza! "), "lucas-souza");
  });

  it("usa um valor padrão quando o nome não gera slug", () => {
    assert.equal(slugify("!!!"), "projeto");
  });

  it("respeita o tamanho máximo sem terminar em hífen", () => {
    const slug = slugify("a".repeat(59) + " b" + "c".repeat(20));
    assert.ok(slug.length <= 60);
    assert.ok(!slug.endsWith("-"));
  });
});

describe("isValidSlug", () => {
  it("aceita minúsculas, números e hífens simples", () => {
    assert.equal(isValidSlug("sanca-2"), true);
  });

  it("rejeita maiúsculas, hífens duplos e bordas com hífen", () => {
    assert.equal(isValidSlug("Sanca"), false);
    assert.equal(isValidSlug("a--b"), false);
    assert.equal(isValidSlug("-a"), false);
  });
});

describe("findAvailableSlug", () => {
  it("retorna a base quando está livre", async () => {
    assert.equal(await findAvailableSlug("sanca", async () => false), "sanca");
  });

  it("acrescenta sufixo numérico até achar um slug livre", async () => {
    const taken = new Set(["sanca", "sanca-2"]);
    assert.equal(
      await findAvailableSlug("sanca", async (slug) => taken.has(slug)),
      "sanca-3",
    );
  });
});

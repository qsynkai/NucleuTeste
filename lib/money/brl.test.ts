import assert from "node:assert/strict";
import test from "node:test";
import {
  centsToMoneyString,
  formatBrlFromCents,
  parseMoneyToCents,
  sumMoneyCents,
} from "./brl";

test("parseMoneyToCents normaliza vírgula e duas casas", () => {
  assert.equal(parseMoneyToCents("150,5"), 15050);
  assert.equal(parseMoneyToCents("10.25"), 1025);
});

test("sumMoneyCents evita erro de ponto flutuante", () => {
  assert.equal(sumMoneyCents(["0.1", "0.2"]), 30);
  assert.equal(sumMoneyCents(["199.99", "0.01"]), 20000);
});

test("centsToMoneyString", () => {
  assert.equal(centsToMoneyString(15050), "150.50");
});

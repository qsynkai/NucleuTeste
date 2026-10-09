import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { fetchWithRetry } from "./fetch-with-retry";

const realFetch = globalThis.fetch;

function mockFetch(statuses: Array<number | "network-error">) {
  const calls: number[] = [];
  globalThis.fetch = (async () => {
    const next = statuses[calls.length] ?? 200;
    calls.push(calls.length);
    if (next === "network-error") throw new TypeError("fetch failed");
    return new Response(null, { status: next });
  }) as typeof fetch;
  return calls;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("fetchWithRetry", () => {
  it("devolve na hora quando a resposta não é 503", async () => {
    const calls = mockFetch([200]);
    const response = await fetchWithRetry("/api/x");
    assert.equal(response.status, 200);
    assert.equal(calls.length, 1);
  });

  it("não repete erros que não são 503 (ex.: 404)", async () => {
    const calls = mockFetch([404]);
    assert.equal((await fetchWithRetry("/api/x")).status, 404);
    assert.equal(calls.length, 1);
  });

  it("repete após 503 e devolve a resposta boa", async () => {
    const calls = mockFetch([503, 200]);
    const response = await fetchWithRetry("/api/x");
    assert.equal(response.status, 200);
    assert.equal(calls.length, 2);
  });

  it("repete após falha de rede", async () => {
    const calls = mockFetch(["network-error", 200]);
    assert.equal((await fetchWithRetry("/api/x")).status, 200);
    assert.equal(calls.length, 2);
  });
});

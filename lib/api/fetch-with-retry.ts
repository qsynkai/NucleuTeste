const RETRY_DELAYS_MS = [400, 900, 1800];

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * fetch para leituras (GET): repete quando o servidor responde 503 (banco
 * momentaneamente inacessível) ou a rede falha, em vez de mostrar erro ao
 * usuário. Não use para mutações.
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  for (let attempt = 0; ; attempt += 1) {
    const delay = RETRY_DELAYS_MS[attempt];

    try {
      const response = await fetch(input, init);
      if (response.status !== 503 || delay === undefined) return response;
    } catch (error: unknown) {
      if (delay === undefined) throw error;
    }

    await wait(delay);
  }
}

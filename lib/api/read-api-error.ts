export async function readApiErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    const message = data.error?.trim();
    return message || fallback;
  } catch {
    return fallback;
  }
}

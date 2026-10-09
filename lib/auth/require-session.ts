import { getSessionUserId } from "@/lib/auth/get-session-user-id";
import { NextResponse } from "next/server";

export type SessionAuth =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse<{ error: string }> };

export async function requireSession(): Promise<SessionAuth> {
  const userId = await getSessionUserId();
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Não autenticado." },
        { status: 401 },
      ),
    };
  }
  return { ok: true, userId };
}

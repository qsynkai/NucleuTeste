import {
  getSessionCookieName,
  verifySessionToken,
} from "@/lib/auth/session";
import { cookies } from "next/headers";

export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  if (!token) return null;

  const session = await verifySessionToken(token);
  return session?.userId ?? null;
}

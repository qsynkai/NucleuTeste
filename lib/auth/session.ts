import { SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE = "ia_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getSecretKey(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("NEXTAUTH_SECRET inválido.");
  }
  return new TextEncoder().encode(secret);
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE;
}

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const userId = payload.sub;
    if (!userId) return null;
    return { userId };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};

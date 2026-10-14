import type { Role } from "@prisma/client";
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

export async function createSessionToken(
  userId: string,
  role: Role,
): Promise<string> {
  return new SignJWT({ sub: userId, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<{ userId: string; role: Role } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const userId = payload.sub;
    const role = payload.role;
    if (!userId || typeof role !== "string") return null;
    if (
      role !== "ADMIN" &&
      role !== "COLLABORATOR" &&
      role !== "TECHNICIAN" &&
      role !== "PARTNER"
    ) {
      return null;
    }
    return { userId, role };
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

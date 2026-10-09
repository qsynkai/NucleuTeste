import { getSessionCookieName, sessionCookieOptions } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(getSessionCookieName(), "", {
    ...sessionCookieOptions,
    maxAge: 0,
  });
  return response;
}

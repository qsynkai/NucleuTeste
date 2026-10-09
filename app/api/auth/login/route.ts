import {
  createSessionToken,
  getSessionCookieName,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { databaseUnavailableResponse } from "@/lib/prisma/database-unavailable-response";
import { isDatabaseUnavailable } from "@/lib/prisma/is-database-unavailable";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Informe login e senha." },
      { status: 400 },
    );
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: "Credenciais inválidas." },
        { status: 401 },
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Credenciais inválidas." },
        { status: 401 },
      );
    }

    const token = await createSessionToken(user.id);
    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
    });
    response.cookies.set(getSessionCookieName(), token, sessionCookieOptions);
    return response;
  } catch (error: unknown) {
    console.error("[POST /api/auth/login]", error);

    if (isDatabaseUnavailable(error)) {
      return databaseUnavailableResponse("POST /api/auth/login");
    }

    return NextResponse.json(
      { error: "Não foi possível autenticar." },
      { status: 500 },
    );
  }
}

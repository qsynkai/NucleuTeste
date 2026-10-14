import { getSessionUserId } from "@/lib/auth/get-session-user-id";
import type { AuthUser } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";
import { NextResponse } from "next/server";

export type SessionUser = AuthUser & {
  name: string;
  email: string;
};

export type UserAuth =
  | { ok: true; user: SessionUser }
  | { ok: false; response: NextResponse<{ error: string }> };

export async function loadSessionUser(
  userId: string,
): Promise<SessionUser | null> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
  });
  if (!row || !row.isActive) return null;
  return row;
}

export async function requireUser(): Promise<UserAuth> {
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

  try {
    const user = await loadSessionUser(userId);
    if (!user) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Sessão inválida ou usuário inativo." },
          { status: 403 },
        ),
      };
    }
    return { ok: true, user };
  } catch (error: unknown) {
    console.error("[requireUser]", error);
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Não foi possível validar a sessão." },
        { status: 500 },
      ),
    };
  }
}

export function forbidden(message = "Ação não permitida para seu perfil.") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function parseRole(value: unknown): Role | null {
  if (
    value === "ADMIN" ||
    value === "COLLABORATOR" ||
    value === "TECHNICIAN" ||
    value === "PARTNER"
  ) {
    return value;
  }
  return null;
}

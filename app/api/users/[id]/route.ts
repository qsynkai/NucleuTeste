import { canManageUsers } from "@/lib/auth/permissions";
import { forbidden, parseRole, requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import type { UserListItem } from "@/lib/types/user-api";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

type PatchBody = {
  isActive?: boolean;
  role?: string;
  /** Admin redefine senha de outro usuário. */
  newPassword?: string;
};

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<NextResponse<UserListItem | { error: string }>> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  if (!canManageUsers(auth.user)) return forbidden();

  const { id } = await context.params;
  if (!id.trim()) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  if (id === auth.user.id) {
    return NextResponse.json(
      { error: "Você não pode alterar sua própria conta por aqui." },
      { status: 400 },
    );
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const data: {
    isActive?: boolean;
    role?: import("@prisma/client").Role;
    passwordHash?: string;
  } = {};

  if (typeof body.isActive === "boolean") data.isActive = body.isActive;

  if (body.role !== undefined) {
    const role = parseRole(body.role);
    if (!role) {
      return NextResponse.json({ error: "Perfil inválido." }, { status: 400 });
    }
    data.role = role;
  }

  if (body.newPassword !== undefined) {
    if (typeof body.newPassword !== "string" || body.newPassword.length < 4) {
      return NextResponse.json(
        { error: "Nova senha deve ter ao menos 4 caracteres." },
        { status: 400 },
      );
    }
    data.passwordHash = await bcrypt.hash(body.newPassword, 12);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }
}

import {
  canManageUsers,
} from "@/lib/auth/permissions";
import { forbidden, parseRole, requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import type { UserListItem, UsersListResponse } from "@/lib/types/user-api";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function GET(): Promise<
  NextResponse<UsersListResponse | { error: string }>
> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  if (!canManageUsers(auth.user)) return forbidden();

  const rows = await prisma.user.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  const users: UserListItem[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
  }));

  return NextResponse.json({ users });
}

type CreateUserBody = {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
};

export async function POST(
  request: Request,
): Promise<NextResponse<UserListItem | { error: string }>> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  if (!canManageUsers(auth.user)) return forbidden();

  let body: CreateUserBody;
  try {
    body = (await request.json()) as CreateUserBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const role = parseRole(body.role);

  if (!name || !email || password.length < 4) {
    return NextResponse.json(
      { error: "Informe nome, e-mail e senha provisória (mín. 4 caracteres)." },
      { status: 400 },
    );
  }
  if (!role) {
    return NextResponse.json({ error: "Perfil de acesso inválido." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const created = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        id: created.id,
        name: created.name,
        email: created.email,
        role: created.role,
        isActive: created.isActive,
        createdAt: created.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Não foi possível cadastrar. E-mail já existe?" },
      { status: 409 },
    );
  }
}

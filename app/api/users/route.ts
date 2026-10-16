import { canManageUsers } from "@/lib/auth/permissions";
import { forbidden, parseRole, requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { findAvailableSlug, slugify } from "@/lib/projects/slug";
import type { UserListItem, UsersListResponse } from "@/lib/types/user-api";
import { Prisma } from "@prisma/client";
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
      { error: "Informe nome, login e senha provisória (mín. 4 caracteres)." },
      { status: 400 },
    );
  }
  if (!role) {
    return NextResponse.json({ error: "Perfil de acesso inválido." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const slugExists = async (slug: string) =>
      (await prisma.project.count({ where: { slug } })) > 0;
    const projectSlug = await findAvailableSlug(slugify(name), slugExists);

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, passwordHash, role, isActive: true },
        select: {
          id: true, name: true, email: true, role: true,
          isActive: true, createdAt: true,
        },
      });

      await tx.project.create({
        data: {
          name: "Geral",
          slug: projectSlug,
          type: "OTHER",
          isActive: true,
          ownerId: user.id,
        },
      });

      return user;
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
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Esse login já está em uso por outro usuário." },
        { status: 409 },
      );
    }
    console.error("[POST /api/users]", error);
    return NextResponse.json(
      { error: "Não foi possível cadastrar o usuário." },
      { status: 500 },
    );
  }
}

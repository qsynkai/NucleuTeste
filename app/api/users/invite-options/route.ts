import { canCreateEvent } from "@/lib/auth/permissions";
import { forbidden, requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export type InviteUserOption = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export async function GET(): Promise<
  NextResponse<{ users: InviteUserOption[] } | { error: string }>
> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  if (!canCreateEvent(auth.user)) return forbidden();

  try {
    const rows = await prisma.user.findMany({
      where: {
        isActive: true,
        id: { not: auth.user.id },
      },
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json({ users: rows });
  } catch (error: unknown) {
    console.error("[GET /api/users/invite-options]", error);
    return NextResponse.json(
      { error: "Não foi possível carregar usuários." },
      { status: 500 },
    );
  }
}

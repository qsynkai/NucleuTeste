import { requireSession } from "@/lib/auth/require-session";
import { prisma } from "@/lib/prisma";
import { getProjectItem } from "@/lib/projects/query-projects";
import type { ProjectListItem } from "@/lib/types/project-api";
import { parseUpdateProjectPayload } from "@/lib/validators/project-api";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse<ProjectListItem | { error: string }>> {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id.trim()) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  try {
    const project = await getProjectItem(auth.userId, id);
    if (!project) {
      return NextResponse.json(
        { error: "Projeto não encontrado." },
        { status: 404 },
      );
    }
    return NextResponse.json(project);
  } catch (error: unknown) {
    console.error("[GET /api/projects/[id]]", error);
    return NextResponse.json(
      { error: "Não foi possível carregar o projeto." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<NextResponse<ProjectListItem | { error: string }>> {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id.trim()) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  let changes;
  try {
    changes = parseUpdateProjectPayload(body);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Dados inválidos.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const updated = await prisma.project.updateMany({
      where: { id, ownerId: auth.userId },
      data: changes,
    });
    if (updated.count === 0) {
      return NextResponse.json(
        { error: "Projeto não encontrado." },
        { status: 404 },
      );
    }

    const project = await getProjectItem(auth.userId, id);
    if (!project) {
      return NextResponse.json(
        { error: "Projeto não encontrado." },
        { status: 404 },
      );
    }
    return NextResponse.json(project);
  } catch (error: unknown) {
    console.error("[PATCH /api/projects/[id]]", error);
    return NextResponse.json(
      { error: "Não foi possível atualizar o projeto." },
      { status: 500 },
    );
  }
}

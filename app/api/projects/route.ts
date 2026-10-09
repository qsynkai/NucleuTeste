import { requireSession } from "@/lib/auth/require-session";
import { prisma } from "@/lib/prisma";
import { databaseUnavailableResponse } from "@/lib/prisma/database-unavailable-response";
import { isDatabaseUnavailable } from "@/lib/prisma/is-database-unavailable";
import { getProjectItem, listProjectItems } from "@/lib/projects/query-projects";
import { findAvailableSlug, slugify } from "@/lib/projects/slug";
import type { ProjectListItem, ProjectsListResponse } from "@/lib/types/project-api";
import { parseCreateProjectPayload } from "@/lib/validators/project-api";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
): Promise<NextResponse<ProjectsListResponse | { error: string }>> {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const includeArchived =
    new URL(request.url).searchParams.get("includeArchived") === "1";

  try {
    const projects = await listProjectItems(auth.userId, { includeArchived });
    return NextResponse.json({ projects });
  } catch (error: unknown) {
    console.error("[GET /api/projects]", error);
    if (isDatabaseUnavailable(error)) {
      return databaseUnavailableResponse("GET /api/projects");
    }
    return NextResponse.json(
      { error: "Não foi possível carregar os projetos." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
): Promise<NextResponse<ProjectListItem | { error: string }>> {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  let payload;
  try {
    payload = parseCreateProjectPayload(body);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Dados inválidos.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const slugExists = async (slug: string) =>
    (await prisma.project.count({ where: { slug } })) > 0;

  try {
    const explicitSlug = payload.slug;
    if (explicitSlug && (await slugExists(explicitSlug))) {
      return NextResponse.json(
        { error: "Já existe um projeto com esse identificador (slug)." },
        { status: 409 },
      );
    }

    const create = async (slug: string) =>
      prisma.project.create({
        data: {
          name: payload.name,
          slug,
          type: payload.type,
          avatarUrl: payload.avatarUrl,
          description: payload.description,
          accentColor: payload.accentColor,
          ownerId: auth.userId,
        },
        select: { id: true },
      });

    const baseSlug = explicitSlug ?? (await findAvailableSlug(slugify(payload.name), slugExists));

    let created: { id: string };
    try {
      created = await create(baseSlug);
    } catch (error: unknown) {
      const isSlugRace =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002";
      if (!isSlugRace || explicitSlug) throw error;
      created = await create(`${baseSlug.slice(0, 52)}-${Date.now().toString(36).slice(-6)}`);
    }

    const item = await getProjectItem(auth.userId, created.id);
    if (!item) {
      return NextResponse.json(
        { error: "Não foi possível salvar o projeto." },
        { status: 500 },
      );
    }
    return NextResponse.json(item, { status: 201 });
  } catch (error: unknown) {
    console.error("[POST /api/projects]", error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Já existe um projeto com esse identificador (slug)." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Não foi possível salvar o projeto." },
      { status: 500 },
    );
  }
}

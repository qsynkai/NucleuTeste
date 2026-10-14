import { canCreateEvent } from "@/lib/auth/permissions";
import { forbidden, requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { databaseUnavailableResponse } from "@/lib/prisma/database-unavailable-response";
import { isDatabaseUnavailable } from "@/lib/prisma/is-database-unavailable";
import { postInclude } from "@/lib/posts/post-include";
import { serializePost } from "@/lib/posts/serialize-post";
import { requireOwnedProject } from "@/lib/projects/access";
import type { PostCalendarItem, PostsListResponse } from "@/lib/types/post-api";
import { parsePostPayload } from "@/lib/validators/post-api";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
): Promise<NextResponse<PostsListResponse | { error: string }>> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const projectId =
    new URL(request.url).searchParams.get("projectId")?.trim() || null;

  try {
    let where: Prisma.PostWhereInput;

    if (projectId) {
      const access = await requireOwnedProject(auth.user.id, projectId, {
        allowArchived: true,
      });
      if (!access.ok) return access.response;
      where = { userId: auth.user.id, projectId };
    } else {
      // Visão global: todos os projetos ativos do usuário.
      where = { userId: auth.user.id, project: { isActive: true } };
    }

    const rows = await prisma.post.findMany({
      where,
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
      include: postInclude,
    });

    const posts: PostCalendarItem[] = rows.map(serializePost);

    return NextResponse.json({ posts });
  } catch (error: unknown) {
    console.error("[GET /api/posts]", error);
    if (isDatabaseUnavailable(error)) {
      return databaseUnavailableResponse("GET /api/posts");
    }
    return NextResponse.json(
      { error: "Não foi possível carregar as postagens." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
): Promise<NextResponse<PostCalendarItem | { error: string }>> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  if (!canCreateEvent(auth.user)) return forbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  let payload;
  try {
    payload = parsePostPayload(body);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Dados inválidos.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const access = await requireOwnedProject(auth.user.id, payload.projectId, {
      allowArchived: false,
    });
    if (!access.ok) return access.response;

    const created = await prisma.post.create({
      data: {
        title: payload.title,
        content: payload.content,
        scheduledAt: payload.scheduledAt,
        status: "SCHEDULED",
        mediaUrls: payload.mediaUrls,
        userId: auth.user.id,
        projectId: access.project.id,
        channels: {
          create: payload.channels.map((channel) => ({ channel })),
        },
      },
      include: postInclude,
    });

    return NextResponse.json(serializePost(created), { status: 201 });
  } catch (error: unknown) {
    console.error("[POST /api/posts]", error);
    return NextResponse.json(
      { error: "Não foi possível salvar a postagem." },
      { status: 500 },
    );
  }
}

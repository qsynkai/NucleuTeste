import { canCreateEvent } from "@/lib/auth/permissions";
import { forbidden, requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { databaseUnavailableResponse } from "@/lib/prisma/database-unavailable-response";
import { isDatabaseUnavailable } from "@/lib/prisma/is-database-unavailable";
import { postInclude } from "@/lib/posts/post-include";
import { serializePost } from "@/lib/posts/serialize-post";
import { syncEventParticipants } from "@/lib/events/sync-participants";
import { postsVisibleWhere } from "@/lib/posts/visibility";
import { canListPostsInProject, requireOwnedProject } from "@/lib/projects/access";
import { parseEventParticipantsInput } from "@/lib/validators/event-participants";
import type { PostCalendarItem, PostsListResponse } from "@/lib/types/post-api";
import { parsePostPayload } from "@/lib/validators/post-api";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
): Promise<NextResponse<PostsListResponse | { error: string }>> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const projectId =
    new URL(request.url).searchParams.get("projectId")?.trim() || null;

  try {
    if (projectId) {
      const allowed = await canListPostsInProject(auth.user.id, projectId);
      if (!allowed) {
        return NextResponse.json(
          { error: "Projeto não encontrado." },
          { status: 404 },
        );
      }
    }

    const where = postsVisibleWhere(auth.user.id, projectId);

    const rows = await prisma.post.findMany({
      where,
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
      include: postInclude,
    });

    const posts: PostCalendarItem[] = rows.map((row) =>
      serializePost(row, auth.user.id),
    );

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

  const record =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};

  let participants;
  try {
    participants = parseEventParticipantsInput(
      record.participants,
      auth.user.id,
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Participantes inválidos.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const access = await requireOwnedProject(auth.user.id, payload.projectId, {
      allowArchived: false,
    });
    if (!access.ok) return access.response;

    const created = await prisma.$transaction(async (tx) => {
      const post = await tx.post.create({
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
      if (participants.length > 0) {
        await syncEventParticipants(
          tx as import("@prisma/client").Prisma.TransactionClient,
          post.id,
          participants,
        );
      }
      return post;
    });

    return NextResponse.json(serializePost(created, auth.user.id), {
      status: 201,
    });
  } catch (error: unknown) {
    console.error("[POST /api/posts]", error);
    return NextResponse.json(
      { error: "Não foi possível salvar a postagem." },
      { status: 500 },
    );
  }
}

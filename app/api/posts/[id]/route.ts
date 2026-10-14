import { canDeleteEvent, canEditEventContent } from "@/lib/auth/permissions";
import { forbidden, requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { postInclude } from "@/lib/posts/post-include";
import { serializePost } from "@/lib/posts/serialize-post";
import { requireOwnedProject } from "@/lib/projects/access";
import type { PostCalendarItem } from "@/lib/types/post-api";
import {
  isNonEmptyString,
  parsePostPayload,
  parseScheduledAt,
} from "@/lib/validators/post-api";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse<PostCalendarItem | { error: string }>> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  if (!id.trim()) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  try {
    const post = await prisma.post.findFirst({
      where: { id, userId: auth.user.id },
      include: postInclude,
    });

    if (!post) {
      return NextResponse.json(
        { error: "Postagem não encontrada." },
        { status: 404 },
      );
    }

    return NextResponse.json(serializePost(post));
  } catch (error: unknown) {
    console.error("[GET /api/posts/[id]]", error);
    return NextResponse.json(
      { error: "Não foi possível carregar a postagem." },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  context: RouteContext,
): Promise<NextResponse<PostCalendarItem | { error: string }>> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  if (!canEditEventContent(auth.user)) return forbidden();

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

  let payload;
  try {
    payload = parsePostPayload(body);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Dados inválidos.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const owned = await prisma.post.findFirst({
      where: { id, userId: auth.user.id },
      select: { id: true, projectId: true },
    });
    if (!owned) {
      return NextResponse.json(
        { error: "Postagem não encontrada." },
        { status: 404 },
      );
    }

    // Mover para outro projeto exige que ele seja do usuário e esteja ativo.
    const access = await requireOwnedProject(auth.user.id, payload.projectId, {
      allowArchived: payload.projectId === owned.projectId,
    });
    if (!access.ok) return access.response;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.postChannel.deleteMany({ where: { postId: id } });
      return tx.post.update({
        where: { id },
        data: {
          title: payload.title,
          content: payload.content,
          scheduledAt: payload.scheduledAt,
          status: "SCHEDULED",
          mediaUrls: payload.mediaUrls,
          projectId: access.project.id,
          channels: {
            create: payload.channels.map((channel) => ({ channel })),
          },
        },
        include: postInclude,
      });
    });

    return NextResponse.json(serializePost(updated));
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Postagem não encontrada." },
        { status: 404 },
      );
    }

    console.error("[PUT /api/posts/[id]]", error);
    return NextResponse.json(
      { error: "Não foi possível atualizar a postagem." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<NextResponse<PostCalendarItem | { error: string }>> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  if (!canEditEventContent(auth.user)) return forbidden();

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

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const hasSchedule = "scheduledAt" in record;
  const hasProject = "projectId" in record;

  if (!hasSchedule && !hasProject) {
    return NextResponse.json(
      { error: "Corpo deve conter scheduledAt e/ou projectId." },
      { status: 400 },
    );
  }

  const data: Prisma.PostUncheckedUpdateManyInput = {};

  if (hasSchedule) {
    try {
      data.scheduledAt = parseScheduledAt(record.scheduledAt);
      data.status = "SCHEDULED";
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "scheduledAt inválido.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  try {
    if (hasProject) {
      if (!isNonEmptyString(record.projectId)) {
        return NextResponse.json(
          { error: "Selecione o projeto do post." },
          { status: 400 },
        );
      }

      const current = await prisma.post.findFirst({
        where: { id, userId: auth.user.id },
        select: { projectId: true },
      });
      if (!current) {
        return NextResponse.json(
          { error: "Postagem não encontrada." },
          { status: 404 },
        );
      }

      const targetId = record.projectId.trim();
      const access = await requireOwnedProject(auth.user.id, targetId, {
        allowArchived: targetId === current.projectId,
      });
      if (!access.ok) return access.response;

      data.projectId = access.project.id;
    }

    const updated = await prisma.post.updateMany({
      where: { id, userId: auth.user.id, project: { ownerId: auth.user.id } },
      data,
    });
    if (updated.count === 0) {
      return NextResponse.json(
        { error: "Postagem não encontrada." },
        { status: 404 },
      );
    }

    const post = await prisma.post.findFirst({
      where: { id, userId: auth.user.id },
      include: postInclude,
    });
    if (!post) {
      return NextResponse.json(
        { error: "Postagem não encontrada." },
        { status: 404 },
      );
    }

    return NextResponse.json(serializePost(post));
  } catch (error: unknown) {
    console.error("[PATCH /api/posts/[id]]", error);
    return NextResponse.json(
      { error: "Não foi possível atualizar a postagem." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse<{ success: true } | { error: string }>> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  if (!canDeleteEvent(auth.user)) return forbidden();

  const { id } = await context.params;

  if (!id.trim()) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  try {
    const where =
      auth.user.role === "ADMIN" ? { id } : { id, userId: auth.user.id };
    const deleted = await prisma.post.deleteMany({ where });
    if (deleted.count === 0) {
      return NextResponse.json(
        { error: "Postagem não encontrada." },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[DELETE /api/posts/[id]]", error);
    return NextResponse.json(
      { error: "Não foi possível excluir a postagem." },
      { status: 500 },
    );
  }
}

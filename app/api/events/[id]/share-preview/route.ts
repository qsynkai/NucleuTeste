import { resolveEventAccess } from "@/lib/events/event-access";
import { eventInclude } from "@/lib/events/event-include";
import { createSharePreviewToken } from "@/lib/events/share-preview-token";
import { serializeEvent } from "@/lib/events/serialize-event";
import { forbidden, requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import type { EventListItem } from "@/lib/types/event-api";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

function requestOrigin(request: Request): string | null {
  try {
    return new URL(request.url).origin;
  } catch {
    return null;
  }
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<NextResponse<EventListItem | { error: string }>> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id.trim()) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  const existing = await prisma.post.findFirst({
    where: { id },
    include: eventInclude,
  });
  if (!existing) {
    return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });
  }

  const access = resolveEventAccess(auth.user, existing);
  if (!access.canManageShareLink) return forbidden();

  const token = existing.sharePreviewToken ?? createSharePreviewToken();

  const updated = await prisma.post.update({
    where: { id },
    data: {
      sharePreviewToken: token,
      sharePreviewEnabled: true,
    },
    include: eventInclude,
  });

  return NextResponse.json(serializeEvent(updated, requestOrigin(request), auth.user.id));
}

export async function DELETE(
  request: Request,
  context: RouteContext,
): Promise<NextResponse<EventListItem | { error: string }>> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id.trim()) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  const existing = await prisma.post.findFirst({
    where: { id },
    include: eventInclude,
  });
  if (!existing) {
    return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });
  }

  const access = resolveEventAccess(auth.user, existing);
  if (!access.canManageShareLink) return forbidden();

  const updated = await prisma.post.update({
    where: { id },
    data: { sharePreviewEnabled: false },
    include: eventInclude,
  });

  return NextResponse.json(serializeEvent(updated, requestOrigin(request), auth.user.id));
}

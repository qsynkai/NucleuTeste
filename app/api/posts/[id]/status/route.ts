import { requireSession } from "@/lib/auth/require-session";
import { prisma } from "@/lib/prisma";
import { postInclude } from "@/lib/posts/post-include";
import { serializePost } from "@/lib/posts/serialize-post";
import type { PostCalendarItem } from "@/lib/types/post-api";
import { parsePostStatus } from "@/lib/validators/social";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<NextResponse<PostCalendarItem | { error: string }>> {
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

  if (!body || typeof body !== "object" || !("status" in body)) {
    return NextResponse.json(
      { error: "Corpo deve conter status." },
      { status: 400 },
    );
  }

  let status;
  try {
    status = parsePostStatus(String((body as { status: unknown }).status));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Status inválido.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const updated = await prisma.post.updateMany({
      where: { id, userId: auth.userId },
      data: { status },
    });
    if (updated.count === 0) {
      return NextResponse.json(
        { error: "Postagem não encontrada." },
        { status: 404 },
      );
    }

    const post = await prisma.post.findFirst({
      where: { id, userId: auth.userId },
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
    console.error("[PATCH /api/posts/[id]/status]", error);
    return NextResponse.json(
      { error: "Não foi possível atualizar o status." },
      { status: 500 },
    );
  }
}

import { eventInclude } from "@/lib/events/event-include";
import { toPublicEventPreview } from "@/lib/events/public-preview";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const { token } = await context.params;
  if (!token.trim()) {
    return NextResponse.json({ error: "Link inválido." }, { status: 400 });
  }

  const post = await prisma.post.findFirst({
    where: {
      sharePreviewToken: token,
      sharePreviewEnabled: true,
    },
    include: eventInclude,
  });

  if (!post) {
    return NextResponse.json(
      { error: "Preview indisponível ou link revogado." },
      { status: 404 },
    );
  }

  return NextResponse.json(toPublicEventPreview(post));
}

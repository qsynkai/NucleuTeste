import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export type ProjectAccess =
  | { ok: true; project: { id: string; isActive: boolean } }
  | { ok: false; response: NextResponse<{ error: string }> };

/**
 * Garante que o projeto existe e pertence ao usuário autenticado.
 * Projetos de outros usuários respondem 404 (sem revelar a existência).
 * `allowArchived: false` bloqueia vínculos novos com projetos arquivados.
 */
export async function requireOwnedProject(
  userId: string,
  projectId: string,
  options: { allowArchived: boolean },
): Promise<ProjectAccess> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: userId },
    select: { id: true, isActive: true },
  });

  if (!project) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Projeto não encontrado." },
        { status: 404 },
      ),
    };
  }

  if (!project.isActive && !options.allowArchived) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "Este projeto está arquivado. Reative-o em Projetos para agendar novas postagens.",
        },
        { status: 409 },
      ),
    };
  }

  return { ok: true, project };
}

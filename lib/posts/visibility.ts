import type { Prisma } from "@prisma/client";

export function postsVisibleWhere(
  userId: string,
  projectId: string | null,
): Prisma.PostWhereInput {
  const visibility: Prisma.PostWhereInput = {
    OR: [
      { userId },
      { participants: { some: { userId } } },
    ],
  };

  if (projectId) {
    return { AND: [visibility, { projectId }] };
  }

  return { AND: [visibility, { project: { isActive: true } }] };
}

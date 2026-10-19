import { postInclude } from "@/lib/posts/post-include";
import type { Prisma } from "@prisma/client";

export const eventInclude = {
  ...postInclude,
  tasks: {
    include: {
      taskCatalog: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
  statusHistory: {
    orderBy: { createdAt: "desc" as const },
    include: {
      user: { select: { id: true, name: true } },
    },
  },
  participants: {
    orderBy: { createdAt: "asc" as const },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  },
} satisfies Prisma.PostInclude;

export type EventWithRelations = Prisma.PostGetPayload<{
  include: typeof eventInclude;
}>;

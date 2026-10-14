import type { Prisma } from "@prisma/client";

export const projectSummarySelect = {
  id: true,
  name: true,
  avatarUrl: true,
  type: true,
  accentColor: true,
} satisfies Prisma.ProjectSelect;

export const postInclude = {
  channels: {
    select: { channel: true },
    orderBy: { channel: "asc" },
  },
  project: { select: projectSummarySelect },
  tasks: {
    select: { price: true },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.PostInclude;

export type PostWithRelations = Prisma.PostGetPayload<{
  include: typeof postInclude;
}>;

import { prisma } from "@/lib/prisma";
import type { ProjectListItem } from "@/lib/types/project-api";
import type { Prisma, Project } from "@prisma/client";

type ProjectRow = Project & { _count: { posts: number } };

function toListItem(row: ProjectRow, upcomingCount: number): ProjectListItem {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    type: row.type,
    avatarUrl: row.avatarUrl,
    description: row.description,
    accentColor: row.accentColor,
    isActive: row.isActive,
    postCount: row._count.posts,
    upcomingCount,
    createdAt: row.createdAt.toISOString(),
  };
}

async function upcomingCountsByProject(
  userId: string,
  projectIds: string[],
  now: Date,
): Promise<Map<string, number>> {
  if (projectIds.length === 0) return new Map();

  const groups = await prisma.post.groupBy({
    by: ["projectId"],
    where: {
      userId,
      projectId: { in: projectIds },
      scheduledAt: { gte: now },
      status: { in: ["DRAFT", "SCHEDULED"] },
    },
    _count: { _all: true },
  });

  return new Map(groups.map((group) => [group.projectId, group._count._all]));
}

async function toListItems(
  userId: string,
  rows: ProjectRow[],
  now: Date,
): Promise<ProjectListItem[]> {
  const upcoming = await upcomingCountsByProject(
    userId,
    rows.map((row) => row.id),
    now,
  );
  return rows.map((row) => toListItem(row, upcoming.get(row.id) ?? 0));
}

export async function listProjectItems(
  userId: string,
  options: { includeArchived: boolean },
  now = new Date(),
): Promise<ProjectListItem[]> {
  const where: Prisma.ProjectWhereInput = {
    ownerId: userId,
    ...(options.includeArchived ? {} : { isActive: true }),
  };

  const rows = await prisma.project.findMany({
    where,
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: { _count: { select: { posts: true } } },
  });

  return toListItems(userId, rows, now);
}

export async function getProjectItem(
  userId: string,
  projectId: string,
  now = new Date(),
): Promise<ProjectListItem | null> {
  const row = await prisma.project.findFirst({
    where: { id: projectId, ownerId: userId },
    include: { _count: { select: { posts: true } } },
  });
  if (!row) return null;

  const [item] = await toListItems(userId, [row], now);
  return item;
}

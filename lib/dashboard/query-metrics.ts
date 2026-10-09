import { prisma } from "@/lib/prisma";
import { projectSummarySelect } from "@/lib/posts/post-include";
import type {
  DashboardChannelCounts,
  DashboardMetricsResponse,
  DashboardStatusCounts,
} from "@/lib/types/dashboard-metrics";
import type { Prisma, PostStatus, SocialChannel } from "@prisma/client";

const ACTIVE_UPCOMING_STATUSES: PostStatus[] = ["DRAFT", "SCHEDULED"];

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function startOfNextMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0);
}

function emptyChannelCounts(): DashboardChannelCounts {
  return {
    INSTAGRAM: 0,
    FACEBOOK: 0,
    YOUTUBE: 0,
    LINKEDIN: 0,
  };
}

function mapStatusCounts(
  rows: { status: PostStatus; _count: { _all: number } }[],
): DashboardStatusCounts {
  const base: DashboardStatusCounts = {
    draft: 0,
    scheduled: 0,
    published: 0,
    failed: 0,
  };

  for (const row of rows) {
    if (row.status === "DRAFT") base.draft = row._count._all;
    if (row.status === "SCHEDULED") base.scheduled = row._count._all;
    if (row.status === "PUBLISHED") base.published = row._count._all;
    if (row.status === "FAILED") base.failed = row._count._all;
  }

  return base;
}

/**
 * Escopo de posts das métricas:
 *  - com `projectId`: somente aquele projeto (a posse é validada pela rota);
 *  - sem `projectId`: todos os projetos ativos do usuário.
 */
export function buildMetricsScope(
  userId: string,
  projectId: string | null,
): Prisma.PostWhereInput {
  return projectId
    ? { userId, projectId }
    : { userId, project: { isActive: true } };
}

export async function queryDashboardMetrics(
  userId: string,
  projectId: string | null = null,
  now = new Date(),
): Promise<DashboardMetricsResponse> {
  const scoped = buildMetricsScope(userId, projectId);
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const monthStart = startOfMonth(now);
  const nextMonthStart = startOfNextMonth(now);

  const upcomingBetween = (end: Date): Prisma.PostWhereInput => ({
    AND: [
      scoped,
      { status: { in: ACTIVE_UPCOMING_STATUSES } },
      { scheduledAt: { gte: now, lte: end } },
    ],
  });

  const [
    activeProjects,
    scheduledNext24Hours,
    scheduledNext7Days,
    overduePending,
    publishedThisMonth,
    channelGroups,
    statusGroups,
    upcomingRows,
  ] = await Promise.all([
    prisma.project.count({ where: { ownerId: userId, isActive: true } }),
    prisma.post.count({ where: upcomingBetween(in24Hours) }),
    prisma.post.count({ where: upcomingBetween(in7Days) }),
    prisma.post.count({
      where: {
        AND: [
          scoped,
          { scheduledAt: { lt: now } },
          { status: { not: "PUBLISHED" } },
        ],
      },
    }),
    prisma.post.count({
      where: {
        AND: [
          scoped,
          { status: "PUBLISHED" },
          { scheduledAt: { gte: monthStart, lt: nextMonthStart } },
        ],
      },
    }),
    prisma.postChannel.groupBy({
      by: ["channel"],
      where: { post: scoped },
      _count: { _all: true },
    }),
    prisma.post.groupBy({
      by: ["status"],
      where: scoped,
      _count: { _all: true },
    }),
    prisma.post.findMany({
      where: {
        AND: [
          scoped,
          { scheduledAt: { gte: now } },
          { status: { in: ACTIVE_UPCOMING_STATUSES } },
        ],
      },
      orderBy: { scheduledAt: "asc" },
      take: 12,
      include: {
        channels: {
          select: { channel: true },
          orderBy: { channel: "asc" },
        },
        project: { select: projectSummarySelect },
      },
    }),
  ]);

  const byChannel = emptyChannelCounts();
  for (const row of channelGroups) {
    byChannel[row.channel as SocialChannel] = row._count._all;
  }

  const byStatus = mapStatusCounts(statusGroups);

  const upcomingPosts = upcomingRows
    .filter((post) => post.scheduledAt)
    .map((post) => ({
      id: post.id,
      title: post.title,
      content: post.content,
      scheduledAt: post.scheduledAt!.toISOString(),
      status: post.status,
      channels: post.channels.map((item) => item.channel),
      project: {
        id: post.project.id,
        name: post.project.name,
        avatarUrl: post.project.avatarUrl,
        type: post.project.type,
        accentColor: post.project.accentColor,
      },
    }));

  return {
    projectId,
    activeProjects,
    scheduledNext24Hours,
    scheduledNext7Days,
    overduePending,
    publishedThisMonth,
    byChannel,
    byStatus,
    upcomingPosts,
  };
}

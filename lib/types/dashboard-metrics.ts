import type { PostStatus, SocialChannel } from "@prisma/client";
import type { ProjectSummary } from "@/lib/types/project-api";

export type DashboardStatusCounts = {
  draft: number;
  scheduled: number;
  published: number;
  failed: number;
};

export type DashboardChannelCounts = Record<SocialChannel, number>;

export type DashboardUpcomingPost = {
  id: string;
  title: string;
  content: string;
  scheduledAt: string;
  status: PostStatus;
  channels: SocialChannel[];
  project: ProjectSummary;
};

export type DashboardMetricsResponse = {
  /** Projeto usado como filtro; `null` = visão geral (projetos ativos). */
  projectId: string | null;
  activeProjects: number;
  scheduledNext24Hours: number;
  scheduledNext7Days: number;
  overduePending: number;
  publishedThisMonth: number;
  byChannel: DashboardChannelCounts;
  byStatus: DashboardStatusCounts;
  upcomingPosts: DashboardUpcomingPost[];
};

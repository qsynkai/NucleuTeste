import type { ProjectType } from "@prisma/client";

/** Dados mínimos de um projeto embutidos em posts e métricas. */
export type ProjectSummary = {
  id: string;
  name: string;
  avatarUrl: string | null;
  type: ProjectType;
  accentColor: string | null;
};

export type ProjectListItem = ProjectSummary & {
  slug: string;
  description: string | null;
  isActive: boolean;
  /** Total de posts vinculados ao projeto. */
  postCount: number;
  /** Posts futuros (rascunho/agendado) com data a partir de agora. */
  upcomingCount: number;
  createdAt: string;
};

export type ProjectsListResponse = {
  projects: ProjectListItem[];
};

export type CreateProjectBody = {
  name: string;
  type: ProjectType;
  slug?: string;
  avatarUrl?: string | null;
  description?: string | null;
  accentColor?: string | null;
};

export type UpdateProjectBody = Partial<
  Omit<CreateProjectBody, "slug"> & { isActive: boolean }
>;

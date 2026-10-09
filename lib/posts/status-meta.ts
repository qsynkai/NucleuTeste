import type { PostStatus } from "@prisma/client";

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  DRAFT: "Rascunho",
  SCHEDULED: "Agendado",
  PUBLISHED: "Publicado",
  FAILED: "Falhou",
};

export function postStatusClassName(status: PostStatus): string {
  return `fc-event-status fc-event-status--${status.toLowerCase()}`;
}

export function postStatusBadgeClassName(status: PostStatus): string {
  return `status-badge status-badge--${status.toLowerCase()}`;
}

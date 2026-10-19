import type { EntryType } from "@prisma/client";
import type { EventWithRelations } from "@/lib/events/event-include";

export type PublicEventPreview = {
  title: string;
  entryType: EntryType;
  entryTypeLabel: string;
  scheduledAt: string | null;
  durationMinutes: number | null;
  currentStatusLabel: string | null;
  projectName: string;
};

const ENTRY_LABELS: Record<EntryType, string> = {
  SOCIAL_POST: "Postagem social",
  PRODUCTION_EVENT: "Evento / produção",
  CUSTOMER_SERVICE: "Atendimento",
  SIMPLE_REMINDER: "Lembrete interno",
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Aberto",
  IN_PROGRESS: "Em andamento",
  WAITING_COLLABORATORS: "Aguardando equipe",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

export function toPublicEventPreview(
  post: EventWithRelations,
): PublicEventPreview {
  return {
    title: post.title,
    entryType: post.entryType,
    entryTypeLabel: ENTRY_LABELS[post.entryType],
    scheduledAt: post.scheduledAt?.toISOString() ?? null,
    durationMinutes: post.durationMinutes,
    currentStatusLabel:
      post.entryType === "PRODUCTION_EVENT" ||
      post.entryType === "CUSTOMER_SERVICE"
        ? STATUS_LABELS[post.currentStatus] ?? post.currentStatus
        : null,
    projectName: post.project.name,
  };
}

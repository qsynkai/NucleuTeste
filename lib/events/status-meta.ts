import type { EventStatus } from "@prisma/client";

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  OPEN: "Aberto",
  IN_PROGRESS: "Em andamento",
  WAITING_COLLABORATORS: "Aguardando colaboradores",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

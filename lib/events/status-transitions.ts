import type { AuthUser } from "@/lib/auth/permissions";
import { canUpdateEventStatus } from "@/lib/auth/permissions";
import type { EventStatus } from "@prisma/client";

const ALL_STATUSES: EventStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_COLLABORATORS",
  "COMPLETED",
  "CANCELLED",
];

/** Status que o usuário pode selecionar como próximo passo (inclui o atual). */
export function selectableEventStatuses(
  user: AuthUser,
  current: EventStatus,
): EventStatus[] {
  const options = ALL_STATUSES.filter((status) =>
    canUpdateEventStatus(user, status, current),
  );
  if (!options.includes(current)) {
    return [current, ...options];
  }
  return options.length ? options : [current];
}

export function isTerminalEventStatus(status: EventStatus): boolean {
  return status === "COMPLETED" || status === "CANCELLED";
}

import type { AppointmentStatus } from "@prisma/client";

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  IN_SERVICE: "Em atendimento",
  COMPLETED: "Concluído",
  NO_SHOW: "Falta",
  CANCELLED: "Cancelado",
};

export const APPOINTMENT_STATUS_FLOW: AppointmentStatus[] = [
  "SCHEDULED",
  "CONFIRMED",
  "IN_SERVICE",
  "COMPLETED",
  "NO_SHOW",
];

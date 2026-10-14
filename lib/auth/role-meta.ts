import type { Role } from "@prisma/client";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  COLLABORATOR: "Colaborador",
  TECHNICIAN: "Técnico",
  PARTNER: "Parceiro",
};

export const ROLE_OPTIONS: Role[] = [
  "ADMIN",
  "COLLABORATOR",
  "TECHNICIAN",
  "PARTNER",
];

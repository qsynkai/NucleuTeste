import type { EventStatus, Role } from "@prisma/client";

export type AuthUser = {
  id: string;
  role: Role;
  isActive: boolean;
};

export function isReadOnlyRole(role: Role): boolean {
  return role === "PARTNER";
}

export function canViewApp(user: AuthUser): boolean {
  return user.isActive;
}

export function canCreateEvent(user: AuthUser): boolean {
  if (!user.isActive || isReadOnlyRole(user.role)) return false;
  return (
    user.role === "ADMIN" ||
    user.role === "COLLABORATOR" ||
    user.role === "TECHNICIAN"
  );
}

export function canDeleteEvent(user: AuthUser): boolean {
  return user.isActive && user.role === "ADMIN";
}

/** Edição completa de título, legenda, mídia etc. */
export function canEditEventContent(user: AuthUser): boolean {
  if (!user.isActive || isReadOnlyRole(user.role)) return false;
  return user.role === "ADMIN" || user.role === "COLLABORATOR";
}

export function canUpdateEventStatus(
  user: AuthUser,
  nextStatus: EventStatus,
  currentStatus?: EventStatus,
): boolean {
  if (!user.isActive || isReadOnlyRole(user.role)) return false;
  if (user.role === "ADMIN") return true;
  if (user.role === "COLLABORATOR") {
    return (
      nextStatus === "IN_PROGRESS" &&
      (currentStatus === undefined || currentStatus === "OPEN")
    );
  }
  if (user.role === "TECHNICIAN") {
    return (
      nextStatus === "IN_PROGRESS" ||
      nextStatus === "WAITING_COLLABORATORS" ||
      nextStatus === "COMPLETED"
    );
  }
  return false;
}

export function canManageUsers(user: AuthUser): boolean {
  return user.isActive && user.role === "ADMIN";
}

export function canAccessTechArea(user: AuthUser): boolean {
  return user.isActive && (user.role === "ADMIN" || user.role === "TECHNICIAN");
}

export function canManageTaskCatalog(user: AuthUser): boolean {
  return user.isActive && user.role === "ADMIN";
}

export function canCompleteAssignedTasks(user: AuthUser): boolean {
  return user.isActive && (user.role === "ADMIN" || user.role === "TECHNICIAN");
}

export function canUploadTechLinks(user: AuthUser): boolean {
  return canCompleteAssignedTasks(user);
}

/** Links e mídia em eventos de produção (dono / colaborador / admin). */
export function canEditProductionAssets(user: AuthUser): boolean {
  return canEditEventContent(user);
}

export function canManageProjects(user: AuthUser): boolean {
  if (!user.isActive || isReadOnlyRole(user.role)) return false;
  return user.role === "ADMIN" || user.role === "COLLABORATOR";
}

export function roleAllowsRoute(
  role: Role,
  pathname: string,
): { allowed: boolean; redirectTo?: string } {
  if (pathname.startsWith("/admin")) {
    return role === "ADMIN"
      ? { allowed: true }
      : { allowed: false, redirectTo: "/dashboard" };
  }
  if (pathname.startsWith("/tech-area")) {
    return role === "ADMIN" || role === "TECHNICIAN"
      ? { allowed: true }
      : { allowed: false, redirectTo: "/dashboard" };
  }
  return { allowed: true };
}

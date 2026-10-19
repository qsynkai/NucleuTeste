import {
  canCompleteAssignedTasks,
  isReadOnlyRole,
  type AuthUser,
} from "@/lib/auth/permissions";
import type { EventParticipantAccess, Role } from "@prisma/client";

export type EventAccessFlags = {
  canView: boolean;
  canAddInfo: boolean;
  canEditContent: boolean;
  canUpdateSteps: boolean;
  canManageParticipants: boolean;
  canManageShareLink: boolean;
};

type ParticipantRow = {
  userId: string;
  accessLevel: EventParticipantAccess;
};

type EventForAccess = {
  userId: string;
  participants: ParticipantRow[];
  tasks: { assignedToUserId: string | null }[];
};

function participantLevel(
  event: EventForAccess,
  userId: string,
): EventParticipantAccess | null {
  const row = event.participants.find((p) => p.userId === userId);
  return row?.accessLevel ?? null;
}

function levelAllowsAddInfo(level: EventParticipantAccess): boolean {
  return (
    level === "ADD_INFO" ||
    level === "EDIT_CONTENT" ||
    level === "UPDATE_STEPS"
  );
}

function levelAllowsEditContent(level: EventParticipantAccess): boolean {
  return level === "EDIT_CONTENT";
}

function levelAllowsUpdateSteps(level: EventParticipantAccess): boolean {
  return level === "UPDATE_STEPS" || level === "EDIT_CONTENT";
}

export function resolveEventAccess(
  user: AuthUser,
  event: EventForAccess,
): EventAccessFlags {
  const isOwner = event.userId === user.id;
  const isAdmin = user.role === "ADMIN";
  const level = participantLevel(event, user.id);

  const techAccess =
    canCompleteAssignedTasks(user) &&
    event.tasks.some(
      (task) => task.assignedToUserId === user.id || user.role === "ADMIN",
    );

  const canView =
    isOwner || isAdmin || level !== null || techAccess;

  if (!canView) {
    return {
      canView: false,
      canAddInfo: false,
      canEditContent: false,
      canUpdateSteps: false,
      canManageParticipants: false,
      canManageShareLink: false,
    };
  }

  if (isReadOnlyRole(user.role)) {
    return {
      canView: true,
      canAddInfo: false,
      canEditContent: false,
      canUpdateSteps: false,
      canManageParticipants: false,
      canManageShareLink: false,
    };
  }

  const manage = isOwner || isAdmin;

  let canAddInfo = manage;
  let canEditContent = manage;
  let canUpdateSteps = manage;

  if (!manage && level) {
    canAddInfo = levelAllowsAddInfo(level);
    canEditContent = levelAllowsEditContent(level);
    canUpdateSteps = levelAllowsUpdateSteps(level);
  }

  if (!manage && techAccess && user.role === "TECHNICIAN") {
    canUpdateSteps = true;
  }

  return {
    canView: true,
    canAddInfo,
    canEditContent,
    canUpdateSteps,
    canManageParticipants: manage,
    canManageShareLink: manage,
  };
}

export function canViewEvent(
  user: { id: string; role: Role },
  event: EventForAccess,
): boolean {
  return resolveEventAccess(
    { id: user.id, role: user.role, isActive: true },
    event,
  ).canView;
}

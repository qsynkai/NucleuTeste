import {
  canAccessTechArea,
  canCreateEvent,
  canDeleteEvent,
  canManageProjects,
  canManageUsers,
  isReadOnlyRole,
} from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/require-user";
import type { SessionMeResponse } from "@/lib/types/user-api";
import { NextResponse } from "next/server";

export async function GET(): Promise<
  NextResponse<SessionMeResponse | { error: string }>
> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { user } = auth;
  const payload: SessionMeResponse = {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    },
    permissions: {
      readOnly: isReadOnlyRole(user.role),
      canCreate: canCreateEvent(user),
      canDelete: canDeleteEvent(user),
      canManageUsers: canManageUsers(user),
      canAccessTechArea: canAccessTechArea(user),
      canManageProjects: canManageProjects(user),
    },
  };

  return NextResponse.json(payload);
}

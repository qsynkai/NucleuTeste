import type { Role } from "@prisma/client";

export type UserListItem = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
};

export type UsersListResponse = {
  users: UserListItem[];
};

export type SessionMeResponse = {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    isActive: boolean;
  };
  permissions: {
    readOnly: boolean;
    canCreate: boolean;
    canDelete: boolean;
    canManageUsers: boolean;
    canAccessTechArea: boolean;
    canManageProjects: boolean;
  };
};

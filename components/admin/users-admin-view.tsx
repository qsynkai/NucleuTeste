"use client";

import { CreateUserModal } from "@/components/admin/create-user-modal";
import { ROLE_LABELS } from "@/lib/auth/role-meta";
import { notifyError, notifySuccess } from "@/lib/notify";
import type { UserListItem } from "@/lib/types/user-api";
import { useCallback, useEffect, useState } from "react";

function RoleBadge({ role }: { role: UserListItem["role"] }) {
  return <span className={`role-badge role-badge--${role.toLowerCase()}`}>{ROLE_LABELS[role]}</span>;
}

export function UsersAdminView() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/users", { cache: "no-store" });
      const body = (await response.json()) as { users?: UserListItem[]; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Falha ao carregar usuários.");
      setUsers(body.users ?? []);
    } catch (error: unknown) {
      notifyError(error instanceof Error ? error.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const toggleActive = async (user: UserListItem) => {
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Falha ao atualizar.");
      notifySuccess(user.isActive ? "Usuário desativado." : "Usuário reativado.");
      void loadUsers();
    } catch (error: unknown) {
      notifyError(error instanceof Error ? error.message : "Erro ao atualizar.");
    }
  };

  return (
    <section className="admin-users">
      <header className="page-head">
        <div>
          <p className="eyebrow">Administração</p>
          <h1 className="page-head__title">Usuários</h1>
          <p className="page-head__sub">
            Gerencie perfis de acesso, cadastros e status da equipe.
          </p>
        </div>
        <div className="page-head__actions">
          <button type="button" className="btn btn--primary" onClick={() => setModalOpen(true)}>
            Novo usuário
          </button>
        </div>
      </header>

      <div className="users-table-wrap">
        <table className="users-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Login</th>
              <th>Perfil</th>
              <th>Status</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5}>Carregando…</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className={user.isActive ? "" : "users-table__row--inactive"}>
                  <td>{user.name}</td>
                  <td><code>{user.email}</code></td>
                  <td><RoleBadge role={user.role} /></td>
                  <td>{user.isActive ? "Ativo" : "Inativo"}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn--ghost btn--small"
                      onClick={() => void toggleActive(user)}
                    >
                      {user.isActive ? "Desativar" : "Reativar"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CreateUserModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => void loadUsers()}
      />
    </section>
  );
}

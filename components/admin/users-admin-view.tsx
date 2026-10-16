"use client";

import { CreateUserModal } from "@/components/admin/create-user-modal";
import { ResetPasswordModal } from "@/components/admin/reset-password-modal";
import { ROLE_LABELS, ROLE_OPTIONS } from "@/lib/auth/role-meta";
import { notifyError, notifySuccess } from "@/lib/notify";
import type { UserListItem } from "@/lib/types/user-api";
import type { Role } from "@prisma/client";
import { useCallback, useEffect, useState } from "react";

function RoleBadge({ role }: { role: Role }) {
  return (
    <span className={`role-badge role-badge--${role.toLowerCase()}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}

type ConfirmState = { userId: string; userName: string; nextActive: boolean } | null;

export function UsersAdminView() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<UserListItem | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      const body = (await res.json()) as { users?: UserListItem[]; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Falha ao carregar usuários.");
      setUsers(body.users ?? []);
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const patch = useCallback(
    async (userId: string, data: Record<string, unknown>) => {
      setUpdatingId(userId);
      try {
        const res = await fetch(`/api/users/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const body = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(body.error ?? "Falha ao atualizar.");
        await loadUsers();
        return true;
      } catch (err: unknown) {
        notifyError(err instanceof Error ? err.message : "Erro ao atualizar.");
        return false;
      } finally {
        setUpdatingId(null);
      }
    },
    [loadUsers],
  );

  const handleRoleChange = async (user: UserListItem, role: Role) => {
    const ok = await patch(user.id, { role });
    if (ok) notifySuccess(`Perfil de ${user.name} alterado para ${ROLE_LABELS[role]}.`);
  };

  const requestToggle = (user: UserListItem) => {
    setConfirm({ userId: user.id, userName: user.name, nextActive: !user.isActive });
  };

  const confirmToggle = async () => {
    if (!confirm) return;
    const ok = await patch(confirm.userId, { isActive: confirm.nextActive });
    if (ok)
      notifySuccess(confirm.nextActive ? "Usuário reativado." : "Usuário desativado.");
    setConfirm(null);
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
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setCreateOpen(true)}
          >
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
                <td colSpan={5} className="users-table__empty">
                  Carregando…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="users-table__empty">
                  Nenhum usuário cadastrado.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const busy = updatingId === user.id;
                return (
                  <tr
                    key={user.id}
                    className={user.isActive ? "" : "users-table__row--inactive"}
                    aria-busy={busy}
                  >
                    <td className="users-table__name">{user.name}</td>
                    <td>
                      <code className="users-table__login">{user.email}</code>
                    </td>
                    <td>
                      <select
                        className="users-table__role-select"
                        value={user.role}
                        disabled={busy}
                        aria-label={`Perfil de ${user.name}`}
                        onChange={(e) =>
                          void handleRoleChange(user, e.target.value as Role)
                        }
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                      <RoleBadge role={user.role} />
                    </td>
                    <td>
                      <span
                        className={`status-dot ${user.isActive ? "status-dot--active" : "status-dot--inactive"}`}
                      >
                        {user.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="users-table__actions">
                      <button
                        type="button"
                        className="btn btn--ghost btn--small"
                        disabled={busy}
                        onClick={() => setResetTarget(user)}
                        title="Redefinir senha"
                      >
                        Senha
                      </button>
                      <button
                        type="button"
                        className={`btn btn--small ${user.isActive ? "btn--danger-ghost" : "btn--ghost"}`}
                        disabled={busy}
                        onClick={() => requestToggle(user)}
                      >
                        {user.isActive ? "Desativar" : "Reativar"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de confirmação de desativação */}
      {confirm ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setConfirm(null)}>
          <dialog
            className="modal-panel modal-panel--sm"
            open
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="modal-panel__header">
              <h2>{confirm.nextActive ? "Reativar usuário" : "Desativar usuário"}</h2>
            </header>
            <p className="modal-confirm__body">
              {confirm.nextActive
                ? `Reativar ${confirm.userName}? Ele poderá acessar o sistema novamente.`
                : `Desativar ${confirm.userName}? O acesso será bloqueado imediatamente nas próximas requisições.`}
            </p>
            <footer className="modal-panel__footer">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setConfirm(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={confirm.nextActive ? "btn btn--primary" : "btn btn--danger"}
                onClick={() => void confirmToggle()}
              >
                {confirm.nextActive ? "Reativar" : "Desativar"}
              </button>
            </footer>
          </dialog>
        </div>
      ) : null}

      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => void loadUsers()}
      />

      {resetTarget ? (
        <ResetPasswordModal
          user={resetTarget}
          onClose={() => setResetTarget(null)}
          onReset={() => {
            setResetTarget(null);
            notifySuccess("Senha redefinida com sucesso.");
          }}
        />
      ) : null}
    </section>
  );
}

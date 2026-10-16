"use client";

import { notifyError } from "@/lib/notify";
import type { UserListItem } from "@/lib/types/user-api";
import { useId, useState } from "react";

type ResetPasswordModalProps = {
  user: UserListItem;
  onClose: () => void;
  onReset: () => void;
};

export function ResetPasswordModal({ user, onClose, onReset }: ResetPasswordModalProps) {
  const formId = useId();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password.length < 4) {
      notifyError("A senha deve ter ao menos 4 caracteres.");
      return;
    }
    if (password !== confirm) {
      notifyError("As senhas não coincidem.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: password }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Falha ao redefinir.");
      onReset();
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : "Erro ao redefinir senha.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <dialog
        className="modal-panel modal-panel--sm"
        open
        aria-modal="true"
        aria-labelledby={`${formId}-title`}
        onClick={(e) => e.stopPropagation()}
        onCancel={(e) => { e.preventDefault(); onClose(); }}
      >
        <header className="modal-panel__header">
          <div>
            <p className="eyebrow">Administração</p>
            <h2 id={`${formId}-title`}>Redefinir senha</h2>
          </div>
          <button type="button" className="modal-panel__close" onClick={onClose}>
            Fechar
          </button>
        </header>

        <p className="modal-confirm__body">
          Definindo nova senha para <strong>{user.name}</strong>{" "}
          <code>({user.email})</code>.
        </p>

        <form
          className="post-modal__form"
          onSubmit={(e) => void handleSubmit(e)}
        >
          <label className="field">
            <span className="field__label">Nova senha</span>
            <input
              className="field__input"
              type="password"
              value={password}
              minLength={4}
              required
              autoComplete="new-password"
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field__label">Confirmar nova senha</span>
            <input
              className="field__input"
              type="password"
              value={confirm}
              minLength={4}
              required
              autoComplete="new-password"
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>

          <footer className="modal-panel__footer">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={submitting}
            >
              {submitting ? "Salvando…" : "Redefinir senha"}
            </button>
          </footer>
        </form>
      </dialog>
    </div>
  );
}

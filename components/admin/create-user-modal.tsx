"use client";

import { ROLE_LABELS, ROLE_OPTIONS } from "@/lib/auth/role-meta";
import { notifyError, notifySuccess } from "@/lib/notify";
import type { Role } from "@prisma/client";
import { useId, useState } from "react";

type CreateUserModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export function CreateUserModal({ open, onClose, onCreated }: CreateUserModalProps) {
  const formId = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("COLLABORATOR");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Falha ao cadastrar.");
      notifySuccess("Usuário cadastrado.");
      setName("");
      setEmail("");
      setPassword("");
      setRole("COLLABORATOR");
      onCreated();
      onClose();
    } catch (error: unknown) {
      notifyError(error instanceof Error ? error.message : "Erro ao cadastrar.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <dialog
        className="modal-panel"
        open
        aria-modal="true"
        aria-labelledby={`${formId}-title`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-panel__header">
          <div>
            <p className="eyebrow">Administração</p>
            <h2 id={`${formId}-title`}>Novo usuário</h2>
          </div>
          <button type="button" className="modal-panel__close" onClick={onClose}>
            Fechar
          </button>
        </header>
        <form className="post-modal__form" onSubmit={(event) => void handleSubmit(event)}>
          <label className="field">
            <span className="field__label">Nome</span>
            <input
              className="field__input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span className="field__label">E-mail / login</span>
            <input
              className="field__input"
              type="text"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span className="field__label">Senha provisória</span>
            <input
              className="field__input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={4}
            />
          </label>
          <label className="field">
            <span className="field__label">Nível de acesso</span>
            <select
              className="field__input"
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {ROLE_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
          <footer className="modal-panel__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? "Salvando…" : "Cadastrar"}
            </button>
          </footer>
        </form>
      </dialog>
    </div>
  );
}

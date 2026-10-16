"use client";

import { ProjectAvatar } from "@/components/projects/project-avatar";
import { useModalA11y } from "@/hooks/use-modal-a11y";
import { readApiErrorMessage } from "@/lib/api/read-api-error";
import { fileToAvatarDataUrl } from "@/lib/media/avatar-image";
import { notifyError, notifySuccess } from "@/lib/notify";
import {
  ACCENT_PRESETS,
  PROJECT_DESCRIPTION_MAX,
  PROJECT_NAME_MAX,
  PROJECT_TYPE_LABELS,
  PROJECT_TYPE_ORDER,
} from "@/lib/projects/project-meta";
import type { ProjectListItem } from "@/lib/types/project-api";
import type { ProjectType } from "@prisma/client";
import { useEffect, useId, useRef, useState } from "react";

type ProjectModalProps = {
  open: boolean;
  /** `null` = criar um novo projeto. */
  project: ProjectListItem | null;
  onClose: () => void;
  onSaved: (project: ProjectListItem) => void;
};

type FormState = {
  name: string;
  type: ProjectType;
  avatarUrl: string;
  description: string;
  accentColor: string;
  isActive: boolean;
};

function buildForm(project: ProjectListItem | null): FormState {
  return {
    name: project?.name ?? "",
    type: project?.type ?? "COMPANY",
    avatarUrl: project?.avatarUrl ?? "",
    description: project?.description ?? "",
    accentColor: project?.accentColor ?? "",
    isActive: project?.isActive ?? true,
  };
}

export function ProjectModal({ open, project, onClose, onSaved }: ProjectModalProps) {
  const formId = useId();
  const panelRef = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useModalA11y(open, onClose, panelRef);

  const [form, setForm] = useState<FormState>(() => buildForm(project));
  const [submitting, setSubmitting] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = project !== null;

  useEffect(() => {
    if (!open) return;
    setForm(buildForm(project));
    setError(null);
  }, [open, project]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    setProcessingImage(true);
    try {
      update("avatarUrl", await fileToAvatarDataUrl(file));
    } catch (imageError: unknown) {
      setError(
        imageError instanceof Error
          ? imageError.message
          : "Não foi possível processar a imagem.",
      );
    } finally {
      setProcessingImage(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("Informe o nome do projeto.");
      return;
    }

    setSubmitting(true);
    const payload = {
      name: form.name.trim(),
      type: form.type,
      avatarUrl: form.avatarUrl.trim() || null,
      description: form.description.trim() || null,
      accentColor: form.accentColor || null,
      ...(isEdit ? { isActive: form.isActive } : {}),
    };

    try {
      const response = await fetch(
        isEdit ? `/api/projects/${project.id}` : "/api/projects",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        throw new Error(
          await readApiErrorMessage(response, "Não foi possível salvar o projeto."),
        );
      }

      const saved = (await response.json()) as ProjectListItem;
      notifySuccess(isEdit ? "Projeto atualizado." : "Projeto criado.");
      onSaved(saved);
      onClose();
    } catch (submitError: unknown) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Erro ao salvar o projeto.";
      setError(message);
      notifyError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const linkValue = form.avatarUrl.startsWith("data:") ? "" : form.avatarUrl;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <dialog
        ref={panelRef}
        className="modal-panel modal-panel--wide"
        open
        aria-modal="true"
        aria-labelledby={`${formId}-title`}
        onClick={(event) => event.stopPropagation()}
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
      >
        <header className="modal-panel__header">
          <div>
            <p className="eyebrow">{isEdit ? "Edição" : "Novo projeto"}</p>
            <h2 id={`${formId}-title`}>{isEdit ? "Editar projeto" : "Novo projeto"}</h2>
          </div>
          <button type="button" className="modal-panel__close" onClick={onClose}>
            Fechar
          </button>
        </header>

        <form className="post-modal__form" onSubmit={(event) => void handleSubmit(event)}>
          <fieldset className="form-section">
            <legend className="form-section__legend">01 · Identificação</legend>

            <label className="field">
              <span className="field__label">Nome</span>
              <input
                className="field__input"
                value={form.name}
                maxLength={PROJECT_NAME_MAX}
                onChange={(event) => update("name", event.target.value)}
                placeholder="Ex.: Sanca"
                aria-required="true"
                required
              />
            </label>

            <label className="field">
              <span className="field__label">Tipo de projeto</span>
              <select
                className="field__input"
                value={form.type}
                onChange={(event) => update("type", event.target.value as ProjectType)}
              >
                {PROJECT_TYPE_ORDER.map((type) => (
                  <option key={type} value={type}>
                    {PROJECT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field__label">Descrição / observações</span>
              <textarea
                className="field__textarea"
                rows={3}
                maxLength={PROJECT_DESCRIPTION_MAX}
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                placeholder="Contexto da conta, tom de voz, regras do cliente…"
              />
            </label>
          </fieldset>

          <fieldset className="form-section">
            <legend className="form-section__legend">02 · Logo ou foto</legend>

            <div className="avatar-editor">
              <ProjectAvatar
                name={form.name || "Projeto"}
                avatarUrl={form.avatarUrl || null}
                accentColor={form.accentColor || null}
                size={64}
              />
              <div className="avatar-editor__controls">
                <div className="avatar-editor__buttons">
                  <button
                    type="button"
                    className="btn btn--small"
                    onClick={() => fileRef.current?.click()}
                    disabled={processingImage}
                  >
                    {processingImage ? "Processando…" : "Enviar imagem"}
                  </button>
                  {form.avatarUrl ? (
                    <button
                      type="button"
                      className="btn btn--ghost btn--small"
                      onClick={() => update("avatarUrl", "")}
                    >
                      Remover
                    </button>
                  ) : null}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    aria-label="Enviar logo ou foto do projeto"
                    onChange={(event) => void handleFile(event)}
                  />
                </div>
                <label className="field">
                  <span className="field__label">Ou cole o link da imagem</span>
                  <input
                    className="field__input"
                    inputMode="url"
                    value={linkValue}
                    onChange={(event) => update("avatarUrl", event.target.value)}
                    placeholder="https://…"
                  />
                </label>
              </div>
            </div>
          </fieldset>

          <fieldset className="form-section">
            <legend className="form-section__legend">03 · Identificação visual</legend>

            <div className="field">
              <span className="field__label" id={`${formId}-color`}>
                Cor de destaque (opcional)
              </span>
              <div className="swatches" role="radiogroup" aria-labelledby={`${formId}-color`}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={form.accentColor === ""}
                  className={`swatch swatch--none${form.accentColor === "" ? " swatch--active" : ""}`}
                  onClick={() => update("accentColor", "")}
                  aria-label="Sem cor"
                  title="Sem cor"
                />
                {ACCENT_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    role="radio"
                    aria-checked={form.accentColor.toUpperCase() === color}
                    className={`swatch${form.accentColor.toUpperCase() === color ? " swatch--active" : ""}`}
                    style={{ background: color }}
                    onClick={() => update("accentColor", color)}
                    aria-label={`Cor ${color}`}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {isEdit ? (
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => update("isActive", event.target.checked)}
                />
                <span>
                  <strong>Projeto ativo</strong>
                  <span className="field__hint">
                    Arquivados saem da visão geral e não recebem novos posts; os
                    posts existentes são preservados.
                  </span>
                </span>
              </label>
            ) : null}
          </fieldset>

          {error ? (
            <div className="calendar-alert" role="alert">
              {error}
            </div>
          ) : null}

          <footer className="modal-panel__footer post-modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={submitting || processingImage}
            >
              {submitting ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar projeto"}
            </button>
          </footer>
        </form>
      </dialog>
    </div>
  );
}

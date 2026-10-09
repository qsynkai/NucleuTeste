"use client";

import { ChannelPicker } from "@/components/channel-picker";
import { ProjectAvatar } from "@/components/projects/project-avatar";
import { useProjects } from "@/hooks/use-projects";
import { fetchWithRetry } from "@/lib/api/fetch-with-retry";
import { PROJECT_TYPE_LABELS } from "@/lib/projects/project-meta";
import type { ProjectSummary } from "@/lib/types/project-api";
import Link from "next/link";
import {
  defaultScheduleDate,
  parseLocalDateTimeInput,
  toLocalDateTimeInputValue,
} from "@/lib/datetime/local-input";
import { notifyError, notifySuccess } from "@/lib/notify";
import type { PostCalendarItem } from "@/lib/types/post-api";
import type { SocialChannel } from "@prisma/client";
import { useModalA11y } from "@/hooks/use-modal-a11y";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const ACCEPTED_MEDIA = "image/*,video/*";

export type PostModalMode = "create" | "edit";

type PostModalProps = {
  open: boolean;
  mode: PostModalMode;
  postId?: string | null;
  initialScheduledAt: Date | null;
  /** Projeto pré-selecionado (ex.: agenda filtrada por projeto). */
  defaultProjectId?: string | null;
  onClose: () => void;
  onSaved: () => void;
};

type FormState = {
  projectId: string;
  title: string;
  channels: SocialChannel[];
  scheduledAtInput: string;
  mediaUrls: string[];
  content: string;
  aiBrief: string;
};

function buildInitialForm(
  scheduledAt: Date | null,
  projectId = "",
): FormState {
  const when = defaultScheduleDate(scheduledAt ?? new Date());
  return {
    projectId,
    title: "",
    channels: [],
    scheduledAtInput: toLocalDateTimeInputValue(when),
    mediaUrls: [],
    content: "",
    aiBrief: "",
  };
}

function formFromPost(post: PostCalendarItem): FormState {
  const when = post.scheduledAt
    ? new Date(post.scheduledAt)
    : defaultScheduleDate(new Date());

  return {
    projectId: post.projectId,
    title: post.title,
    channels: post.channels,
    scheduledAtInput: toLocalDateTimeInputValue(when),
    mediaUrls: post.mediaUrls,
    content: post.content,
    aiBrief: "",
  };
}

export function PostModal({
  open,
  mode,
  postId,
  initialScheduledAt,
  defaultProjectId = null,
  onClose,
  onSaved,
}: PostModalProps) {
  const formId = useId();
  const panelRef = useRef<HTMLDialogElement>(null);
  useModalA11y(open, onClose, panelRef);
  const [form, setForm] = useState<FormState>(() =>
    buildInitialForm(initialScheduledAt, defaultProjectId ?? ""),
  );
  const [postProject, setPostProject] = useState<ProjectSummary | null>(null);
  const {
    projects,
    loading: projectsLoading,
    error: projectsError,
  } = useProjects({ enabled: open });
  const [linkInput, setLinkInput] = useState("");
  const [loadingPost, setLoadingPost] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(
    () => (mode === "edit" ? "Editar agendamento" : "Novo agendamento"),
    [mode],
  );

  const resetForOpen = useCallback(() => {
    setError(null);
    setLinkInput("");
    setPostProject(null);
    if (mode === "create") {
      setForm(buildInitialForm(initialScheduledAt, defaultProjectId ?? ""));
      return;
    }
    if (!postId) {
      setForm(buildInitialForm(initialScheduledAt, defaultProjectId ?? ""));
      return;
    }

    setLoadingPost(true);
    void fetchWithRetry(`/api/posts/${postId}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Não foi possível carregar a postagem.");
        }
        const post = (await response.json()) as PostCalendarItem;
        setPostProject(post.project);
        setForm(formFromPost(post));
      })
      .catch((fetchError: unknown) => {
        const message =
          fetchError instanceof Error
            ? fetchError.message
            : "Erro ao carregar postagem.";
        setError(message);
        setForm(buildInitialForm(initialScheduledAt, defaultProjectId ?? ""));
      })
      .finally(() => setLoadingPost(false));
  }, [defaultProjectId, initialScheduledAt, mode, postId]);

  // Opções do seletor: projetos ativos + o projeto atual do post (se arquivado).
  const projectOptions = useMemo(() => {
    const options: { id: string; name: string; avatarUrl: string | null; accentColor: string | null; type: ProjectSummary["type"]; archived: boolean }[] =
      projects.map((project) => ({
        id: project.id,
        name: project.name,
        avatarUrl: project.avatarUrl,
        accentColor: project.accentColor,
        type: project.type,
        archived: false,
      }));

    if (postProject && !options.some((option) => option.id === postProject.id)) {
      options.push({
        id: postProject.id,
        name: postProject.name,
        avatarUrl: postProject.avatarUrl,
        accentColor: postProject.accentColor,
        type: postProject.type,
        archived: true,
      });
    }
    return options;
  }, [postProject, projects]);

  const selectedProject = projectOptions.find(
    (option) => option.id === form.projectId,
  );

  // Criação: usa o projeto da agenda; com um único projeto ativo, pré-seleciona.
  useEffect(() => {
    if (!open || mode !== "create" || projectsLoading) return;
    setForm((current) => {
      if (current.projectId && projects.some((p) => p.id === current.projectId)) {
        return current;
      }
      const pick = projects.length === 1 ? projects[0] : null;
      if (!pick) {
        return current.projectId ? { ...current, projectId: "" } : current;
      }
      return { ...current, projectId: pick.id };
    });
  }, [open, mode, projectsLoading, projects]);

  useEffect(() => {
    if (open) resetForOpen();
  }, [open, resetForOpen]);

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const addMediaUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setForm((current) =>
      current.mediaUrls.includes(trimmed)
        ? current
        : { ...current, mediaUrls: [...current.mediaUrls, trimmed] },
    );
  };

  const handleAddLink = () => {
    try {
      const parsed = new URL(linkInput.trim());
      if (!["http:", "https:", "data:"].includes(parsed.protocol)) {
        throw new Error("Use links http(s) ou data URL.");
      }
      addMediaUrl(linkInput.trim());
      setLinkInput("");
    } catch (linkError: unknown) {
      const message =
        linkError instanceof Error ? linkError.message : "Link de mídia inválido.";
      setError(message);
    }
  };

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else reject(new Error("Falha ao ler arquivo."));
      };
      reader.onerror = () => reject(new Error("Falha ao ler arquivo."));
      reader.readAsDataURL(file);
    });

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files?.length) return;

    setError(null);
    const nextUrls: string[] = [];

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_BYTES) {
        setError(`Arquivo "${file.name}" excede 4 MB. Use um link externo.`);
        continue;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        nextUrls.push(dataUrl);
      } catch {
        setError(`Não foi possível processar "${file.name}".`);
      }
    }

    if (nextUrls.length) {
      setForm((current) => ({
        ...current,
        mediaUrls: [...current.mediaUrls, ...nextUrls],
      }));
    }

    event.target.value = "";
  };

  const removeMedia = (index: number) => {
    setForm((current) => ({
      ...current,
      mediaUrls: current.mediaUrls.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleGenerateCopy = async () => {
    if (!form.aiBrief.trim()) {
      setError("Descreva o que deseja transmitir antes de gerar com IA.");
      return;
    }
    if (form.channels.length === 0) {
      setError("Selecione ao menos uma rede para gerar a legenda.");
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: form.aiBrief,
          title: form.title,
          channels: form.channels,
        }),
      });

      const payload = (await response.json()) as { caption?: string; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Falha ao gerar legenda.");
      }

      if (!payload.caption?.trim()) {
        throw new Error("Resposta da IA vazia.");
      }

      updateForm("content", payload.caption.trim());
    } catch (generateError: unknown) {
      const message =
        generateError instanceof Error
          ? generateError.message
          : "Erro ao gerar legenda.";
      setError(message);
      notifyError(message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!form.projectId) {
      setError("Selecione o projeto do post.");
      return;
    }
    if (!form.title.trim()) {
      setError("Informe o título/tema do post.");
      return;
    }
    if (form.channels.length === 0) {
      setError("Selecione ao menos uma rede de destino.");
      return;
    }
    if (!form.content.trim()) {
      setError("Informe a legenda final.");
      return;
    }

    let scheduledAt: Date;
    try {
      scheduledAt = parseLocalDateTimeInput(form.scheduledAtInput);
    } catch {
      setError("Data/hora inválida.");
      return;
    }

    setSubmitting(true);

    const payload = {
      projectId: form.projectId,
      title: form.title.trim(),
      content: form.content.trim(),
      scheduledAt: scheduledAt.toISOString(),
      channels: form.channels,
      mediaUrls: form.mediaUrls,
    };

    try {
      const isEdit = mode === "edit" && postId;
      const response = await fetch(isEdit ? `/api/posts/${postId}` : "/api/posts", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Não foi possível salvar.");
      }

      notifySuccess(
        isEdit ? "Postagem atualizada com sucesso." : "Postagem criada com sucesso.",
      );
      onSaved();
      onClose();
    } catch (submitError: unknown) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Erro ao salvar agendamento.";
      setError(message);
      notifyError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <dialog
        ref={panelRef}
        className="modal-panel modal-panel--wide post-modal"
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
            <p className="eyebrow">{mode === "edit" ? "Edição" : "Planejamento"}</p>
            <h2 id={`${formId}-title`}>{title}</h2>
          </div>
          <button type="button" className="modal-panel__close" onClick={onClose}>
            Fechar
          </button>
        </header>

        {loadingPost ? (
          <div className="post-modal__loading" aria-busy="true">
            <div className="skeleton" style={{ height: 12, width: "33%" }} />
            <div className="skeleton" style={{ height: 40 }} />
            <div className="skeleton" style={{ height: 96 }} />
          </div>
        ) : (
          <form className="post-modal__form" onSubmit={handleSubmit}>
            <fieldset className="form-section">
              <legend className="form-section__legend">01 · Destino e horário</legend>

              <div className="field">
                <label className="field__label" htmlFor={`${formId}-project`}>
                  Projeto
                </label>
                <div className="project-select">
                  {selectedProject ? (
                    <ProjectAvatar
                      name={selectedProject.name}
                      avatarUrl={selectedProject.avatarUrl}
                      accentColor={selectedProject.accentColor}
                      size={30}
                    />
                  ) : (
                    <span className="project-select__placeholder" aria-hidden />
                  )}
                  <select
                    id={`${formId}-project`}
                    className="field__input"
                    value={form.projectId}
                    onChange={(event) => updateForm("projectId", event.target.value)}
                    disabled={submitting || projectsLoading}
                    aria-required="true"
                    aria-invalid={error === "Selecione o projeto do post."}
                  >
                    <option value="" disabled>
                      {projectsLoading ? "Carregando projetos…" : "Selecione um projeto…"}
                    </option>
                    {projectOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name} · {PROJECT_TYPE_LABELS[option.type]}
                        {option.archived ? " (arquivado)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {projectsError ? (
                  <p className="field__hint">{projectsError}</p>
                ) : null}
                {!projectsLoading && !projectsError && projectOptions.length === 0 ? (
                  <p className="field__hint">
                    Nenhum projeto ativo. <Link href="/projects">Crie um projeto</Link>{" "}
                    antes de agendar.
                  </p>
                ) : null}
              </div>

              <label className="field">
                <span className="field__label">Título / tema do post</span>
                <input
                  className="field__input"
                  value={form.title}
                  onChange={(event) => updateForm("title", event.target.value)}
                  placeholder="Ex.: Lançamento da coleção de verão"
                  aria-required="true"
                  required
                />
              </label>

              <div className="field">
                <span className="field__label">Redes de destino</span>
                <ChannelPicker
                  value={form.channels}
                  onChange={(channels) => updateForm("channels", channels)}
                  disabled={submitting || generating}
                />
              </div>

              <label className="field">
                <span className="field__label">Data e hora</span>
                <input
                  className="field__input"
                  type="datetime-local"
                  value={form.scheduledAtInput}
                  onChange={(event) =>
                    updateForm("scheduledAtInput", event.target.value)
                  }
                  required
                />
              </label>
            </fieldset>

            <fieldset className="form-section">
              <legend className="form-section__legend">02 · Mídia</legend>

              <div className="field">
                <span className="field__label">Upload ou links</span>
                <input
                  className="field__input"
                  type="file"
                  accept={ACCEPTED_MEDIA}
                  multiple
                  aria-label="Enviar arquivos de mídia"
                  onChange={(event) => void handleFileChange(event)}
                />
                <div className="media-link-row">
                  <input
                    className="field__input"
                    value={linkInput}
                    onChange={(event) => setLinkInput(event.target.value)}
                    placeholder="https://… ou cole o link do arquivo"
                    aria-label="Link de mídia"
                  />
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={handleAddLink}
                  >
                    Adicionar link
                  </button>
                </div>
                {form.mediaUrls.length ? (
                  <ul className="media-list">
                    {form.mediaUrls.map((url, index) => (
                      <li key={`${url.slice(0, 24)}-${index}`}>
                        <span className="media-list__url" title={url}>
                          {summarizeUrl(url)}
                        </span>
                        <button
                          type="button"
                          className="btn btn--ghost btn--small"
                          onClick={() => removeMedia(index)}
                        >
                          Remover
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="field__hint">Nenhuma mídia adicionada.</p>
                )}
              </div>
            </fieldset>

            <fieldset className="form-section">
              <legend className="form-section__legend">03 · Legenda e IA</legend>

              <div className="field field--ai">
                <label className="field" htmlFor={`${formId}-brief`}>
                  <span className="field__label">
                    Briefing para a IA — o que deseja transmitir
                  </span>
                  <textarea
                    id={`${formId}-brief`}
                    className="field__textarea"
                    rows={3}
                    value={form.aiBrief}
                    onChange={(event) => updateForm("aiBrief", event.target.value)}
                    placeholder="Ex.: Quero destacar benefícios do produto e convidar para o site."
                  />
                </label>
                <div>
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => void handleGenerateCopy()}
                    disabled={generating || submitting}
                  >
                    {generating ? "Gerando…" : "Gerar com IA"}
                  </button>
                </div>
              </div>

              <label className="field">
                <span className="field__label">Legenda final</span>
                <textarea
                  className="field__textarea"
                  rows={8}
                  value={form.content}
                  onChange={(event) => updateForm("content", event.target.value)}
                  placeholder="A legenda aparecerá aqui — você pode editar livremente."
                  required
                />
              </label>
            </fieldset>

            {error ? (
              <div className="calendar-alert" role="alert">
                {error}
              </div>
            ) : null}

            <footer className="modal-panel__footer post-modal__footer">
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
                disabled={submitting || loadingPost}
              >
                {submitting ? "Salvando…" : "Salvar agendamento"}
              </button>
            </footer>
          </form>
        )}
      </dialog>
    </div>
  );
}

function summarizeUrl(url: string): string {
  if (url.startsWith("data:")) {
    return "Arquivo local (data URL)";
  }
  if (url.length <= 64) return url;
  return `${url.slice(0, 61)}…`;
}

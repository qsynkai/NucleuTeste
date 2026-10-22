"use client";

import { ChannelBadges } from "@/components/channel-badges";
import { fetchWithRetry } from "@/lib/api/fetch-with-retry";
import { ProjectAvatar } from "@/components/projects/project-avatar";
import { downloadMediaUrl, isImageUrl, isVideoUrl } from "@/lib/media/download-client";
import { POST_STATUS_LABELS, postStatusBadgeClassName } from "@/lib/posts/status-meta";
import { notifyError, notifySuccess } from "@/lib/notify";
import type { PostCalendarItem } from "@/lib/types/post-api";
import type { EntryType, PostStatus } from "@prisma/client";
import { useModalA11y } from "@/hooks/use-modal-a11y";
import { useCallback, useEffect, useId, useRef, useState } from "react";

const STATUS_OPTIONS: PostStatus[] = ["DRAFT", "SCHEDULED", "PUBLISHED", "FAILED"];

type PostDetailsModalProps = {
  open: boolean;
  postId: string | null;
  onClose: () => void;
  onUpdated: (post?: PostCalendarItem) => void;
  onDeleted: () => void;
  /** Recebe o id e o tipo de entrada para rotear para o formulário correto. */
  onEdit?: (postId: string, entryType: EntryType) => void;
  canEdit?: boolean;
  canDelete?: boolean;
};

function formatScheduledAt(value: string | null): string {
  if (!value) return "Sem data agendada";
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function PostDetailsModal({
  open,
  postId,
  onClose,
  onUpdated,
  onDeleted,
  onEdit,
  canEdit = true,
  canDelete = true,
}: PostDetailsModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDialogElement>(null);
  useModalA11y(open, onClose, panelRef);
  const [post, setPost] = useState<PostCalendarItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadPost = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithRetry(`/api/posts/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Não foi possível carregar os detalhes.");
      setPost((await res.json()) as PostCalendarItem);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar.";
      setError(msg);
      notifyError(msg);
      setPost(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !postId) { setPost(null); setConfirmDelete(false); setError(null); return; }
    void loadPost(postId);
  }, [open, postId, loadPost]);

  const patchStatus = async (status: PostStatus) => {
    if (!post) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/posts/${post.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = (await res.json()) as PostCalendarItem & { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Falha ao atualizar status.");
      setPost(payload);
      onUpdated(payload);
      notifySuccess(`Status atualizado para ${POST_STATUS_LABELS[status]}.`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao atualizar status.";
      setError(msg);
      notifyError(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleCopyCaption = async () => {
    if (!post?.content) return;
    try {
      await navigator.clipboard.writeText(post.content);
      notifySuccess("Legenda copiada para a área de transferência.");
    } catch {
      const msg = "Não foi possível copiar a legenda.";
      setError(msg);
      notifyError(msg);
    }
  };

  const handleDownloadMedia = async () => {
    if (!post?.mediaUrls.length) { setError("Esta postagem não possui mídia anexada."); return; }
    setBusy(true);
    setError(null);
    try {
      for (let i = 0; i < post.mediaUrls.length; i += 1) {
        await downloadMediaUrl(post.mediaUrls[i], `post-${post.id}`, i);
      }
      notifySuccess(post.mediaUrls.length > 1 ? "Downloads iniciados." : "Download da mídia iniciado.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao baixar mídia.";
      setError(msg);
      notifyError(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!post) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Falha ao excluir.");
      notifySuccess("Postagem excluída com sucesso.");
      onDeleted();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao excluir postagem.";
      setError(msg);
      notifyError(msg);
    } finally {
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="modal-backdrop" role="presentation" onClick={onClose}>
        <dialog
          ref={panelRef}
          className="modal-panel modal-panel--wide"
          open
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={(e) => e.stopPropagation()}
          onCancel={(e) => { e.preventDefault(); onClose(); }}
        >
          {/* Header */}
          <header className="modal-panel__header">
            <div style={{ minWidth: 0 }}>
              <p className="eyebrow">
                Postagem
                {post ? (
                  <>
                    {" · "}
                    <span className={`status-badge ${postStatusBadgeClassName(post.status)}`}>
                      {POST_STATUS_LABELS[post.status]}
                    </span>
                  </>
                ) : null}
              </p>
              <h2 id={titleId}>{post?.title ?? "Detalhes da postagem"}</h2>
            </div>
            <button type="button" className="modal-panel__close" onClick={onClose}>
              Fechar
            </button>
          </header>

          {loading ? (
            <div className="post-details__loading" aria-busy="true">
              <div className="skeleton" style={{ height: "12px", width: "25%" }} />
              <div className="skeleton" style={{ height: "72px" }} />
              <div className="skeleton" style={{ height: "110px" }} />
            </div>
          ) : post ? (
            <div className="post-details__body">
              {/* Channels */}
              <section className="post-details__section">
                <h3>Projeto</h3>
                <span className="project-tag project-tag--lg">
                  <ProjectAvatar
                    name={post.project.name}
                    avatarUrl={post.project.avatarUrl}
                    accentColor={post.project.accentColor}
                    size={26}
                  />
                  <span className="project-tag__name">{post.project.name}</span>
                </span>
              </section>

              <section className="post-details__section">
                <h3>Redes</h3>
                <ChannelBadges channels={post.channels} />
              </section>

              {/* Meta */}
              <section className="post-details__section post-details__meta">
                <div>
                  <h3>Agendamento</h3>
                  <p>{formatScheduledAt(post.scheduledAt)}</p>
                </div>
                <div>
                  <label className="field" htmlFor={`${titleId}-status`}>
                    <span className="field__label">Status</span>
                    <select
                      id={`${titleId}-status`}
                      className="field__input"
                      value={post.status}
                      disabled={busy || !canEdit}
                      onChange={(e) => void patchStatus(e.target.value as PostStatus)}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{POST_STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>

              {/* Media */}
              <section className="post-details__section">
                <h3>Mídia</h3>
                {post.mediaUrls.length ? (
                  <div className="post-details__media-grid">
                    {post.mediaUrls.map((url, i) => (
                      <MediaPreview key={`${url.slice(0, 20)}-${i}`} url={url} />
                    ))}
                  </div>
                ) : (
                  <p className="field__hint">Nenhuma mídia anexada.</p>
                )}
              </section>

              {/* Caption */}
              <section className="post-details__section">
                <h3>Legenda</h3>
                <div className="post-details__caption">{post.content}</div>
              </section>

              {error ? (
                <div className="calendar-alert" role="alert">{error}</div>
              ) : null}

              {/* Actions */}
              <footer className="post-details__actions">
                <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => void handleCopyCaption()}>
                  Copiar legenda
                </button>
                <button type="button" className="btn btn--ghost" disabled={busy || !post.mediaUrls.length} onClick={() => void handleDownloadMedia()}>
                  Baixar mídia
                </button>
                {canEdit ? (
                  <button
                    type="button"
                    className="btn btn--ghost"
                    disabled={busy || post.status === "PUBLISHED"}
                    onClick={() => void patchStatus("PUBLISHED")}
                  >
                    Marcar publicado
                  </button>
                ) : null}
                {onEdit && canEdit ? (
                  <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => onEdit(post.id, post.entryType)}>
                    Editar
                  </button>
                ) : null}
                {canDelete ? (
                  <button type="button" className="btn btn--danger" disabled={busy} onClick={() => setConfirmDelete(true)}>
                    Excluir
                  </button>
                ) : null}
              </footer>
            </div>
          ) : (
            <div className="post-details__loading">
              {error ?? "Postagem indisponível."}
            </div>
          )}
        </dialog>
      </div>

      {/* Confirm delete */}
      {confirmDelete ? (
        <div
          className="modal-backdrop modal-backdrop--stack"
          role="presentation"
          onClick={() => setConfirmDelete(false)}
        >
          <dialog
            className="modal-panel confirm-dialog"
            open
            aria-labelledby={`${titleId}-confirm`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id={`${titleId}-confirm`}>Excluir postagem?</h3>
            <p>Esta ação remove o agendamento permanentemente.</p>
            <footer className="modal-panel__footer">
              <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => setConfirmDelete(false)}>Cancelar</button>
              <button type="button" className="btn btn--danger" disabled={busy} onClick={() => void handleDelete()}>
                {busy ? "Excluindo…" : "Excluir"}
              </button>
            </footer>
          </dialog>
        </div>
      ) : null}
    </>
  );
}

function MediaPreview({ url }: { url: string }) {
  if (isVideoUrl(url)) {
    return (
      <video className="post-details__media" controls preload="metadata">
        <source src={url} />
        Seu navegador não suporta vídeo embutido.
      </video>
    );
  }
  if (isImageUrl(url)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="post-details__media" src={url} alt="Pré-visualização da mídia" />;
  }
  return (
    <a className="post-details__media-link" href={url} target="_blank" rel="noreferrer">
      Abrir arquivo anexo
    </a>
  );
}

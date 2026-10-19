"use client";

import type {
  EventListItem,
  EventSharePreviewMeta,
} from "@/lib/types/event-api";
import { notifyError, notifySuccess } from "@/lib/notify";
import { useState } from "react";

type EventSharePreviewFieldProps = {
  eventId: string;
  sharePreview: EventSharePreviewMeta;
  disabled?: boolean;
  onUpdated: (sharePreview: EventSharePreviewMeta) => void;
};

export function EventSharePreviewField({
  eventId,
  sharePreview,
  disabled = false,
  onUpdated,
}: EventSharePreviewFieldProps) {
  const [busy, setBusy] = useState(false);

  const enableLink = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${eventId}/share-preview`, {
        method: "POST",
      });
      const body = (await res.json()) as EventListItem | { error?: string };
      if (!res.ok) {
        throw new Error(
          "error" in body ? body.error : "Não foi possível gerar o link.",
        );
      }
      if ("sharePreview" in body) onUpdated(body.sharePreview);
      notifySuccess("Link de prévia ativado.");
    } catch (error: unknown) {
      notifyError(
        error instanceof Error ? error.message : "Erro ao gerar link.",
      );
    } finally {
      setBusy(false);
    }
  };

  const revokeLink = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${eventId}/share-preview`, {
        method: "DELETE",
      });
      const body = (await res.json()) as EventListItem | { error?: string };
      if (!res.ok) {
        throw new Error(
          "error" in body ? body.error : "Não foi possível revogar.",
        );
      }
      if ("sharePreview" in body) onUpdated(body.sharePreview);
      notifySuccess("Link de prévia desativado.");
    } catch (error: unknown) {
      notifyError(
        error instanceof Error ? error.message : "Erro ao revogar link.",
      );
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!sharePreview.url) return;
    const absolute =
      sharePreview.url.startsWith("http")
        ? sharePreview.url
        : `${window.location.origin}${sharePreview.url}`;
    try {
      await navigator.clipboard.writeText(absolute);
      notifySuccess("Link copiado.");
    } catch {
      notifyError("Não foi possível copiar o link.");
    }
  };

  return (
    <fieldset className="form-section event-share-preview" disabled={disabled || busy}>
      <legend className="form-section__legend">Convite por link (prévia)</legend>
      <p className="field__hint">
        Quem não usa o sistema pode ver um resumo seguro do compromisso, sem
        telefone nem notas internas.
      </p>

      {sharePreview.enabled && sharePreview.url ? (
        <div className="event-share-preview__active">
          <input
            className="field__input"
            readOnly
            value={
              sharePreview.url.startsWith("http")
                ? sharePreview.url
                : `${typeof window !== "undefined" ? window.location.origin : ""}${sharePreview.url}`
            }
          />
          <div className="event-share-preview__actions">
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => void copyLink()}>
              Copiar link
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => void revokeLink()}>
              Desativar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={() => void enableLink()}
        >
          Gerar link de prévia
        </button>
      )}
    </fieldset>
  );
}

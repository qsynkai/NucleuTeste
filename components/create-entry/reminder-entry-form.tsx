"use client";

import { EntryProjectField } from "@/components/create-entry/entry-project-field";
import {
  defaultScheduleDate,
  parseLocalDateTimeInput,
  toLocalDateTimeInputValue,
} from "@/lib/datetime/local-input";
import { notifyError, notifySuccess } from "@/lib/notify";
import { useId, useState } from "react";

type ReminderEntryFormProps = {
  initialScheduledAt: Date | null;
  defaultProjectId?: string | null;
  onSaved: () => void;
  onCancel: () => void;
};

export function ReminderEntryForm({
  initialScheduledAt,
  defaultProjectId,
  onSaved,
  onCancel,
}: ReminderEntryFormProps) {
  const formId = useId();
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [scheduledAtInput, setScheduledAtInput] = useState(() =>
    toLocalDateTimeInputValue(defaultScheduleDate(initialScheduledAt ?? new Date())),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!projectId) {
      setError("Selecione o projeto.");
      return;
    }
    if (!title.trim()) {
      setError("Informe o título do lembrete.");
      return;
    }

    let scheduledAt: Date;
    try {
      scheduledAt = parseLocalDateTimeInput(scheduledAtInput);
    } catch {
      setError("Data/hora inválida.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryType: "SIMPLE_REMINDER",
          projectId,
          title: title.trim(),
          content: notes.trim(),
          scheduledAt: scheduledAt.toISOString(),
          mediaUrls: [],
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Não foi possível salvar.");
      notifySuccess("Lembrete criado.");
      onSaved();
    } catch (submitError: unknown) {
      const message =
        submitError instanceof Error ? submitError.message : "Erro ao salvar.";
      setError(message);
      notifyError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="create-entry-form__body" onSubmit={(e) => void handleSubmit(e)}>
      <EntryProjectField
        formId={formId}
        value={projectId}
        onChange={setProjectId}
        disabled={submitting}
      />

      <label className="field">
        <span className="field__label">Título</span>
        <input
          className="field__input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: Enviar relatório semanal"
          required
        />
      </label>

      <label className="field">
        <span className="field__label">Data e hora</span>
        <input
          className="field__input"
          type="datetime-local"
          value={scheduledAtInput}
          onChange={(e) => setScheduledAtInput(e.target.value)}
          required
        />
      </label>

      <label className="field">
        <span className="field__label">Anotação (opcional)</span>
        <textarea
          className="field__textarea"
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Detalhes rápidos para a equipe."
        />
      </label>

      {error ? (
        <div className="calendar-alert" role="alert">
          {error}
        </div>
      ) : null}

      <footer className="create-entry-form__footer">
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={submitting}>
          Cancelar
        </button>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? "Salvando…" : "Salvar lembrete"}
        </button>
      </footer>
    </form>
  );
}

"use client";

import { EntryProjectField } from "@/components/create-entry/entry-project-field";
import { useSessionUser } from "@/hooks/use-session-user";
import type { TaskCatalogItem } from "@/app/api/task-catalog/route";
import {
  defaultScheduleDate,
  parseLocalDateTimeInput,
  toLocalDateTimeInputValue,
} from "@/lib/datetime/local-input";
import { EVENT_STATUS_LABELS } from "@/lib/events/status-meta";
import { selectableEventStatuses } from "@/lib/events/status-transitions";
import {
  centsToMoneyString,
  formatBrlFromCents,
  parseMoneyToCents,
  sumMoneyCents,
} from "@/lib/money/brl";
import { notifyError, notifySuccess } from "@/lib/notify";
import type { EventListItem, ExternalLinkItem } from "@/lib/types/event-api";
import type { EventStatus, Role } from "@prisma/client";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const ACCEPTED_IMAGES = "image/*";

type TaskRow = {
  key: string;
  id?: string;
  taskCatalogId: string;
  customName: string;
  price: string;
};

type LinkRow = {
  key: string;
  title: string;
  url: string;
};

export type ProductionEventFormProps = {
  mode: "create" | "edit";
  eventId?: string | null;
  initialScheduledAt: Date | null;
  defaultProjectId?: string | null;
  onSaved: () => void;
  onCancel: () => void;
  embedded?: boolean;
};

function newTaskRow(catalog: TaskCatalogItem[]): TaskRow {
  const first = catalog[0];
  return {
    key: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    taskCatalogId: first?.id ?? "",
    customName: "",
    price: first?.basePrice ?? "0.00",
  };
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
}

function formatHistoryDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function ProductionEventForm({
  mode,
  eventId,
  initialScheduledAt,
  defaultProjectId,
  onSaved,
  onCancel,
  embedded = true,
}: ProductionEventFormProps) {
  const formId = useId();
  const { user, permissions } = useSessionUser();
  const authUser = user
    ? { id: user.id, role: user.role as Role, isActive: user.isActive }
    : null;

  const [catalog, setCatalog] = useState<TaskCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [loadingEvent, setLoadingEvent] = useState(mode === "edit");
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [startInput, setStartInput] = useState(() =>
    toLocalDateTimeInputValue(defaultScheduleDate(initialScheduledAt ?? new Date())),
  );
  const [endInput, setEndInput] = useState(() =>
    toLocalDateTimeInputValue(
      addMinutes(defaultScheduleDate(initialScheduledAt ?? new Date()), 120),
    ),
  );
  const [rows, setRows] = useState<TaskRow[]>([]);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [currentStatus, setCurrentStatus] = useState<EventStatus>("OPEN");
  const [statusNotes, setStatusNotes] = useState("");
  const [statusHistory, setStatusHistory] = useState<EventListItem["statusHistory"]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/task-catalog", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Catálogo indisponível.");
        return (await response.json()) as { items?: TaskCatalogItem[] };
      })
      .then((payload) => {
        if (cancelled) return;
        const items = payload.items ?? [];
        setCatalog(items);
        if (mode === "create") {
          setRows(items.length ? [newTaskRow(items)] : []);
        }
      })
      .catch(() => {
        if (!cancelled) setCatalog([]);
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  const loadEvent = useCallback(async () => {
    if (mode !== "edit" || !eventId) return;
    setLoadingEvent(true);
    setError(null);
    try {
      const response = await fetch(`/api/events/${eventId}`, { cache: "no-store" });
      const body = (await response.json()) as EventListItem | { error?: string };
      if (!response.ok) {
        throw new Error("error" in body ? body.error : "Falha ao carregar evento.");
      }
      const event = body as EventListItem;
      setProjectId(event.projectId);
      setTitle(event.title);
      setBrief(event.content);
      const start = event.scheduledAt
        ? new Date(event.scheduledAt)
        : defaultScheduleDate(new Date());
      setStartInput(toLocalDateTimeInputValue(start));
      const end = event.durationMinutes
        ? addMinutes(start, event.durationMinutes)
        : addMinutes(start, 120);
      setEndInput(toLocalDateTimeInputValue(end));
      setMediaUrls(event.mediaUrls);
      setLinks(
        event.externalLinks.map((link, index) => ({
          key: `link-${index}`,
          title: link.title,
          url: link.url,
        })),
      );
      setCurrentStatus(event.currentStatus);
      setStatusHistory(event.statusHistory);
      setRows(
        event.tasks.length
          ? event.tasks.map((task) => {
              const catalogId =
                catalog.find((c) => c.name === task.catalogName)?.id ?? "";
              return {
                key: task.id,
                id: task.id,
                taskCatalogId: catalogId,
                customName: task.customName ?? (catalogId ? "" : task.catalogName ?? ""),
                price: task.price,
              };
            })
          : catalog.length
            ? [newTaskRow(catalog)]
            : [],
      );
    } catch (loadError: unknown) {
      const message =
        loadError instanceof Error ? loadError.message : "Erro ao carregar.";
      setError(message);
    } finally {
      setLoadingEvent(false);
    }
  }, [catalog, eventId, mode]);

  useEffect(() => {
    if (mode === "edit" && eventId && !catalogLoading) {
      void loadEvent();
    }
  }, [catalogLoading, eventId, loadEvent, mode]);

  const updateRow = (key: string, patch: Partial<TaskRow>) => {
    setRows((current) =>
      current.map((row) => {
        if (row.key !== key) return row;
        const next = { ...row, ...patch };
        if (patch.taskCatalogId && patch.taskCatalogId !== row.taskCatalogId) {
          const item = catalog.find((c) => c.id === patch.taskCatalogId);
          if (item) next.price = item.basePrice;
          next.customName = "";
        }
        if (patch.price !== undefined) {
          const cents = parseMoneyToCents(patch.price);
          if (cents !== null) next.price = centsToMoneyString(cents);
        }
        return next;
      }),
    );
  };

  const totalCents = useMemo(
    () => sumMoneyCents(rows.map((row) => row.price)),
    [rows],
  );

  const statusOptions = useMemo(() => {
    if (!authUser) return [currentStatus];
    return selectableEventStatuses(authUser, currentStatus);
  }, [authUser, currentStatus]);

  const readOnly = permissions.readOnly;

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

  const handleImages = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    const next: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > MAX_FILE_BYTES) {
        setError(`"${file.name}" excede 4 MB.`);
        continue;
      }
      try {
        next.push(await readFileAsDataUrl(file));
      } catch {
        setError(`Não foi possível ler "${file.name}".`);
      }
    }
    if (next.length) setMediaUrls((current) => [...current, ...next]);
    event.target.value = "";
  };

  const addLink = () => {
    const titleValue = linkTitle.trim();
    const urlValue = linkUrl.trim();
    if (!titleValue || !urlValue) {
      setError("Informe título e URL do link.");
      return;
    }
    try {
      const parsed = new URL(urlValue);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("URL inválida.");
      }
    } catch {
      setError("URL inválida.");
      return;
    }
    setLinks((current) => [
      ...current,
      { key: `link-${Date.now()}`, title: titleValue, url: urlValue },
    ]);
    setLinkTitle("");
    setLinkUrl("");
    setError(null);
  };

  const buildExternalLinks = (): ExternalLinkItem[] =>
    links.map((link) => ({
      title: link.title,
      url: link.url,
      type: link.url.includes("drive.google") ? "drive" : "reference",
    }));

  const buildTasksPayload = () =>
    rows.map((row) => {
      const cents = parseMoneyToCents(row.price);
      const price = centsToMoneyString(cents ?? 0);
      if (row.customName.trim()) {
        return {
          id: row.id,
          customName: row.customName.trim(),
          price,
        };
      }
      return {
        id: row.id,
        taskCatalogId: row.taskCatalogId,
        price,
      };
    });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (readOnly) return;
    setError(null);

    if (!projectId) {
      setError("Selecione o projeto.");
      return;
    }
    if (!title.trim()) {
      setError("Informe o título do evento.");
      return;
    }
    if (!brief.trim()) {
      setError("Descreva o escopo da produção.");
      return;
    }
    if (rows.length === 0) {
      setError("Adicione ao menos uma tarefa.");
      return;
    }

    let scheduledAt: Date;
    let endAt: Date;
    try {
      scheduledAt = parseLocalDateTimeInput(startInput);
      endAt = parseLocalDateTimeInput(endInput);
    } catch {
      setError("Data/hora inválida.");
      return;
    }
    if (endAt.getTime() <= scheduledAt.getTime()) {
      setError("O término deve ser após o início.");
      return;
    }

    const durationMinutes = minutesBetween(scheduledAt, endAt);
    const externalLinks = buildExternalLinks();
    const tasks = buildTasksPayload();

    setSubmitting(true);
    try {
      if (mode === "create") {
        const response = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entryType: "PRODUCTION_EVENT",
            projectId,
            title: title.trim(),
            content: brief.trim(),
            scheduledAt: scheduledAt.toISOString(),
            durationMinutes,
            tasks,
            mediaUrls,
            externalLinks,
          }),
        });
        const body = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(body.error ?? "Não foi possível salvar.");
        notifySuccess("Evento de produção criado.");
      } else if (eventId) {
        const response = await fetch(`/api/events/${eventId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            title: title.trim(),
            content: brief.trim(),
            scheduledAt: scheduledAt.toISOString(),
            durationMinutes,
            tasks,
            mediaUrls,
            externalLinks,
            currentStatus,
            statusNotes: statusNotes.trim() || null,
          }),
        });
        const body = (await response.json()) as EventListItem | { error?: string };
        if (!response.ok) {
          throw new Error("error" in body ? body.error : "Não foi possível salvar.");
        }
        notifySuccess("Evento de produção atualizado.");
        if ("statusHistory" in body) {
          setStatusHistory(body.statusHistory);
          setCurrentStatus(body.currentStatus);
        }
      }
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

  const handleDelete = async () => {
    if (!eventId || !permissions.canDelete) return;
    if (!window.confirm("Excluir este evento de produção? Esta ação não pode ser desfeita.")) {
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Não foi possível excluir.");
      notifySuccess("Evento excluído.");
      onSaved();
    } catch (deleteError: unknown) {
      const message =
        deleteError instanceof Error ? deleteError.message : "Erro ao excluir.";
      notifyError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const formClass = embedded
    ? "create-entry-form__body production-event-form"
    : "post-modal__form production-event-form";

  if (loadingEvent) {
    return (
      <div className="post-modal__loading" aria-busy="true">
        <div className="skeleton" style={{ height: 12, width: "40%" }} />
        <div className="skeleton" style={{ height: 40 }} />
        <div className="skeleton" style={{ height: 120 }} />
      </div>
    );
  }

  return (
    <form className={formClass} onSubmit={(e) => void handleSubmit(e)}>
      <fieldset className="form-section" disabled={readOnly || submitting}>
        <legend className="form-section__legend">Identificação</legend>
        <EntryProjectField
          formId={formId}
          value={projectId}
          onChange={setProjectId}
          disabled={submitting || readOnly}
        />
        <label className="field">
          <span className="field__label">Título do evento</span>
          <input
            className="field__input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>
        <div className="production-event-form__datetime">
          <label className="field">
            <span className="field__label">Início</span>
            <input
              className="field__input"
              type="datetime-local"
              value={startInput}
              onChange={(e) => setStartInput(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span className="field__label">Término</span>
            <input
              className="field__input"
              type="datetime-local"
              value={endInput}
              onChange={(e) => setEndInput(e.target.value)}
              required
            />
          </label>
        </div>
        <label className="field">
          <span className="field__label">Escopo / briefing</span>
          <textarea
            className="field__textarea"
            rows={3}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            required
          />
        </label>
      </fieldset>

      <fieldset className="form-section production-event-form__costs" disabled={readOnly || submitting}>
        <legend className="form-section__legend">Tarefas e custos</legend>
        <div className="create-entry-form__tasks-head">
          <span className="field__hint">Catálogo ou item customizado com valor em R$</span>
          <button
            type="button"
            className="btn btn--ghost btn--small"
            disabled={catalogLoading}
            onClick={() => setRows((current) => [...current, newTaskRow(catalog)])}
          >
            + Tarefa
          </button>
        </div>
        <ul className="create-entry-task-rows">
          {rows.map((row) => (
            <li key={row.key} className="create-entry-task-row">
              <select
                className="field__input"
                value={row.taskCatalogId}
                onChange={(e) => updateRow(row.key, { taskCatalogId: e.target.value })}
                aria-label="Tarefa do catálogo"
              >
                <option value="">Personalizado</option>
                {catalog.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <input
                className="field__input"
                value={row.customName}
                onChange={(e) => updateRow(row.key, { customName: e.target.value })}
                placeholder="Nome customizado"
                aria-label="Nome customizado"
              />
              <input
                className="field__input create-entry-task-row__price"
                inputMode="decimal"
                value={row.price}
                onChange={(e) => updateRow(row.key, { price: e.target.value })}
                aria-label="Valor em reais"
              />
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() =>
                  setRows((current) =>
                    current.length <= 1 ? current : current.filter((r) => r.key !== row.key),
                  )
                }
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
        <footer className="production-event-form__total" aria-live="polite">
          <span>Valor total do evento</span>
          <strong>{formatBrlFromCents(totalCents)}</strong>
        </footer>
      </fieldset>

      {mode === "edit" ? (
        <fieldset className="form-section" disabled={readOnly || submitting}>
          <legend className="form-section__legend">Situação do evento</legend>
          <p className="production-event-form__status-current">
            Status atual:{" "}
            <span className="tech-card__status">{EVENT_STATUS_LABELS[currentStatus]}</span>
          </p>
          {!readOnly && statusOptions.length > 1 ? (
            <label className="field">
              <span className="field__label">Alterar status</span>
              <select
                className="field__input"
                value={currentStatus}
                onChange={(e) => setCurrentStatus(e.target.value as EventStatus)}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {EVENT_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {!readOnly ? (
            <label className="field">
              <span className="field__label">Observação da mudança (opcional)</span>
              <input
                className="field__input"
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="Registro no histórico"
              />
            </label>
          ) : null}
          <ol className="production-event-form__history">
            {statusHistory.length === 0 ? (
              <li className="field__hint">Sem histórico registrado.</li>
            ) : (
              statusHistory.map((entry) => (
                <li key={entry.id}>
                  <span className="production-event-form__history-status">
                    {EVENT_STATUS_LABELS[entry.status]}
                  </span>
                  <span>{formatHistoryDate(entry.createdAt)}</span>
                  <span>{entry.user.name}</span>
                  {entry.notes ? <em>{entry.notes}</em> : null}
                </li>
              ))
            )}
          </ol>
        </fieldset>
      ) : null}

      <fieldset className="form-section" disabled={readOnly || submitting}>
        <legend className="form-section__legend">Arquivos e links</legend>
        <div className="field">
          <span className="field__label">Imagens de referência</span>
          <input
            className="field__input"
            type="file"
            accept={ACCEPTED_IMAGES}
            multiple
            onChange={(e) => void handleImages(e)}
          />
          {mediaUrls.length > 0 ? (
            <ul className="production-event-form__media">
              {mediaUrls.map((url, index) => (
                <li key={`${index}-${url.slice(0, 12)}`}>
                  {url.startsWith("data:image") ? (
                    <img src={url} alt="" className="production-event-form__thumb" />
                  ) : (
                    <span className="media-list__url">{url}</span>
                  )}
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={() =>
                      setMediaUrls((current) => current.filter((_, i) => i !== index))
                    }
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="field__hint">Nenhuma imagem anexada.</p>
          )}
        </div>
        <div className="field">
          <span className="field__label">Links úteis</span>
          {links.length > 0 ? (
            <ul className="tech-links">
              {links.map((link) => (
                <li key={link.key}>
                  <a href={link.url} target="_blank" rel="noreferrer">{link.title}</a>
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={() =>
                      setLinks((current) => current.filter((item) => item.key !== link.key))
                    }
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="tech-link-form">
            <input
              className="field__input"
              placeholder="Título (ex.: Pasta Drive — takes)"
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
            />
            <input
              className="field__input"
              placeholder="https://…"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
            <button type="button" className="btn btn--ghost btn--small" onClick={addLink}>
              Adicionar link
            </button>
          </div>
        </div>
      </fieldset>

      {error ? (
        <div className="calendar-alert" role="alert">
          {error}
        </div>
      ) : null}

      <footer
        className={
          embedded ? "create-entry-form__footer" : "modal-panel__footer post-modal__footer"
        }
      >
        {mode === "edit" && permissions.canDelete ? (
          <button
            type="button"
            className="btn btn--ghost production-event-form__delete"
            onClick={() => void handleDelete()}
            disabled={submitting}
          >
            Excluir evento
          </button>
        ) : null}
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={submitting}>
          Cancelar
        </button>
        {!readOnly ? (
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? "Salvando…" : mode === "edit" ? "Salvar alterações" : "Salvar produção"}
          </button>
        ) : null}
      </footer>
    </form>
  );
}

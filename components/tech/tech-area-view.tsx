"use client";

import { EVENT_STATUS_LABELS } from "@/lib/events/status-meta";
import { notifyError, notifySuccess } from "@/lib/notify";
import type { EventListItem } from "@/lib/types/event-api";
import { useCallback, useEffect, useState } from "react";

export function TechAreaView() {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkDrafts, setLinkDrafts] = useState<Record<string, { title: string; url: string }>>({});

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/events?scope=tech", { cache: "no-store" });
      const body = (await response.json()) as { events?: EventListItem[]; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Falha ao carregar produção.");
      setEvents(body.events ?? []);
    } catch (error: unknown) {
      notifyError(error instanceof Error ? error.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const patchEvent = async (
    eventId: string,
    payload: Record<string, unknown>,
    successMessage: string,
  ) => {
    const response = await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(body.error ?? "Falha ao salvar.");
    notifySuccess(successMessage);
    void loadEvents();
  };

  const toggleTask = async (event: EventListItem, taskId: string, completed: boolean) => {
    if (completed) return;
    try {
      await patchEvent(event.id, { taskCompletions: [taskId] }, "Tarefa concluída.");
    } catch (error: unknown) {
      notifyError(error instanceof Error ? error.message : "Erro ao atualizar tarefa.");
    }
  };

  const startEvent = async (event: EventListItem) => {
    try {
      await patchEvent(
        event.id,
        { currentStatus: "IN_PROGRESS", statusNotes: "Início da operação técnica." },
        "Status atualizado para em andamento.",
      );
    } catch (error: unknown) {
      notifyError(error instanceof Error ? error.message : "Erro ao atualizar status.");
    }
  };

  const addLink = async (event: EventListItem) => {
    const draft = linkDrafts[event.id] ?? { title: "", url: "" };
    if (!draft.title.trim() || !draft.url.trim()) {
      notifyError("Informe título e URL do link.");
      return;
    }
    try {
      const type = draft.url.includes("frame.io") ? "frame_io" : "drive";
      await patchEvent(
        event.id,
        {
          externalLinks: [
            ...event.externalLinks,
            { title: draft.title.trim(), url: draft.url.trim(), type },
          ],
        },
        "Link adicionado ao evento.",
      );
      setLinkDrafts((current) => ({
        ...current,
        [event.id]: { title: "", url: "" },
      }));
    } catch (error: unknown) {
      notifyError(error instanceof Error ? error.message : "Erro ao salvar link.");
    }
  };

  return (
    <section className="tech-area">
      <header className="page-head">
        <div>
          <p className="eyebrow">Operação de campo</p>
          <h1 className="page-head__title">Área técnica</h1>
          <p className="page-head__sub">
            Captação, som, vídeo e transmissão — checklist e entrega de links brutos.
          </p>
        </div>
      </header>

      {loading ? (
        <p className="tech-area__loading">Carregando demandas técnicas…</p>
      ) : events.length === 0 ? (
        <div className="tech-area__empty">
          <p>Nenhum evento técnico pendente no momento.</p>
        </div>
      ) : (
        <div className="tech-area__grid">
          {events.map((event) => {
            const draft = linkDrafts[event.id] ?? { title: "", url: "" };
            return (
              <article key={event.id} className="tech-card">
                <header className="tech-card__head">
                  <div>
                    <p className="eyebrow">{event.project.name}</p>
                    <h2 className="tech-card__title">{event.title}</h2>
                  </div>
                  <span className="tech-card__status">
                    {EVENT_STATUS_LABELS[event.currentStatus]}
                  </span>
                </header>

                <p className="tech-card__meta">
                  {event.scheduledAt
                    ? new Date(event.scheduledAt).toLocaleString("pt-BR")
                    : "Sem data"}
                </p>

                {event.currentStatus === "OPEN" ? (
                  <button
                    type="button"
                    className="btn btn--primary btn--small"
                    onClick={() => void startEvent(event)}
                  >
                    Iniciar operação
                  </button>
                ) : null}

                <div className="tech-card__section">
                  <h3>Checklist</h3>
                  {event.tasks.length === 0 ? (
                    <p className="field__hint">Sem tarefas vinculadas.</p>
                  ) : (
                    <ul className="tech-checklist">
                      {event.tasks.map((task) => (
                        <li key={task.id}>
                          <label>
                            <input
                              type="checkbox"
                              checked={task.completed}
                              disabled={task.completed}
                              onChange={() => void toggleTask(event, task.id, task.completed)}
                            />
                            <span>
                              {task.customName ?? task.catalogName ?? "Tarefa"}
                              {task.price ? ` · R$ ${task.price}` : ""}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="tech-card__section">
                  <h3>Links brutos</h3>
                  {event.externalLinks.length > 0 ? (
                    <ul className="tech-links">
                      {event.externalLinks.map((link) => (
                        <li key={`${link.url}-${link.title}`}>
                          <a href={link.url} target="_blank" rel="noreferrer">
                            {link.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="field__hint">Nenhum link enviado.</p>
                  )}
                  <div className="tech-link-form">
                    <input
                      className="field__input"
                      placeholder="Título (ex.: Drive — takes)"
                      value={draft.title}
                      onChange={(eventChange) =>
                        setLinkDrafts((current) => ({
                          ...current,
                          [event.id]: { ...draft, title: eventChange.target.value },
                        }))
                      }
                    />
                    <input
                      className="field__input"
                      placeholder="https://drive.google.com/… ou Frame.io"
                      value={draft.url}
                      onChange={(eventChange) =>
                        setLinkDrafts((current) => ({
                          ...current,
                          [event.id]: { ...draft, url: eventChange.target.value },
                        }))
                      }
                    />
                    <button
                      type="button"
                      className="btn btn--ghost btn--small"
                      onClick={() => void addLink(event)}
                    >
                      Anexar link
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

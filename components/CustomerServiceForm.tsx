"use client";

import { EntryProjectField } from "@/components/create-entry/entry-project-field";
import {
  EventParticipantsField,
  type ParticipantDraft,
} from "@/components/events/event-participants-field";
import { EventSharePreviewField } from "@/components/events/event-share-preview-field";
import type { TaskCatalogItem } from "@/app/api/task-catalog/route";
import {
  APPOINTMENT_STATUS_FLOW,
  APPOINTMENT_STATUS_LABELS,
} from "@/lib/customer-service/appointment-meta";
import {
  defaultScheduleDate,
  parseLocalDateTimeInput,
  toLocalDateTimeInputValue,
} from "@/lib/datetime/local-input";
import { formatBrlFromCents, parseMoneyToCents } from "@/lib/money/brl";
import {
  digitsOnly,
  formatBrMobilePhone,
  phoneToWhatsAppDigits,
} from "@/lib/phone/mask-br";
import { notifyError, notifySuccess } from "@/lib/notify";
import type { EventListItem, EventSharePreviewMeta } from "@/lib/types/event-api";
import type { AppointmentStatus, AttendanceType, ServiceChannel } from "@prisma/client";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

const DURATION_OPTIONS = [15, 30, 45, 60] as const;

export type CustomerServiceFormProps = {
  mode: "create" | "edit";
  eventId?: string | null;
  initialScheduledAt: Date | null;
  defaultProjectId?: string | null;
  onSaved: () => void;
  onCancel: () => void;
  embedded?: boolean;
};

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function formatEndLabel(startInput: string, durationMinutes: number): string {
  try {
    const start = parseLocalDateTimeInput(startInput);
    const end = addMinutes(start, durationMinutes);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(end);
  } catch {
    return "—";
  }
}

function buildWhatsAppMessage(
  clientName: string,
  startInput: string,
  serviceLabel: string,
): string {
  let when = "data a combinar";
  try {
    when = new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    }).format(parseLocalDateTimeInput(startInput));
  } catch {
    /* mantém fallback */
  }
  return `Olá ${clientName}! Lembrete do seu horário (${serviceLabel}) em ${when}.`;
}

export function CustomerServiceForm({
  mode,
  eventId,
  initialScheduledAt,
  defaultProjectId,
  onSaved,
  onCancel,
  embedded = true,
}: CustomerServiceFormProps) {
  const formId = useId();
  const [attendanceType, setAttendanceType] =
    useState<AttendanceType>("CORPORATE_MEETING");
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [title, setTitle] = useState("");
  const [agenda, setAgenda] = useState("");
  const [serviceChannel, setServiceChannel] = useState<ServiceChannel>("GOOGLE_MEET");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [internalResponsible, setInternalResponsible] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [assignedProfessional, setAssignedProfessional] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [startInput, setStartInput] = useState(() =>
    toLocalDateTimeInputValue(defaultScheduleDate(initialScheduledAt ?? new Date())),
  );
  const [catalog, setCatalog] = useState<TaskCatalogItem[]>([]);
  const [serviceCatalogId, setServiceCatalogId] = useState("");
  const [customServiceName, setCustomServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("0.00");
  const [appointmentStatus, setAppointmentStatus] =
    useState<AppointmentStatus>("SCHEDULED");
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(mode === "edit");
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<ParticipantDraft[]>([]);
  const [sharePreview, setSharePreview] = useState<EventSharePreviewMeta>({
    enabled: false,
    url: null,
  });

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
        if (items[0] && !serviceCatalogId) {
          setServiceCatalogId(items[0].id);
          setServicePrice(items[0].basePrice);
        }
      })
      .catch(() => {
        if (!cancelled) setCatalog([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const endLabel = useMemo(
    () => formatEndLabel(startInput, durationMinutes),
    [durationMinutes, startInput],
  );

  const serviceLabel = useMemo(() => {
    if (customServiceName.trim()) return customServiceName.trim();
    const item = catalog.find((entry) => entry.id === serviceCatalogId);
    return item?.name ?? "Serviço";
  }, [catalog, customServiceName, serviceCatalogId]);

  const loadEvent = useCallback(async () => {
    if (mode !== "edit" || !eventId) return;
    setLoadingEvent(true);
    try {
      const response = await fetch(`/api/events/${eventId}`, { cache: "no-store" });
      const body = (await response.json()) as EventListItem | { error?: string };
      if (!response.ok) {
        throw new Error("error" in body ? body.error : "Falha ao carregar.");
      }
      const event = body as EventListItem;
      setAttendanceType(event.attendanceType ?? "CORPORATE_MEETING");
      setProjectId(event.projectId);
      setTitle(event.title);
      setAgenda(event.content);
      setServiceChannel(event.serviceChannel ?? "IN_PERSON");
      setMeetingUrl(event.meetingUrl ?? "");
      setMeetingNotes(event.meetingNotes ?? "");
      setInternalResponsible(event.internalResponsible ?? "");
      setClientName(event.clientName ?? "");
      setClientPhone(formatBrMobilePhone(event.clientPhone ?? ""));
      setAssignedProfessional(event.assignedProfessional ?? "");
      setDurationMinutes(event.durationMinutes ?? 30);
      setAppointmentStatus(event.appointmentStatus ?? "SCHEDULED");
      setParticipants(
        event.participants.map((row) => ({
          userId: row.userId,
          accessLevel: row.accessLevel,
        })),
      );
      setSharePreview(event.sharePreview);
      if (event.scheduledAt) {
        setStartInput(toLocalDateTimeInputValue(new Date(event.scheduledAt)));
      }
      const task = event.tasks[0];
      if (task) {
        setServicePrice(task.price);
        setCustomServiceName(task.customName ?? "");
        const catalogId = catalog.find((c) => c.name === task.catalogName)?.id ?? "";
        setServiceCatalogId(catalogId);
      }
    } catch (loadError: unknown) {
      const message =
        loadError instanceof Error ? loadError.message : "Erro ao carregar.";
      setError(message);
    } finally {
      setLoadingEvent(false);
    }
  }, [catalog, eventId, mode]);

  useEffect(() => {
    if (mode === "edit" && eventId && catalog.length >= 0) {
      void loadEvent();
    }
  }, [catalog.length, eventId, loadEvent, mode]);

  const onCatalogChange = (catalogId: string) => {
    setServiceCatalogId(catalogId);
    const item = catalog.find((entry) => entry.id === catalogId);
    if (item) {
      setServicePrice(item.basePrice);
      setCustomServiceName("");
    }
  };

  const buildCreateBody = () => {
    const scheduledAt = parseLocalDateTimeInput(startInput).toISOString();
    if (attendanceType === "CORPORATE_MEETING") {
      return {
        entryType: "CUSTOMER_SERVICE",
        attendanceType,
        projectId,
        title: title.trim(),
        scheduledAt,
        agenda: agenda.trim(),
        serviceChannel,
        meetingUrl: meetingUrl.trim() || null,
        meetingNotes: meetingNotes.trim() || undefined,
        internalResponsible: internalResponsible.trim(),
        durationMinutes,
      };
    }

    return {
      entryType: "CUSTOMER_SERVICE",
      attendanceType,
      projectId,
      title:
        title.trim() ||
        `${serviceLabel} — ${clientName.trim()}`,
      scheduledAt,
      clientName: clientName.trim(),
      clientPhone: clientPhone,
      durationMinutes,
      assignedProfessional: assignedProfessional.trim(),
      appointmentStatus,
      serviceChannel: "IN_PERSON",
      serviceTask: customServiceName.trim()
        ? { customName: customServiceName.trim(), price: servicePrice }
        : { taskCatalogId: serviceCatalogId, price: servicePrice },
    };
  };

  const buildPatchBody = () => {
    if (attendanceType === "CORPORATE_MEETING") {
      return {
        title: title.trim(),
        projectId,
        scheduledAt: parseLocalDateTimeInput(startInput).toISOString(),
        agenda: agenda.trim(),
        serviceChannel,
        meetingUrl: meetingUrl.trim() || null,
        meetingNotes: meetingNotes.trim() || null,
        internalResponsible: internalResponsible.trim(),
        durationMinutes,
        appointmentStatus,
      };
    }
    return {
      title: title.trim(),
      projectId,
      scheduledAt: parseLocalDateTimeInput(startInput).toISOString(),
      clientName: clientName.trim(),
      clientPhone,
      durationMinutes,
      assignedProfessional: assignedProfessional.trim(),
      appointmentStatus,
      serviceTask: customServiceName.trim()
        ? { customName: customServiceName.trim(), price: servicePrice }
        : { taskCatalogId: serviceCatalogId, price: servicePrice },
    };
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "create") {
        const response = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...buildCreateBody(), participants }),
        });
        const body = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(body.error ?? "Não foi possível salvar.");
        notifySuccess("Atendimento agendado.");
      } else if (eventId) {
        const response = await fetch(`/api/events/${eventId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...buildPatchBody(), participants }),
        });
        const body = (await response.json()) as EventListItem | { error?: string };
        if (!response.ok) {
          throw new Error("error" in body ? body.error : "Não foi possível salvar.");
        }
        if ("appointmentStatus" in body && body.appointmentStatus) {
          setAppointmentStatus(body.appointmentStatus);
        }
        notifySuccess("Atendimento atualizado.");
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

  const patchAppointmentStatus = async (status: AppointmentStatus) => {
    if (!eventId || status === appointmentStatus) return;
    setStatusUpdating(true);
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentStatus: status }),
      });
      const body = (await response.json()) as EventListItem | { error?: string };
      if (!response.ok) {
        throw new Error("error" in body ? body.error : "Falha ao atualizar status.");
      }
      setAppointmentStatus(status);
      notifySuccess(`Status: ${APPOINTMENT_STATUS_LABELS[status]}`);
    } catch (patchError: unknown) {
      const message =
        patchError instanceof Error ? patchError.message : "Erro ao atualizar.";
      notifyError(message);
    } finally {
      setStatusUpdating(false);
    }
  };

  const copyMeetingLink = async () => {
    if (!meetingUrl.trim()) {
      notifyError("Nenhum link para copiar.");
      return;
    }
    try {
      await navigator.clipboard.writeText(meetingUrl.trim());
      notifySuccess("Link copiado.");
    } catch {
      notifyError("Não foi possível copiar o link.");
    }
  };

  const openWhatsAppReminder = () => {
    const digits = phoneToWhatsAppDigits(clientPhone);
    if (!digits) {
      notifyError("Informe um WhatsApp válido.");
      return;
    }
    const message = buildWhatsAppMessage(clientName, startInput, serviceLabel);
    window.open(
      `https://wa.me/${digits}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const formClass = embedded
    ? "create-entry-form__body customer-service-form"
    : "post-modal__form customer-service-form";

  if (loadingEvent) {
    return (
      <div className="post-modal__loading" aria-busy="true">
        <div className="skeleton" style={{ height: 40 }} />
        <div className="skeleton" style={{ height: 96 }} />
      </div>
    );
  }

  const priceCents = parseMoneyToCents(servicePrice);

  return (
    <form className={formClass} onSubmit={(e) => void handleSubmit(e)}>
      <fieldset className="create-entry-form__toggle">
        <legend className="field__label">Modalidade</legend>
        <div
          className="create-entry-form__toggle-row"
          role="radiogroup"
          aria-label="Modalidade de atendimento"
        >
          <button
            type="button"
            role="radio"
            aria-checked={attendanceType === "CORPORATE_MEETING"}
            className={`create-entry-chip${attendanceType === "CORPORATE_MEETING" ? " create-entry-chip--active" : ""}`}
            onClick={() => setAttendanceType("CORPORATE_MEETING")}
          >
            Reunião B2B
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={attendanceType === "SERVICE_APPOINTMENT"}
            className={`create-entry-chip${attendanceType === "SERVICE_APPOINTMENT" ? " create-entry-chip--active" : ""}`}
            onClick={() => setAttendanceType("SERVICE_APPOINTMENT")}
          >
            Cliente final B2C
          </button>
        </div>
      </fieldset>

      <EntryProjectField
        formId={formId}
        value={projectId}
        onChange={setProjectId}
        disabled={submitting}
      />

      <label className="field">
        <span className="field__label">
          {attendanceType === "CORPORATE_MEETING" ? "Título da reunião" : "Título na agenda"}
        </span>
        <input
          className="field__input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            attendanceType === "CORPORATE_MEETING"
              ? "Ex.: Alinhamento trimestral"
              : "Opcional — gerado pelo serviço + cliente"
          }
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
          <span className="field__label">Término previsto</span>
          <p className="customer-service-form__end" aria-live="polite">
            {endLabel}
          </p>
        </label>
      </div>

      {attendanceType === "CORPORATE_MEETING" ? (
        <fieldset className="form-section">
          <legend className="form-section__legend">Reunião / alinhamento corporativo</legend>
          <label className="field">
            <span className="field__label">Pauta da reunião</span>
            <textarea
              className="field__textarea"
              rows={3}
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span className="field__label">Canal</span>
            <select
              className="field__input"
              value={serviceChannel}
              onChange={(e) => setServiceChannel(e.target.value as ServiceChannel)}
            >
              <option value="GOOGLE_MEET">Google Meet</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="IN_PERSON">Presencial</option>
              <option value="PHONE_CALL">Telefone</option>
            </select>
          </label>
          <label className="field">
            <span className="field__label">Link da reunião</span>
            <div className="customer-service-form__link-row">
              <input
                className="field__input"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://meet.google.com/…"
              />
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => void copyMeetingLink()}
              >
                Copiar link
              </button>
            </div>
          </label>
          <label className="field">
            <span className="field__label">Ata e decisões</span>
            <textarea
              className="field__textarea"
              rows={3}
              value={meetingNotes}
              onChange={(e) => setMeetingNotes(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field__label">Responsável interno</span>
            <input
              className="field__input"
              value={internalResponsible}
              onChange={(e) => setInternalResponsible(e.target.value)}
              required
            />
          </label>
        </fieldset>
      ) : (
        <fieldset className="form-section">
          <legend className="form-section__legend">Atendimento B2C (salão / barbearia)</legend>
          <label className="field">
            <span className="field__label">Cliente final</span>
            <input
              className="field__input"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span className="field__label">WhatsApp</span>
            <input
              className="field__input"
              inputMode="tel"
              value={clientPhone}
              onChange={(e) => setClientPhone(formatBrMobilePhone(e.target.value))}
              placeholder="(11) 99999-0000"
              required
            />
          </label>
          <div className="customer-service-form__service-row">
            <label className="field">
              <span className="field__label">Serviço (catálogo)</span>
              <select
                className="field__input"
                value={serviceCatalogId}
                onChange={(e) => onCatalogChange(e.target.value)}
              >
                <option value="">Personalizado</option>
                {catalog.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Nome customizado</span>
              <input
                className="field__input"
                value={customServiceName}
                onChange={(e) => setCustomServiceName(e.target.value)}
                placeholder="Ex.: Corte + barba"
              />
            </label>
            <label className="field">
              <span className="field__label">Preço (R$)</span>
              <input
                className="field__input"
                inputMode="decimal"
                value={servicePrice}
                onChange={(e) => setServicePrice(e.target.value)}
              />
              {priceCents !== null ? (
                <span className="field__hint">
                  {formatBrlFromCents(priceCents)}
                </span>
              ) : null}
            </label>
          </div>
          <div className="field">
            <span className="field__label">Duração prevista</span>
            <div className="create-entry-form__toggle-row">
              {DURATION_OPTIONS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  className={`create-entry-chip${durationMinutes === minutes ? " create-entry-chip--active" : ""}`}
                  onClick={() => setDurationMinutes(minutes)}
                >
                  {minutes} min
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span className="field__label">Profissional escalado</span>
            <input
              className="field__input"
              value={assignedProfessional}
              onChange={(e) => setAssignedProfessional(e.target.value)}
              placeholder="Ex.: João — barbeiro"
              required
            />
          </label>
          <button
            type="button"
            className="btn btn--primary btn--small customer-service-form__wa"
            onClick={openWhatsAppReminder}
          >
            Lembrar no WhatsApp
          </button>
        </fieldset>
      )}

      <fieldset className="form-section customer-service-form__presence">
        <legend className="form-section__legend">Status de presença</legend>
        <p className="field__hint">
          Atual: <strong>{APPOINTMENT_STATUS_LABELS[appointmentStatus]}</strong>
        </p>
        <div className="customer-service-form__status-row" role="group" aria-label="Status de presença">
          {APPOINTMENT_STATUS_FLOW.map((status) => (
            <button
              key={status}
              type="button"
              className={`customer-service-status${appointmentStatus === status ? " customer-service-status--active" : ""}`}
              disabled={statusUpdating || submitting}
              onClick={() => {
                if (mode === "edit" && eventId) {
                  void patchAppointmentStatus(status);
                } else {
                  setAppointmentStatus(status);
                }
              }}
            >
              {APPOINTMENT_STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </fieldset>

      <EventParticipantsField
        value={participants}
        onChange={setParticipants}
        disabled={submitting || statusUpdating}
      />

      {mode === "edit" && eventId ? (
        <EventSharePreviewField
          eventId={eventId}
          sharePreview={sharePreview}
          onUpdated={setSharePreview}
        />
      ) : null}

      {error ? (
        <div className="calendar-alert" role="alert">
          {error}
        </div>
      ) : null}

      <footer className={embedded ? "create-entry-form__footer" : "modal-panel__footer"}>
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={submitting}>
          Cancelar
        </button>
        <button type="submit" className="btn btn--primary" disabled={submitting || statusUpdating}>
          {submitting ? "Salvando…" : mode === "edit" ? "Salvar atendimento" : "Agendar"}
        </button>
      </footer>
    </form>
  );
}

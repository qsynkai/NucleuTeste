"use client";

import { SocialChannelIcons } from "@/components/calendar/social-channel-icons";
import { ProjectAvatar } from "@/components/projects/project-avatar";
import type { CalendarEventExtendedProps } from "@/lib/calendar/calendar-event-props";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/customer-service/appointment-meta";
import { EVENT_STATUS_LABELS } from "@/lib/events/status-meta";
import { formatBrlFromCents } from "@/lib/money/brl";
import { shortProjectName } from "@/lib/projects/project-meta";
import type { AppointmentStatus, ServiceChannel } from "@prisma/client";
import type { EventContentArg } from "@fullcalendar/core";

const MAX_VISIBLE_CHANNELS = 4;

function formatEventTime(date: Date | null): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function serviceChannelTag(channel: ServiceChannel | null): string {
  if (!channel) return "Reunião";
  const labels: Record<ServiceChannel, string> = {
    GOOGLE_MEET: "Meet",
    WHATSAPP: "WhatsApp",
    PHONE_CALL: "Telefone",
    IN_PERSON: "Presencial",
    OTHER: "Outro",
  };
  return labels[channel];
}

function presenceBadgeLabel(status: AppointmentStatus | null): string | null {
  if (!status) return null;
  if (status === "CONFIRMED" || status === "IN_SERVICE") {
    return APPOINTMENT_STATUS_LABELS[status];
  }
  if (status === "SCHEDULED") return APPOINTMENT_STATUS_LABELS.SCHEDULED;
  if (status === "COMPLETED") return APPOINTMENT_STATUS_LABELS.COMPLETED;
  if (status === "NO_SHOW") return APPOINTMENT_STATUS_LABELS.NO_SHOW;
  return APPOINTMENT_STATUS_LABELS[status];
}

function MeetingIcon() {
  return (
    <svg className="fc-entry-icon" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M4 5h9a2 2 0 0 1 2 2v3H4V5zm11 8h5v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6h13zm2-6h3v5h-3V7z"
        fill="currentColor"
      />
    </svg>
  );
}

function ScissorsIcon() {
  return (
    <svg className="fc-entry-icon" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M9.5 7.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5zm0 14a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5zm9.9-12.3-4.2 2.4 4.2 2.4c.5.3.7.9.4 1.4l-1 1.7c-.3.5-.9.7-1.4.4l-4.2-2.4-4.2 2.4c-.5.3-1.1.1-1.4-.4l-1-1.7c-.3-.5-.1-1.1.4-1.4l4.2-2.4-4.2-2.4c-.5-.3-.7-.9-.4-1.4l1-1.7c.3-.5.9-.7 1.4-.4l4.2 2.4 4.2-2.4c.5-.3 1.1-.1 1.4.4l1 1.7c.3.5.1 1.1-.4 1.4z"
        fill="currentColor"
      />
    </svg>
  );
}

export function CalendarEventCard({ arg }: { arg: EventContentArg }) {
  const props = arg.event.extendedProps as CalendarEventExtendedProps;
  const isList = arg.view.type.startsWith("list");
  const timeLabel = isList ? "" : formatEventTime(arg.event.start);
  const headline = arg.event.title || "Sem título";
  const project = props.showProject ? props.project : undefined;

  if (props.entryType === "SIMPLE_REMINDER") {
    return (
      <div className="fc-post-card fc-post-card--reminder" title={headline}>
        <div className="fc-post-card__reminder-line" aria-hidden />
        {timeLabel ? (
          <time className="fc-post-card__time" dateTime={arg.event.start?.toISOString()}>
            {timeLabel}
          </time>
        ) : null}
        <p className="fc-post-card__title">{headline}</p>
      </div>
    );
  }

  if (props.entryType === "PRODUCTION_EVENT") {
    const total =
      props.productionTotalCents > 0
        ? formatBrlFromCents(props.productionTotalCents)
        : null;
    return (
      <div className="fc-post-card fc-post-card--production" title={headline}>
        <div className="fc-post-card__row">
          {timeLabel ? (
            <time className="fc-post-card__time" dateTime={arg.event.start?.toISOString()}>
              {timeLabel}
            </time>
          ) : null}
          {total ? <span className="fc-entry-badge fc-entry-badge--money">{total}</span> : null}
        </div>
        <p className="fc-post-card__title">{headline}</p>
        <div className="fc-post-card__foot">
          <span className="fc-entry-badge fc-entry-badge--status">
            {EVENT_STATUS_LABELS[props.currentStatus]}
          </span>
          {project ? (
            <span className="fc-post-card__project">
              <ProjectAvatar
                name={project.name}
                avatarUrl={project.avatarUrl}
                accentColor={project.accentColor}
                size={14}
              />
              <span className="fc-post-card__project-name">
                {shortProjectName(project.name, 10)}
              </span>
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  if (props.entryType === "CUSTOMER_SERVICE") {
    const isB2C = props.attendanceType === "SERVICE_APPOINTMENT";
    const presence = presenceBadgeLabel(props.appointmentStatus);
    return (
      <div
        className={`fc-post-card fc-post-card--service${isB2C ? " fc-post-card--service-b2c" : " fc-post-card--service-b2b"}`}
        title={headline}
      >
        <div className="fc-post-card__row">
          {timeLabel ? (
            <time className="fc-post-card__time" dateTime={arg.event.start?.toISOString()}>
              {timeLabel}
            </time>
          ) : null}
          <span className="fc-entry-icon-wrap" aria-hidden>
            {isB2C ? <ScissorsIcon /> : <MeetingIcon />}
          </span>
        </div>
        {isB2C ? (
          <>
            <p className="fc-post-card__title">{props.clientName || headline}</p>
            {presence ? (
              <span className={`fc-entry-badge fc-entry-badge--presence fc-entry-badge--presence-${props.appointmentStatus?.toLowerCase()}`}>
                {presence}
              </span>
            ) : null}
          </>
        ) : (
          <>
            <p className="fc-post-card__title">{headline}</p>
            <span className="fc-entry-badge fc-entry-badge--channel">
              {serviceChannelTag(props.serviceChannel)}
            </span>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className="fc-post-card fc-post-card--social"
      title={project ? `${headline} — ${project.name}` : headline}
    >
      <div className="fc-post-card__row">
        {timeLabel ? (
          <time className="fc-post-card__time" dateTime={arg.event.start?.toISOString()}>
            {timeLabel}
          </time>
        ) : null}
        <SocialChannelIcons
          channels={props.channels ?? []}
          size={12}
          max={MAX_VISIBLE_CHANNELS}
        />
      </div>
      <p className="fc-post-card__title">{headline}</p>
      {project ? (
        <div className="fc-post-card__foot">
          <span className="fc-post-card__project">
            <ProjectAvatar
              name={project.name}
              avatarUrl={project.avatarUrl}
              accentColor={project.accentColor}
              size={14}
            />
            <span className="fc-post-card__project-name">
              {shortProjectName(project.name, 10)}
            </span>
          </span>
        </div>
      ) : null}
    </div>
  );
}

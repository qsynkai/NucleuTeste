import type { EventContentArg } from "@fullcalendar/core";
import type { PostStatus, SocialChannel } from "@prisma/client";
import { SocialChannelIcons } from "@/components/calendar/social-channel-icons";
import { ProjectAvatar } from "@/components/projects/project-avatar";
import { POST_STATUS_LABELS } from "@/lib/posts/status-meta";
import { shortProjectName } from "@/lib/projects/project-meta";
import type { ProjectSummary } from "@/lib/types/project-api";

type PostEventExtendedProps = {
  content: string;
  channels: SocialChannel[];
  status: PostStatus;
  project?: ProjectSummary;
  showProject?: boolean;
};

const MAX_VISIBLE_CHANNELS = 3;

function formatEventTime(date: Date | null): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function summarize(text: string, maxLength = 48): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}…`;
}

export function PostEventCard({ arg }: { arg: EventContentArg }) {
  const props = arg.event.extendedProps as PostEventExtendedProps;
  const isList = arg.view.type.startsWith("list");
  // Na visão em lista o FullCalendar já exibe a coluna de horário.
  const timeLabel = isList ? "" : formatEventTime(arg.event.start);
  const headline = arg.event.title || "Sem título";
  const caption = summarize(props.content || headline);
  const project = props.showProject ? props.project : undefined;
  const statusLabel = POST_STATUS_LABELS[props.status];

  return (
    <div
      className="fc-post-card"
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
      <p className="fc-post-card__caption">{caption}</p>
      <div className="fc-post-card__foot">
        <span
          className={`fc-post-card__status fc-post-card__status--${props.status.toLowerCase()}`}
        >
          {statusLabel}
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

"use client";

import { SocialChannelIcons } from "@/components/calendar/social-channel-icons";
import {
  CALENDAR_STATUS_FILTER_OPTIONS,
  type CalendarFilters,
} from "@/lib/calendar/filter-posts";
import { POST_STATUS_LABELS } from "@/lib/posts/status-meta";
import type { PostStatus, SocialChannel } from "@prisma/client";

const CHANNEL_TOGGLES: SocialChannel[] = [
  "INSTAGRAM",
  "FACEBOOK",
  "YOUTUBE",
  "LINKEDIN",
];

type CalendarToolbarProps = {
  filters: CalendarFilters;
  onChange: (filters: CalendarFilters) => void;
  visibleCount: number;
  totalCount: number;
};

export function CalendarToolbar({
  filters,
  onChange,
  visibleCount,
  totalCount,
}: CalendarToolbarProps) {
  const toggleChannel = (channel: SocialChannel) => {
    const selected = filters.channels.includes(channel);
    const channels = selected
      ? filters.channels.filter((item) => item !== channel)
      : [...filters.channels, channel];
    onChange({ ...filters, channels });
  };

  const toggleStatus = (status: PostStatus) => {
    const selected = filters.statuses.includes(status);
    const statuses = selected
      ? filters.statuses.filter((item) => item !== status)
      : [...filters.statuses, status];
    onChange({ ...filters, statuses });
  };

  const clearFilters = () => {
    onChange({
      channels: [],
      statuses: [],
      searchQuery: "",
    });
  };

  const hasActiveFilters =
    filters.channels.length > 0 ||
    filters.statuses.length > 0 ||
    filters.searchQuery.trim().length > 0;

  return (
    <div className="calendar-toolbar" role="region" aria-label="Filtros da agenda">
      <div className="calendar-toolbar__row">
        <div className="calendar-toolbar__group">
          <span className="calendar-toolbar__label">Redes</span>
          <div className="calendar-toolbar__channel-toggles">
            {CHANNEL_TOGGLES.map((channel) => {
              const active = filters.channels.includes(channel);
              return (
                <button
                  key={channel}
                  type="button"
                  className={`calendar-toolbar__channel-btn${active ? " calendar-toolbar__channel-btn--active" : ""}`}
                  aria-pressed={active}
                  aria-label={channelLabel(channel)}
                  title={channelLabel(channel)}
                  onClick={() => toggleChannel(channel)}
                >
                  <SocialChannelIcons channels={[channel]} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="calendar-toolbar__group calendar-toolbar__group--status">
          <span className="calendar-toolbar__label">Status</span>
          <div className="calendar-toolbar__status-list">
            {CALENDAR_STATUS_FILTER_OPTIONS.map((status) => {
              const active = filters.statuses.includes(status);
              return (
                <label
                  key={status}
                  className={`calendar-toolbar__status-option${active ? " calendar-toolbar__status-option--active" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleStatus(status)}
                  />
                  {POST_STATUS_LABELS[status]}
                </label>
              );
            })}
          </div>
        </div>
      </div>

      <div className="calendar-toolbar__row calendar-toolbar__row--search">
        <label className="calendar-toolbar__search">
          <span className="calendar-toolbar__label">Busca</span>
          <input
            type="search"
            className="calendar-toolbar__search-input"
            placeholder="Título ou legenda…"
            value={filters.searchQuery}
            onChange={(event) =>
              onChange({ ...filters, searchQuery: event.target.value })
            }
          />
        </label>

        <div className="calendar-toolbar__meta">
          <span className="calendar-toolbar__count">
            Exibindo {visibleCount} de {totalCount}
          </span>
          {hasActiveFilters ? (
            <button
              type="button"
              className="btn btn--ghost calendar-toolbar__clear"
              onClick={clearFilters}
            >
              Limpar filtros
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function channelLabel(channel: SocialChannel): string {
  const labels: Record<SocialChannel, string> = {
    INSTAGRAM: "Instagram",
    FACEBOOK: "Facebook",
    YOUTUBE: "YouTube",
    LINKEDIN: "LinkedIn",
  };
  return labels[channel];
}

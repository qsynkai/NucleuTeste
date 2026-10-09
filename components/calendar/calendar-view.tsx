"use client";

import { CalendarLoadingSkeleton } from "@/components/calendar/calendar-loading-skeleton";
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { PostEventCard } from "@/components/calendar/post-event-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PostDetailsModal } from "@/components/PostDetailsModal";
import { PostModal, type PostModalMode } from "@/components/PostModal";
import { ProjectStrip } from "@/components/projects/project-strip";
import { useProjects } from "@/hooks/use-projects";
import { useSelectedProject } from "@/hooks/use-selected-project";
import {
  loadCalendarPreferences,
  saveCalendarPreferences,
  type CalendarViewType,
} from "@/lib/calendar/calendar-preferences";
import { filterPostsForCalendar } from "@/lib/calendar/filter-posts";
import { mapPostsToCalendarEvents } from "@/lib/calendar/map-posts-to-events";
import { defaultScheduleDate } from "@/lib/datetime/local-input";
import { readApiErrorMessage } from "@/lib/api/read-api-error";
import { fetchWithRetry } from "@/lib/api/fetch-with-retry";
import { notifyNetworkError } from "@/lib/notify";
import type { PostCalendarItem, PostsListResponse } from "@/lib/types/post-api";
import type {
  DateSelectArg,
  DatesSetArg,
  EventClickArg,
  EventContentArg,
  EventDropArg,
} from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function isStoredViewType(value: string): value is CalendarViewType {
  return (
    value === "dayGridMonth" ||
    value === "timeGridWeek" ||
    value === "listWeek"
  );
}

export function CalendarView() {
  const calendarRef = useRef<FullCalendar>(null);
  const [allPosts, setAllPosts] = useState<PostCalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [calendarView, setCalendarView] = useState<CalendarViewType>("timeGridWeek");
  const [filters, setFilters] = useState(() => loadCalendarPreferences().filters);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formModalMode, setFormModalMode] = useState<PostModalMode>("create");
  const [formPostId, setFormPostId] = useState<string | null>(null);
  const [initialScheduledAt, setInitialScheduledAt] = useState<Date | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsPostId, setDetailsPostId] = useState<string | null>(null);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadCalendarPreferences();
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    setCalendarView(
      isMobile && stored.view === "dayGridMonth" ? "listWeek" : stored.view,
    );
    setFilters(stored.filters);
    setPreferencesReady(true);
  }, []);

  useEffect(() => {
    if (!preferencesReady) return;
    saveCalendarPreferences({ view: calendarView, filters });
  }, [calendarView, filters, preferencesReady]);

  const { projectId, select: selectProject } = useSelectedProject();
  const {
    projects: allProjects,
    loading: projectsLoading,
    error: projectsError,
  } = useProjects({ includeArchived: true });
  const [range, setRange] = useState<{ start: number; end: number } | null>(null);

  const selectedProject = useMemo(
    () => allProjects.find((project) => project.id === projectId) ?? null,
    [allProjects, projectId],
  );
  const selectedIsArchived = Boolean(selectedProject && !selectedProject.isActive);

  // A faixa lista os projetos ativos (+ o selecionado, se estiver arquivado).
  const stripProjects = useMemo(
    () =>
      allProjects.filter(
        (project) => project.isActive || project.id === projectId,
      ),
    [allProjects, projectId],
  );

  // Projeto da URL inexistente (ou de outro usuário): volta à visão geral.
  useEffect(() => {
    if (projectsLoading || projectsError || !projectId) return;
    if (!allProjects.some((project) => project.id === projectId)) {
      notifyNetworkError("Projeto não encontrado. Exibindo todos os projetos.");
      selectProject(null);
    }
  }, [allProjects, projectId, projectsError, projectsLoading, selectProject]);

  // Seleção de projeto filtra no cliente (troca instantânea); a API só é
  // consultada por projeto quando ele está arquivado (fora da visão global).
  const projectPosts = useMemo(
    () =>
      projectId ? allPosts.filter((post) => post.projectId === projectId) : allPosts,
    [allPosts, projectId],
  );

  const filteredPosts = useMemo(
    () => filterPostsForCalendar(projectPosts, filters),
    [projectPosts, filters],
  );

  const events = useMemo(
    () => mapPostsToCalendarEvents(filteredPosts, { showProject: projectId === null }),
    [filteredPosts, projectId],
  );

  const schedulablePostsCount = useMemo(
    () => projectPosts.filter((post) => Boolean(post.scheduledAt)).length,
    [projectPosts],
  );

  // Posts por projeto no período visível (respeitando rede/status/busca).
  const periodCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const post of filterPostsForCalendar(allPosts, filters)) {
      if (!post.scheduledAt) continue;
      const time = new Date(post.scheduledAt).getTime();
      if (range && (time < range.start || time >= range.end)) continue;
      counts[post.projectId] = (counts[post.projectId] ?? 0) + 1;
    }
    return counts;
  }, [allPosts, filters, range]);

  const periodTotal = useMemo(
    () => stripProjects.reduce((sum, project) => sum + (periodCounts[project.id] ?? 0), 0),
    [periodCounts, stripProjects],
  );

  const postsUrl =
    projectId && selectedIsArchived
      ? `/api/posts?projectId=${encodeURIComponent(projectId)}`
      : "/api/posts";

  const loadPosts = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }
    setLoadError(null);

    try {
      const response = await fetchWithRetry(postsUrl, {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (response.status === 401) {
        window.location.assign(
          `/login?next=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`,
        );
        return;
      }
      if (!response.ok) {
        throw new Error(
          await readApiErrorMessage(response, "Falha ao carregar postagens."),
        );
      }

      const data = (await response.json()) as PostsListResponse;
      setAllPosts(data.posts);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar a agenda.";
      setLoadError(message);
      if (!options?.silent) {
        notifyNetworkError(message);
      }
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [postsUrl]);

  // Com projeto na URL, espera os projetos para saber se ele está arquivado
  // (nesse caso os posts vêm de /api/posts?projectId=).
  const canLoadPosts = !(projectId && projectsLoading);

  const loadedOnceRef = useRef(false);

  useEffect(() => {
    if (!canLoadPosts) return;
    // Recargas posteriores (ex.: projeto arquivado) não desmontam o calendário.
    void loadPosts({ silent: loadedOnceRef.current }).then(() => {
      loadedOnceRef.current = true;
    });
  }, [canLoadPosts, loadPosts]);

  useEffect(() => {
    if (!preferencesReady) return;
    const api = calendarRef.current?.getApi();
    if (!api) return;
    if (api.view.type !== calendarView) {
      api.changeView(calendarView);
    }
    // Restaura a visão salva apenas na hidratação inicial.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferencesReady]);

  const openCreateModal = useCallback((date?: Date) => {
    setFormModalMode("create");
    setFormPostId(null);
    setInitialScheduledAt(defaultScheduleDate(date ?? new Date()));
    setFormModalOpen(true);
  }, []);

  const openDetailsModal = useCallback((postId: string) => {
    setDetailsPostId(postId);
    setDetailsOpen(true);
  }, []);

  const openEditModal = useCallback((postId: string) => {
    setDetailsOpen(false);
    setFormModalMode("edit");
    setFormPostId(postId);
    setInitialScheduledAt(null);
    setFormModalOpen(true);
  }, []);

  const handleDateClick = useCallback(
    (arg: DateClickArg) => {
      openCreateModal(arg.date);
    },
    [openCreateModal],
  );

  const handleSelect = useCallback(
    (arg: DateSelectArg) => {
      openCreateModal(arg.start);
      arg.view.calendar.unselect();
    },
    [openCreateModal],
  );

  const handleEventClick = useCallback(
    (arg: EventClickArg) => {
      arg.jsEvent.preventDefault();
      if (arg.event.id) {
        openDetailsModal(arg.event.id);
      }
    },
    [openDetailsModal],
  );

  const handlePostUpdated = useCallback(
    (updated?: PostCalendarItem) => {
      if (updated) {
        setAllPosts((current) =>
          current.map((post) => (post.id === updated.id ? updated : post)),
        );
      }
      void loadPosts({ silent: true });
    },
    [loadPosts],
  );

  const handleEventDrop = useCallback(
    async (arg: EventDropArg) => {
      setRescheduleError(null);
      const postId = arg.event.id;
      const start = arg.event.start;

      if (!postId || !start) {
        arg.revert();
        return;
      }

      try {
        const response = await fetch(`/api/posts/${postId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduledAt: start.toISOString() }),
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(payload?.error ?? "Não foi possível reagendar.");
        }
        const updated = (await response.json()) as PostCalendarItem;
        setAllPosts((current) =>
          current.map((post) => (post.id === updated.id ? updated : post)),
        );
      } catch (error: unknown) {
        arg.revert();
        const message =
          error instanceof Error ? error.message : "Erro ao reagendar.";
        setRescheduleError(message);
      }
    },
    [],
  );

  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    setRescheduleError(null);
    const start = arg.start.getTime();
    const end = arg.end.getTime();
    setRange((current) =>
      current && current.start === start && current.end === end
        ? current
        : { start, end },
    );
    if (isStoredViewType(arg.view.type)) {
      setCalendarView(arg.view.type);
    }
  }, []);

  const calendarOptions = useMemo(
    () => ({
      plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
      // O calendário só monta após o carregamento; nesse momento a visão
      // preferida (ex.: lista no celular) já foi lida das preferências.
      initialView: calendarView,
      locale: "pt-br",
      headerToolbar: {
        left: "prev,next today",
        center: "title",
        right: "listWeek,timeGridWeek,dayGridMonth",
      },
      buttonText: {
        today: "Hoje",
        month: "Mês",
        week: "Semana",
        list: "Lista",
      },
      allDaySlot: false,
      slotMinTime: "06:00:00",
      slotMaxTime: "22:00:00",
      height: "auto",
      expandRows: true,
      nowIndicator: true,
      selectable: true,
      selectMirror: true,
      editable: true,
      eventDurationEditable: false,
      dayMaxEvents: 3,
      events,
      dateClick: handleDateClick,
      select: handleSelect,
      eventClick: handleEventClick,
      eventDrop: handleEventDrop,
      eventContent: (arg: EventContentArg) => <PostEventCard arg={arg} />,
      datesSet: handleDatesSet,
    }),
    [
      calendarView,
      events,
      handleDateClick,
      handleSelect,
      handleEventClick,
      handleEventDrop,
      handleDatesSet,
    ],
  );

  return (
    <section className="calendar-shell">
      <header className="page-head">
        <div>
          <p className="eyebrow">
            Planejamento{selectedProject ? ` · ${selectedProject.name}` : ""}
          </p>
          <h1 className="page-head__title">Agenda</h1>
          <p className="page-head__sub">
            Filtre por rede e status, clique em uma postagem para ver os
            detalhes e arraste para reagendar.
          </p>
        </div>
        <div className="page-head__actions">
          {loading ? (
            <span className="calendar-shell__badge" role="status">
              Carregando
            </span>
          ) : null}
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => openCreateModal()}
          >
            Novo agendamento
          </button>
        </div>
      </header>

      <ProjectStrip
        projects={stripProjects}
        selectedId={projectId}
        onSelect={selectProject}
        counts={periodCounts}
        totalCount={periodTotal}
        loading={projectsLoading}
        ariaLabel="Filtrar agenda por projeto"
      />

      {projectsError ? (
        <div className="calendar-alert calendar-alert--error" role="alert">
          {projectsError}
        </div>
      ) : null}

      {loadError ? (
        <div className="calendar-alert calendar-alert--error" role="alert">
          <p>{loadError}</p>
          <button type="button" className="btn btn--ghost" onClick={() => void loadPosts()}>
            Tentar novamente
          </button>
        </div>
      ) : null}

      {rescheduleError ? (
        <div className="calendar-alert calendar-alert--error" role="alert">
          {rescheduleError}
        </div>
      ) : null}

      <CalendarToolbar
        filters={filters}
        onChange={setFilters}
        visibleCount={filteredPosts.length}
        totalCount={schedulablePostsCount}
      />

      <div className="calendar-shell__frame">
        {loading ? (
          <CalendarLoadingSkeleton />
        ) : (
          <>
            {filteredPosts.length === 0 ? (
              <EmptyState
                title={
                  selectedProject
                    ? `Nenhuma postagem em ${selectedProject.name}`
                    : "Nenhuma postagem neste recorte"
                }
                description="Ajuste os filtros ou clique em um horário vago na grade para criar um agendamento."
                action={
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => openCreateModal()}
                  >
                    Novo agendamento
                  </button>
                }
              />
            ) : null}
            <FullCalendar ref={calendarRef} {...calendarOptions} />
          </>
        )}
      </div>

      <PostDetailsModal
        open={detailsOpen}
        postId={detailsPostId}
        onClose={() => setDetailsOpen(false)}
        onUpdated={handlePostUpdated}
        onDeleted={() => void loadPosts({ silent: true })}
        onEdit={openEditModal}
      />

      <PostModal
        open={formModalOpen}
        mode={formModalMode}
        postId={formPostId}
        initialScheduledAt={initialScheduledAt}
        defaultProjectId={projectId}
        onClose={() => setFormModalOpen(false)}
        onSaved={() => void loadPosts({ silent: true })}
      />
    </section>
  );
}

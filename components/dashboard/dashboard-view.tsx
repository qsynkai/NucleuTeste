"use client";

import { ChannelDistribution } from "@/components/dashboard/channel-distribution";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateEntryDialog } from "@/components/CreateEntryDialog";
import { PostDetailsModal } from "@/components/PostDetailsModal";
import { PostModal, type PostModalMode } from "@/components/PostModal";
import { ChannelBadges } from "@/components/channel-badges";
import { ProjectAvatar } from "@/components/projects/project-avatar";
import { ProjectStrip } from "@/components/projects/project-strip";
import { useProjects } from "@/hooks/use-projects";
import { useSelectedProject } from "@/hooks/use-selected-project";
import { useSessionUser } from "@/hooks/use-session-user";
import Link from "next/link";
import { POST_STATUS_LABELS, postStatusBadgeClassName } from "@/lib/posts/status-meta";
import { readApiErrorMessage } from "@/lib/api/read-api-error";
import { fetchWithRetry } from "@/lib/api/fetch-with-retry";
import { defaultScheduleDate } from "@/lib/datetime/local-input";
import { notifyNetworkError } from "@/lib/notify";
import type {
  DashboardMetricsResponse,
  DashboardUpcomingPost,
} from "@/lib/types/dashboard-metrics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function ProjectTag({ project }: { project: DashboardUpcomingPost["project"] }) {
  return (
    <span className="project-tag">
      <ProjectAvatar
        name={project.name}
        avatarUrl={project.avatarUrl}
        accentColor={project.accentColor}
        size={18}
      />
      <span className="project-tag__name">{project.name}</span>
    </span>
  );
}

function formatDay(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  })
    .format(new Date(value))
    .replace(/\./g, "");
}

function formatLongDay(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date(value));
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatToday(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(date)
    .replace(/\./g, "");
}

function formatCountdown(value: string, now = new Date()): string {
  const diffMs = new Date(value).getTime() - now.getTime();
  if (diffMs <= 0) return "agora";
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) return `em ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest ? `em ${hours}h ${rest}min` : `em ${hours}h`;
  }
  const days = Math.floor(hours / 24);
  return `em ${days} ${days === 1 ? "dia" : "dias"}`;
}

function summarize(text: string, max = 160): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
}

const pad = (value: number) => String(value).padStart(2, "0");

type NextPostPanelProps = {
  post: DashboardUpcomingPost | undefined;
  showProject: boolean;
  onOpen: (postId: string) => void;
  onEdit: (postId: string) => void;
  onCreate: () => void;
};

function NextPostPanel({ post, showProject, onOpen, onEdit, onCreate }: NextPostPanelProps) {
  if (!post) {
    return (
      <section className="hero hero--empty" aria-label="Próxima publicação">
        <EmptyState
          title="Nenhuma publicação futura"
          description="Quando você agendar posts, a próxima publicação aparece aqui com horário, canais e ações rápidas."
          action={
            <button type="button" className="btn btn--primary" onClick={onCreate}>
              Novo agendamento
            </button>
          }
        />
      </section>
    );
  }

  return (
    <section className="hero" aria-labelledby="next-post-title">
      <div style={{ minWidth: 0 }}>
        <div className="hero__eyebrow">
          <span className="hero__signal">Próxima publicação</span>
          <span className={`status-badge ${postStatusBadgeClassName(post.status)}`}>
            {POST_STATUS_LABELS[post.status]}
          </span>
          {showProject ? <ProjectTag project={post.project} /> : null}
        </div>
        <div className="hero__when">
          <time className="hero__time" dateTime={post.scheduledAt}>
            {formatTime(post.scheduledAt)}
          </time>
          <span className="hero__date">{formatLongDay(post.scheduledAt)}</span>
          <span className="hero__countdown">{formatCountdown(post.scheduledAt)}</span>
        </div>
        <h2 id="next-post-title" className="hero__title">
          {post.title}
        </h2>
        <p className="hero__summary">{summarize(post.content)}</p>
        <ChannelBadges channels={post.channels} />
      </div>
      <div className="hero__actions">
        <button type="button" className="btn btn--primary" onClick={() => onOpen(post.id)}>
          Abrir detalhes
        </button>
        <button type="button" className="btn" onClick={() => onEdit(post.id)}>
          Editar agendamento
        </button>
      </div>
    </section>
  );
}

export function DashboardView() {
  const [metrics, setMetrics] = useState<DashboardMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsPostId, setDetailsPostId] = useState<string | null>(null);
  const [createEntryOpen, setCreateEntryOpen] = useState(false);
  const [createEntryDate, setCreateEntryDate] = useState<Date | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<PostModalMode>("edit");
  const [formPostId, setFormPostId] = useState<string | null>(null);
  const [formInitialDate, setFormInitialDate] = useState<Date | null>(null);
  const { permissions } = useSessionUser();
  const { projectId, select: selectProject } = useSelectedProject();
  const {
    projects: allProjects,
    loading: projectsLoading,
    error: projectsError,
  } = useProjects({ includeArchived: true });

  useEffect(() => {
    setToday(formatToday(new Date()));
  }, []);

  const selectedProject = useMemo(
    () => allProjects.find((project) => project.id === projectId) ?? null,
    [allProjects, projectId],
  );

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
      notifyNetworkError("Projeto não encontrado. Exibindo a visão geral.");
      selectProject(null);
    }
  }, [allProjects, projectId, projectsError, projectsLoading, selectProject]);

  const hasLoadedRef = useRef(false);

  const metricsUrl = projectId
    ? `/api/dashboard/metrics?projectId=${encodeURIComponent(projectId)}`
    : "/api/dashboard/metrics";

  const loadMetrics = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      const response = await fetchWithRetry(metricsUrl, {
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
          await readApiErrorMessage(response, "Falha ao carregar métricas."),
        );
      }
      const data = (await response.json()) as DashboardMetricsResponse;
      setMetrics(data);
    } catch (loadError: unknown) {
      const message =
        loadError instanceof Error ? loadError.message : "Erro ao carregar painel.";
      setError(message);
      if (!silent) notifyNetworkError(message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [metricsUrl]);

  useEffect(() => {
    // Trocar de projeto recarrega sem esconder o painel atrás do skeleton.
    void loadMetrics(hasLoadedRef.current).then(() => {
      hasLoadedRef.current = true;
    });
  }, [loadMetrics]);

  const openDetails = (postId: string) => {
    setDetailsPostId(postId);
    setDetailsOpen(true);
  };

  const openEdit = (postId: string) => {
    setDetailsOpen(false);
    setFormMode("edit");
    setFormPostId(postId);
    setFormInitialDate(null);
    setFormOpen(true);
  };

  const openCreate = () => {
    setCreateEntryDate(defaultScheduleDate(new Date()));
    setCreateEntryOpen(true);
  };

  const refreshAfterChange = () => void loadMetrics(true);

  const upcoming = metrics?.upcomingPosts ?? [];
  const nextPost = upcoming[0];
  const queue = upcoming.slice(1);
  const weekShare =
    metrics && metrics.scheduledNext7Days > 0
      ? Math.round((metrics.scheduledNext24Hours / metrics.scheduledNext7Days) * 100)
      : 0;

  return (
    <div>
      <header className="page-head">
        <div>
          <p className="eyebrow">
            Centro de controle{selectedProject ? ` · ${selectedProject.name}` : ""}
          </p>
          <h1 className="page-head__title">Visão geral</h1>
          <p className="page-head__sub">
            {selectedProject
              ? `Indicadores, próximas publicações e pendências de ${selectedProject.name}.`
              : "Prazos, publicações e pendências de todos os seus projetos."}
          </p>
        </div>
        <div className="page-head__actions">
          {!projectId && metrics ? (
            <Link href="/projects" className="date-chip date-chip--link">
              {pad(metrics.activeProjects)}{" "}
              {metrics.activeProjects === 1 ? "projeto ativo" : "projetos ativos"}
            </Link>
          ) : null}
          <span className="date-chip" suppressHydrationWarning>
            {today ?? " "}
          </span>
          {permissions.canCreate ? (
            <button type="button" className="btn btn--primary" onClick={openCreate}>
              Novo agendamento
            </button>
          ) : null}
        </div>
      </header>

      <ProjectStrip
        projects={stripProjects}
        selectedId={projectId}
        onSelect={selectProject}
        loading={projectsLoading}
        ariaLabel="Filtrar painel por projeto"
      />

      {projectsError ? (
        <div className="calendar-alert" role="alert" style={{ marginTop: "1rem" }}>
          {projectsError}
        </div>
      ) : null}

      {error ? (
        <div className="calendar-alert" role="alert" style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      ) : null}

      {loading ? (
        <DashboardSkeleton />
      ) : metrics ? (
        <>
          <NextPostPanel
            showProject={!projectId}
            post={nextPost}
            onOpen={openDetails}
            onEdit={openEdit}
            onCreate={openCreate}
          />

          <section className="metrics" aria-label="Indicadores">
            <article className="panel metric-lead">
              <p className="eyebrow">Próximas 24h</p>
              <p className="metric-lead__value">{pad(metrics.scheduledNext24Hours)}</p>
              <p className="metric-lead__hint">Publicações iminentes</p>
              <div className="meter">
                <div
                  className="meter__track"
                  role="img"
                  aria-label={`${weekShare}% das publicações da semana acontecem nas próximas 24 horas`}
                >
                  <div className="meter__fill" style={{ width: `${weekShare}%` }} />
                </div>
                <div className="meter__caption">
                  <span>{weekShare}% da semana</span>
                  <span>{pad(metrics.scheduledNext7Days)} em 7 dias</span>
                </div>
              </div>
            </article>

            <div className="panel">
              <ul className="metric-list">
                <li className="metric-row">
                  <span className="metric-row__label">Próximos 7 dias</span>
                  <span className="metric-row__hint">Volume agendado na semana</span>
                  <span className="metric-row__value">{pad(metrics.scheduledNext7Days)}</span>
                </li>
                <li
                  className={`metric-row${metrics.overduePending > 0 ? " metric-row--alert" : ""}`}
                >
                  <span className="metric-row__label">
                    Atrasadas / pendentes
                    {metrics.overduePending > 0 ? (
                      <span className="metric-row__flag">Requer ação</span>
                    ) : null}
                  </span>
                  <span className="metric-row__hint">Passaram do horário sem publicar</span>
                  <span className="metric-row__value">{pad(metrics.overduePending)}</span>
                </li>
                <li className="metric-row">
                  <span className="metric-row__label">Publicadas no mês</span>
                  <span className="metric-row__hint">Posts com status publicado</span>
                  <span className="metric-row__value">{pad(metrics.publishedThisMonth)}</span>
                </li>
              </ul>
            </div>
          </section>

          <ul className="status-line" aria-label="Posts por status">
            <li>
              <span className="status-badge status-badge--draft">Rascunho</span>
              <strong>{pad(metrics.byStatus.draft)}</strong>
            </li>
            <li>
              <span className="status-badge status-badge--scheduled">Agendado</span>
              <strong>{pad(metrics.byStatus.scheduled)}</strong>
            </li>
            <li>
              <span className="status-badge status-badge--published">Publicado</span>
              <strong>{pad(metrics.byStatus.published)}</strong>
            </li>
            {metrics.byStatus.failed > 0 ? (
              <li>
                <span className="status-badge status-badge--failed">Falhou</span>
                <strong>{pad(metrics.byStatus.failed)}</strong>
              </li>
            ) : null}
          </ul>

          <div className="dash-grid">
            <section className="panel" aria-labelledby="queue-title">
              <header className="panel__head">
                <h2 id="queue-title" className="panel__title">
                  Agenda operacional
                </h2>
                <span className="eyebrow">Em seguida</span>
              </header>

              {queue.length ? (
                <ul className="queue">
                  {queue.map((post) => (
                    <li key={post.id} className="queue__item">
                      <time className="queue__when" dateTime={post.scheduledAt}>
                        <span className="queue__time">{formatTime(post.scheduledAt)}</span>
                        <span className="queue__day">{formatDay(post.scheduledAt)}</span>
                      </time>
                      <div style={{ minWidth: 0 }}>
                        <h3 className="queue__title">{post.title}</h3>
                        <div className="queue__meta">
                          <span className={`status-badge ${postStatusBadgeClassName(post.status)}`}>
                            {POST_STATUS_LABELS[post.status]}
                          </span>
                          <ChannelBadges channels={post.channels} />
                          {!projectId ? <ProjectTag project={post.project} /> : null}
                        </div>
                      </div>
                      <div className="queue__action">
                        <button
                          type="button"
                          onClick={() => openDetails(post.id)}
                          className="btn btn--ghost btn--small"
                          aria-label={`Abrir detalhes de ${post.title}`}
                        >
                          Abrir
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  title={nextPost ? "Sem outras publicações na fila" : "Fila vazia"}
                  description="As próximas postagens agendadas aparecem aqui, ordenadas pela data mais próxima."
                />
              )}
            </section>

            <ChannelDistribution counts={metrics.byChannel} />
          </div>
        </>
      ) : null}

      <PostDetailsModal
        open={detailsOpen}
        postId={detailsPostId}
        onClose={() => setDetailsOpen(false)}
        onUpdated={refreshAfterChange}
        onDeleted={refreshAfterChange}
        onEdit={permissions.canCreate ? openEdit : undefined}
        canEdit={permissions.canCreate}
        canDelete={permissions.canDelete}
      />

      <CreateEntryDialog
        open={createEntryOpen}
        initialScheduledAt={createEntryDate}
        defaultProjectId={projectId}
        onClose={() => setCreateEntryOpen(false)}
        onSaved={refreshAfterChange}
      />

      <PostModal
        open={formOpen}
        mode={formMode}
        postId={formPostId}
        initialScheduledAt={formInitialDate}
        defaultProjectId={projectId}
        onClose={() => setFormOpen(false)}
        onSaved={refreshAfterChange}
      />
    </div>
  );
}

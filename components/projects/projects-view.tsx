"use client";

import { ProjectAvatar } from "@/components/projects/project-avatar";
import { ProjectModal } from "@/components/projects/project-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { useProjects } from "@/hooks/use-projects";
import { PROJECT_TYPE_LABELS } from "@/lib/projects/project-meta";
import type { ProjectListItem } from "@/lib/types/project-api";
import Link from "next/link";
import { useSessionUser } from "@/hooks/use-session-user";
import { useState } from "react";

const pad = (value: number) => String(value).padStart(2, "0");

function ProjectsSkeleton() {
  return (
    <div className="projects-grid" aria-hidden>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={`project-skeleton-${index}`} className="skeleton" style={{ height: 190 }} />
      ))}
    </div>
  );
}

function ProjectCard({
  project,
  onEdit,
  canManage,
}: {
  project: ProjectListItem;
  onEdit: (project: ProjectListItem) => void;
  canManage: boolean;
}) {
  return (
    <li className={`panel project-card${project.isActive ? "" : " project-card--archived"}`}>
      <div className="project-card__head">
        <ProjectAvatar
          name={project.name}
          avatarUrl={project.avatarUrl}
          accentColor={project.accentColor}
          size={46}
        />
        <div className="project-card__title">
          <h2>{project.name}</h2>
          <span className="eyebrow">{PROJECT_TYPE_LABELS[project.type]}</span>
        </div>
        <span
          className={`status-badge ${project.isActive ? "status-badge--scheduled" : "status-badge--draft"}`}
        >
          {project.isActive ? "Ativo" : "Arquivado"}
        </span>
      </div>

      {project.description ? (
        <p className="project-card__desc">{project.description}</p>
      ) : (
        <p className="project-card__desc project-card__desc--empty">Sem descrição.</p>
      )}

      <dl className="project-card__stats">
        <div>
          <dt className="eyebrow">Posts futuros</dt>
          <dd>{pad(project.upcomingCount)}</dd>
        </div>
        <div>
          <dt className="eyebrow">Total de posts</dt>
          <dd>{pad(project.postCount)}</dd>
        </div>
      </dl>

      <div className="project-card__actions">
        <Link
          href={`/calendar?projectId=${encodeURIComponent(project.id)}`}
          className="btn btn--primary btn--small"
        >
          Abrir agenda
        </Link>
        {canManage ? (
          <button
            type="button"
            className="btn btn--small"
            onClick={() => onEdit(project)}
            aria-label={`Editar projeto ${project.name}`}
          >
            Editar
          </button>
        ) : null}
      </div>
    </li>
  );
}

export function ProjectsView() {
  const { permissions } = useSessionUser();
  const { projects, loading, error, reload } = useProjects({ includeArchived: true });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectListItem | null>(null);

  const activeCount = projects.filter((project) => project.isActive).length;

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (project: ProjectListItem) => {
    setEditing(project);
    setModalOpen(true);
  };

  return (
    <div>
      <header className="page-head">
        <div>
          <p className="eyebrow">Contas e campanhas</p>
          <h1 className="page-head__title">Projetos</h1>
          <p className="page-head__sub">
            Cada projeto é uma conta atendida. Todo post pertence a um projeto e
            aparece na agenda dele.
          </p>
        </div>
        <div className="page-head__actions">
          {!loading && projects.length > 0 ? (
            <span className="date-chip">
              {pad(activeCount)} {activeCount === 1 ? "ativo" : "ativos"}
            </span>
          ) : null}
          {permissions.canManageProjects ? (
            <button type="button" className="btn btn--primary" onClick={openCreate}>
              Novo projeto
            </button>
          ) : null}
        </div>
      </header>

      {error ? (
        <div className="calendar-alert" role="alert" style={{ marginBottom: "1rem" }}>
          <p>{error}</p>
          <button type="button" className="btn btn--ghost btn--small" onClick={() => void reload()}>
            Tentar novamente
          </button>
        </div>
      ) : null}

      {loading ? (
        <ProjectsSkeleton />
      ) : projects.length === 0 && !error ? (
        <div className="panel">
          <EmptyState
            title="Nenhum projeto ainda"
            description="Crie o primeiro projeto (uma empresa, marca pessoal ou campanha) para começar a agendar posts."
            action={
              <button type="button" className="btn btn--primary" onClick={openCreate}>
                Novo projeto
              </button>
            }
          />
        </div>
      ) : (
        <ul className="projects-grid">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={openEdit}
              canManage={permissions.canManageProjects}
            />
          ))}
        </ul>
      )}

      <ProjectModal
        open={modalOpen}
        project={editing}
        onClose={() => setModalOpen(false)}
        onSaved={() => void reload()}
      />
    </div>
  );
}

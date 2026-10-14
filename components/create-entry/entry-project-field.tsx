"use client";

import { ProjectAvatar } from "@/components/projects/project-avatar";
import { useProjects } from "@/hooks/use-projects";
import { PROJECT_TYPE_LABELS } from "@/lib/projects/project-meta";
import type { ProjectSummary } from "@/lib/types/project-api";
import Link from "next/link";
import { useEffect, useMemo } from "react";

type EntryProjectFieldProps = {
  formId: string;
  value: string;
  onChange: (projectId: string) => void;
  disabled?: boolean;
  enabled?: boolean;
  postProject?: ProjectSummary | null;
  errorHint?: string | null;
};

export function EntryProjectField({
  formId,
  value,
  onChange,
  disabled,
  enabled = true,
  postProject = null,
  errorHint,
}: EntryProjectFieldProps) {
  const {
    projects,
    loading: projectsLoading,
    error: projectsError,
  } = useProjects({ enabled });

  const projectOptions = useMemo(() => {
    const options = projects.map((project) => ({
      id: project.id,
      name: project.name,
      avatarUrl: project.avatarUrl,
      accentColor: project.accentColor,
      type: project.type,
      archived: false,
    }));

    if (postProject && !options.some((option) => option.id === postProject.id)) {
      options.push({
        id: postProject.id,
        name: postProject.name,
        avatarUrl: postProject.avatarUrl,
        accentColor: postProject.accentColor,
        type: postProject.type,
        archived: true,
      });
    }
    return options;
  }, [postProject, projects]);

  const selectedProject = projectOptions.find((option) => option.id === value);

  useEffect(() => {
    if (!enabled || projectsLoading) return;
    if (value && projects.some((p) => p.id === value)) return;
    const pick = projects.length === 1 ? projects[0] : null;
    if (pick) onChange(pick.id);
  }, [enabled, onChange, projects, projectsLoading, value]);

  return (
    <div className="field">
      <label className="field__label" htmlFor={`${formId}-project`}>
        Projeto
      </label>
      <div className="project-select">
        {selectedProject ? (
          <ProjectAvatar
            name={selectedProject.name}
            avatarUrl={selectedProject.avatarUrl}
            accentColor={selectedProject.accentColor}
            size={30}
          />
        ) : (
          <span className="project-select__placeholder" aria-hidden />
        )}
        <select
          id={`${formId}-project`}
          className="field__input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled || projectsLoading}
          aria-required="true"
          aria-invalid={errorHint === "project"}
        >
          <option value="" disabled>
            {projectsLoading ? "Carregando projetos…" : "Selecione um projeto…"}
          </option>
          {projectOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name} · {PROJECT_TYPE_LABELS[option.type]}
              {option.archived ? " (arquivado)" : ""}
            </option>
          ))}
        </select>
      </div>
      {projectsError ? <p className="field__hint">{projectsError}</p> : null}
      {!projectsLoading && !projectsError && projectOptions.length === 0 ? (
        <p className="field__hint">
          Nenhum projeto ativo. <Link href="/projects">Crie um projeto</Link> antes de
          agendar.
        </p>
      ) : null}
    </div>
  );
}

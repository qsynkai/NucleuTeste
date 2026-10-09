"use client";

import { ProjectAvatar } from "@/components/projects/project-avatar";
import type { ProjectListItem } from "@/lib/types/project-api";
import { useCallback, useEffect, useRef, useState } from "react";

type ProjectStripProps = {
  projects: ProjectListItem[];
  selectedId: string | null;
  onSelect: (projectId: string | null) => void;
  /** Posts por projeto (ex.: no período visível). Opcional. */
  counts?: Record<string, number>;
  totalCount?: number;
  loading?: boolean;
  ariaLabel?: string;
};

const ChevronIcon = ({ direction }: { direction: "left" | "right" }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d={direction === "left" ? "M9 2.5 4.5 7 9 11.5" : "M5 2.5 9.5 7 5 11.5"} />
  </svg>
);

const AllIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinejoin="round"
    aria-hidden
  >
    <rect x="2" y="2" width="5" height="5" rx="1.2" />
    <rect x="9" y="2" width="5" height="5" rx="1.2" />
    <rect x="2" y="9" width="5" height="5" rx="1.2" />
    <rect x="9" y="9" width="5" height="5" rx="1.2" />
  </svg>
);

export function ProjectStrip({
  projects,
  selectedId,
  onSelect,
  counts,
  totalCount,
  loading = false,
  ariaLabel = "Filtrar por projeto",
}: ProjectStripProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateOverflow = useCallback(() => {
    const element = scrollerRef.current;
    if (!element) return;
    setCanScrollLeft(element.scrollLeft > 1);
    setCanScrollRight(
      element.scrollLeft + element.clientWidth < element.scrollWidth - 1,
    );
  }, []);

  useEffect(() => {
    const element = scrollerRef.current;
    if (!element) return;

    updateOverflow();
    element.addEventListener("scroll", updateOverflow, { passive: true });
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(element);

    // Roda do mouse vertical vira rolagem horizontal, só enquanto houver
    // espaço para rolar naquela direção (senão a página continua rolando).
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      const max = element.scrollWidth - element.clientWidth;
      if (max <= 0) return;
      const atStart = element.scrollLeft <= 0 && event.deltaY < 0;
      const atEnd = element.scrollLeft >= max - 1 && event.deltaY > 0;
      if (atStart || atEnd) return;
      event.preventDefault();
      element.scrollLeft += event.deltaY;
    };
    element.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      element.removeEventListener("scroll", updateOverflow);
      element.removeEventListener("wheel", onWheel);
      observer.disconnect();
    };
  }, [updateOverflow]);

  useEffect(() => {
    updateOverflow();
  }, [projects, counts, totalCount, updateOverflow]);

  const scrollByPage = (direction: -1 | 1) => {
    const element = scrollerRef.current;
    if (!element) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollBy({
      left: direction * Math.max(200, element.clientWidth * 0.7),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  return (
    <div className="project-strip" role="group" aria-label={ariaLabel}>
      {canScrollLeft ? (
        <button
          type="button"
          className="project-strip__arrow project-strip__arrow--left"
          aria-label="Rolar projetos para a esquerda"
          onClick={() => scrollByPage(-1)}
        >
          <ChevronIcon direction="left" />
        </button>
      ) : null}

      <div className="project-strip__scroller" ref={scrollerRef}>
        <button
          type="button"
          className={`project-chip${selectedId === null ? " project-chip--active" : ""}`}
          aria-pressed={selectedId === null}
          onClick={() => onSelect(null)}
        >
          <span className="project-chip__all" aria-hidden>
            <AllIcon />
          </span>
          <span className="project-chip__name">Todos os projetos</span>
          {totalCount !== undefined ? (
            <span className="project-chip__count">{totalCount}</span>
          ) : null}
        </button>

        {projects.map((project) => {
          const active = selectedId === project.id;
          return (
            <button
              key={project.id}
              type="button"
              className={`project-chip${active ? " project-chip--active" : ""}${project.isActive ? "" : " project-chip--archived"}`}
              aria-pressed={active}
              onClick={() => onSelect(project.id)}
              title={project.isActive ? project.name : `${project.name} (arquivado)`}
            >
              <ProjectAvatar
                name={project.name}
                avatarUrl={project.avatarUrl}
                accentColor={project.accentColor}
                size={24}
              />
              <span className="project-chip__name">
                {project.name}
                {project.isActive ? null : (
                  <span className="project-chip__tag"> · arquivado</span>
                )}
              </span>
              {counts ? (
                <span className="project-chip__count">{counts[project.id] ?? 0}</span>
              ) : null}
            </button>
          );
        })}

        {loading ? (
          <span className="project-chip project-chip--loading" aria-hidden>
            <span className="skeleton" style={{ width: 24, height: 24, borderRadius: 7 }} />
            <span className="skeleton" style={{ width: 72, height: 12 }} />
          </span>
        ) : null}
      </div>

      {canScrollRight ? (
        <button
          type="button"
          className="project-strip__arrow project-strip__arrow--right"
          aria-label="Rolar projetos para a direita"
          onClick={() => scrollByPage(1)}
        >
          <ChevronIcon direction="right" />
        </button>
      ) : null}
    </div>
  );
}

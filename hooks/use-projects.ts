"use client";

import { readApiErrorMessage } from "@/lib/api/read-api-error";
import { fetchWithRetry } from "@/lib/api/fetch-with-retry";
import type { ProjectListItem, ProjectsListResponse } from "@/lib/types/project-api";
import { useCallback, useEffect, useState } from "react";

type UseProjectsResult = {
  projects: ProjectListItem[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

export function useProjects(
  options: { includeArchived?: boolean; enabled?: boolean } = {},
): UseProjectsResult {
  const { includeArchived = false, enabled = true } = options;
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchWithRetry(
        `/api/projects${includeArchived ? "?includeArchived=1" : ""}`,
        { cache: "no-store", credentials: "same-origin" },
      );
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok) {
        throw new Error(
          await readApiErrorMessage(response, "Falha ao carregar projetos."),
        );
      }
      const data = (await response.json()) as ProjectsListResponse;
      setProjects(data.projects);
      setError(null);
    } catch (loadError: unknown) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Erro ao carregar projetos.",
      );
    } finally {
      setLoading(false);
    }
  }, [includeArchived]);

  useEffect(() => {
    if (!enabled) return;
    void reload();
  }, [enabled, reload]);

  return { projects, loading, error, reload };
}

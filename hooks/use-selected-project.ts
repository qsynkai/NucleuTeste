"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * A query string (`?projectId=`) é a fonte de verdade do projeto selecionado.
 * Deve ser usado dentro de um <Suspense> (requisito do useSearchParams).
 */
export function useSelectedProject(): {
  projectId: string | null;
  select: (projectId: string | null) => void;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const projectId = searchParams.get("projectId")?.trim() || null;
  const query = searchParams.toString();

  const select = useCallback(
    (nextId: string | null) => {
      const params = new URLSearchParams(query);
      if (nextId) params.set("projectId", nextId);
      else params.delete("projectId");

      const next = params.toString();
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    },
    [pathname, query, router],
  );

  return { projectId, select };
}

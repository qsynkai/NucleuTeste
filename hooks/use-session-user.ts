"use client";

import type { SessionMeResponse } from "@/lib/types/user-api";
import { useEffect, useState } from "react";

const DEFAULT_PERMISSIONS: SessionMeResponse["permissions"] = {
  readOnly: true,
  canCreate: false,
  canDelete: false,
  canManageUsers: false,
  canAccessTechArea: false,
  canManageProjects: false,
};

export function useSessionUser() {
  const [data, setData] = useState<SessionMeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Sessão indisponível.");
        return (await response.json()) as SessionMeResponse;
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    user: data?.user ?? null,
    permissions: data?.permissions ?? DEFAULT_PERMISSIONS,
    loading,
  };
}

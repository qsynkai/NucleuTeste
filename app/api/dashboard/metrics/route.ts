import { requireUser } from "@/lib/auth/require-user";
import { queryDashboardMetrics } from "@/lib/dashboard/query-metrics";
import { databaseUnavailableResponse } from "@/lib/prisma/database-unavailable-response";
import { isDatabaseUnavailable } from "@/lib/prisma/is-database-unavailable";
import { requireOwnedProject } from "@/lib/projects/access";
import type { DashboardMetricsResponse } from "@/lib/types/dashboard-metrics";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
): Promise<NextResponse<DashboardMetricsResponse | { error: string }>> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const projectId =
    new URL(request.url).searchParams.get("projectId")?.trim() || null;

  try {
    if (projectId) {
      const access = await requireOwnedProject(auth.user.id, projectId, {
        allowArchived: true,
      });
      if (!access.ok) return access.response;
    }

    const metrics = await queryDashboardMetrics(auth.user.id, projectId);
    return NextResponse.json(metrics);
  } catch (error: unknown) {
    console.error("[GET /api/dashboard/metrics]", error);

    if (isDatabaseUnavailable(error)) {
      return databaseUnavailableResponse("GET /api/dashboard/metrics");
    }

    return NextResponse.json(
      { error: "Não foi possível carregar as métricas do painel." },
      { status: 500 },
    );
  }
}

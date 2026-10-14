import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export type TaskCatalogItem = {
  id: string;
  name: string;
  basePrice: string;
};

export type TaskCatalogResponse = {
  items: TaskCatalogItem[];
};

export async function GET(): Promise<
  NextResponse<TaskCatalogResponse | { error: string }>
> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    const rows = await prisma.taskCatalog.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        basePrice: row.basePrice.toString(),
      })),
    });
  } catch (error: unknown) {
    console.error("[GET /api/task-catalog]", error);
    return NextResponse.json(
      { error: "Não foi possível carregar o catálogo." },
      { status: 500 },
    );
  }
}

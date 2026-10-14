import {
  canAccessTechArea,
  canCreateEvent,
} from "@/lib/auth/permissions";
import { forbidden, requireUser } from "@/lib/auth/require-user";
import { eventInclude } from "@/lib/events/event-include";
import { serializeEvent } from "@/lib/events/serialize-event";
import { isTechnicalProductionTask } from "@/lib/events/tech-filter";
import { prisma } from "@/lib/prisma";
import { requireOwnedProject } from "@/lib/projects/access";
import type { EventListItem, EventsListResponse } from "@/lib/types/event-api";
import { parseCustomerServiceCreateBody } from "@/lib/validators/customer-service";
import { parseEventCreateBody } from "@/lib/validators/event-create";
import type { EntryType, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

const TECH_CATALOG_NAMES = [
  "Capas",
  "Cortes",
  "Live",
  "Captação de som",
  "Captação de imagem",
];

function parseEntryType(value: unknown): EntryType {
  if (
    value === "SOCIAL_POST" ||
    value === "PRODUCTION_EVENT" ||
    value === "CUSTOMER_SERVICE" ||
    value === "SIMPLE_REMINDER"
  ) {
    return value;
  }
  return "SOCIAL_POST";
}

export async function GET(
  request: Request,
): Promise<NextResponse<EventsListResponse | { error: string }>> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const scope = new URL(request.url).searchParams.get("scope");

  try {
    let where: Prisma.PostWhereInput;

    if (scope === "tech") {
      if (!canAccessTechArea(auth.user)) return forbidden();

      const technicalTaskFilter: Prisma.EventTaskWhereInput = {
        OR: [
          { taskCatalog: { name: { in: TECH_CATALOG_NAMES } } },
          { assignedToUserId: auth.user.id },
          { customName: { not: null } },
        ],
      };

      where =
        auth.user.role === "ADMIN"
          ? {
              OR: [
                { entryType: { in: ["PRODUCTION_EVENT", "CUSTOMER_SERVICE"] } },
                { tasks: { some: technicalTaskFilter } },
              ],
            }
          : {
              tasks: { some: technicalTaskFilter },
            };
    } else {
      where = { userId: auth.user.id };
    }

    const rows = await prisma.post.findMany({
      where,
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
      include: eventInclude,
    });

    const events: EventListItem[] = rows
      .map(serializeEvent)
      .filter((event) => {
        if (scope !== "tech") return true;
        if (
          event.entryType === "PRODUCTION_EVENT" ||
          event.entryType === "CUSTOMER_SERVICE"
        ) {
          return true;
        }
        return event.tasks.some(
          (task) =>
            (task.catalogName && isTechnicalProductionTask(task.catalogName)) ||
            (task.customName && isTechnicalProductionTask(task.customName)) ||
            task.assignedToUserId === auth.user.id,
        );
      });

    return NextResponse.json({ events });
  } catch (error: unknown) {
    console.error("[GET /api/events]", error);
    return NextResponse.json(
      { error: "Não foi possível carregar os eventos." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
): Promise<NextResponse<EventListItem | { error: string }>> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  if (!canCreateEvent(auth.user)) return forbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const entryType = parseEntryType(record.entryType);

  let payload;
  try {
    payload =
      entryType === "CUSTOMER_SERVICE"
        ? parseCustomerServiceCreateBody(body)
        : parseEventCreateBody(body, entryType);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Dados inválidos.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const access = await requireOwnedProject(auth.user.id, payload.projectId, {
      allowArchived: false,
    });
    if (!access.ok) return access.response;

    const created = await prisma.$transaction(async (tx) => {
      const post = await tx.post.create({
        data: {
          title: payload.title,
          content: payload.content || payload.meetingNotes || "—",
          scheduledAt: payload.scheduledAt,
          status: "SCHEDULED",
          entryType,
          currentStatus: "OPEN",
          mediaUrls: payload.mediaUrls,
          userId: auth.user.id,
          projectId: access.project.id,
          attendanceType: payload.attendanceType ?? undefined,
          clientName: payload.clientName ?? undefined,
          clientPhone: payload.clientPhone ?? undefined,
          durationMinutes: payload.durationMinutes ?? undefined,
          serviceChannel: payload.serviceChannel ?? undefined,
          meetingUrl: payload.meetingUrl ?? undefined,
          meetingNotes: payload.meetingNotes ?? undefined,
          internalResponsible: payload.internalResponsible ?? undefined,
          assignedProfessional: payload.assignedProfessional ?? undefined,
          appointmentStatus:
            entryType === "CUSTOMER_SERVICE"
              ? (payload.appointmentStatus ?? "SCHEDULED")
              : undefined,
          channels: payload.channels.length
            ? {
                create: payload.channels.map((channel) => ({ channel })),
              }
            : undefined,
          externalLinks: payload.externalLinks?.length
            ? payload.externalLinks
            : undefined,
          tasks: payload.tasks?.length
            ? {
                create: payload.tasks.map((task) => ({
                  taskCatalogId: task.taskCatalogId ?? null,
                  customName: task.customName ?? null,
                  price: task.price,
                })),
              }
            : undefined,
        },
        include: eventInclude,
      });

      await tx.eventStatusHistory.create({
        data: {
          eventId: post.id,
          status: "OPEN",
          userId: auth.user.id,
          notes: "Evento criado.",
        },
      });

      return post;
    });

    return NextResponse.json(serializeEvent(created), { status: 201 });
  } catch (error: unknown) {
    console.error("[POST /api/events]", error);
    return NextResponse.json(
      { error: "Não foi possível criar o evento." },
      { status: 500 },
    );
  }
}

import {

  canCompleteAssignedTasks,

  canDeleteEvent,

  canEditProductionAssets,

  canUpdateEventStatus,

  canUploadTechLinks,

} from "@/lib/auth/permissions";

import { forbidden, requireUser } from "@/lib/auth/require-user";

import { resolveEventAccess } from "@/lib/events/event-access";
import { eventInclude } from "@/lib/events/event-include";
import { syncEventParticipants } from "@/lib/events/sync-participants";
import { serializeEvent } from "@/lib/events/serialize-event";
import { parseEventParticipantsInput } from "@/lib/validators/event-participants";

import { prisma } from "@/lib/prisma";

import type { EventListItem, ExternalLinkItem } from "@/lib/types/event-api";

import {
  buildCustomerServicePostUpdate,
  mapServiceTaskPatch,
} from "@/lib/events/apply-customer-service-patch";
import { parseCustomerServicePatchBody } from "@/lib/validators/customer-service";
import { parseProductionEventUpdate } from "@/lib/validators/event-update";

import { Prisma, type EventStatus } from "@prisma/client";

import { NextResponse } from "next/server";



type RouteContext = { params: Promise<{ id: string }> };



function parseEventStatus(value: unknown): EventStatus | null {

  if (

    value === "OPEN" ||

    value === "IN_PROGRESS" ||

    value === "WAITING_COLLABORATORS" ||

    value === "COMPLETED" ||

    value === "CANCELLED"

  ) {

    return value;

  }

  return null;

}



function parseExternalLinks(value: unknown): ExternalLinkItem[] | null {

  if (!Array.isArray(value)) return null;

  const links: ExternalLinkItem[] = [];

  for (const item of value) {

    if (!item || typeof item !== "object" || Array.isArray(item)) return null;

    const record = item as Record<string, unknown>;

    if (

      typeof record.title !== "string" ||

      typeof record.url !== "string" ||

      typeof record.type !== "string"

    ) {

      return null;

    }

    links.push({

      title: record.title.trim(),

      url: record.url.trim(),

      type: record.type.trim(),

    });

  }

  return links;

}



function requestOrigin(request: Request): string | null {
  try {
    return new URL(request.url).origin;
  } catch {
    return null;
  }
}

export async function GET(

  request: Request,

  context: RouteContext,

): Promise<NextResponse<EventListItem | { error: string }>> {

  const auth = await requireUser();

  if (!auth.ok) return auth.response;



  const { id } = await context.params;

  if (!id.trim()) {

    return NextResponse.json({ error: "ID inválido." }, { status: 400 });

  }



  const existing = await prisma.post.findFirst({

    where: { id },

    include: eventInclude,

  });

  if (!existing) {

    return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });

  }



  const access = resolveEventAccess(auth.user, existing);

  if (!access.canView) {

    return forbidden();

  }



  return NextResponse.json(serializeEvent(existing, requestOrigin(request)));

}



export async function PATCH(

  request: Request,

  context: RouteContext,

): Promise<NextResponse<EventListItem | { error: string }>> {
  const origin = requestOrigin(request);

  const auth = await requireUser();

  if (!auth.ok) return auth.response;



  const { id } = await context.params;

  if (!id.trim()) {

    return NextResponse.json({ error: "ID inválido." }, { status: 400 });

  }



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



  try {

    const existing = await prisma.post.findFirst({

      where: { id },

      include: eventInclude,

    });

    if (!existing) {

      return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });

    }



    const access = resolveEventAccess(auth.user, existing);

    if (!access.canView) {

      return forbidden();

    }



    if ("participants" in record) {

      if (!access.canManageParticipants) {

        return forbidden();

      }

      try {

        const participants = parseEventParticipantsInput(

          record.participants,

          existing.userId,

        );

        await prisma.$transaction(async (tx) => {

          await syncEventParticipants(
            tx as import("@prisma/client").Prisma.TransactionClient,
            id,
            participants,
          );

        });

      } catch (error: unknown) {

        const message =

          error instanceof Error ? error.message : "Participantes inválidos.";

        if (message === "INVALID_PARTICIPANT") {

          return NextResponse.json(

            { error: "Um ou mais participantes são inválidos ou inativos." },

            { status: 400 },

          );

        }

        if (error instanceof TypeError) {

          return NextResponse.json({ error: message }, { status: 400 });

        }

        throw error;

      }

      const onlyParticipants =

        Object.keys(record).length === 1 ||

        (Object.keys(record).length === 2 && "statusNotes" in record);

      if (onlyParticipants) {

        const refreshed = await prisma.post.findFirst({

          where: { id },

          include: eventInclude,

        });

        if (!refreshed) {

          return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });

        }

        return NextResponse.json(

          serializeEvent(refreshed, requestOrigin(request)),

        );

      }

    }



    const isProduction = existing.entryType === "PRODUCTION_EVENT";
    const isCustomerService = existing.entryType === "CUSTOMER_SERVICE";

    const canEditContent = isProduction && access.canEditContent;
    const canEditCustomer = isCustomerService && access.canEditContent;

    if (

      isCustomerService &&

      !canEditCustomer &&

      access.canAddInfo &&

      "meetingNotes" in record &&

      typeof record.meetingNotes === "string"

    ) {

      const updated = await prisma.post.update({

        where: { id },

        data: { meetingNotes: record.meetingNotes.trim() },

        include: eventInclude,

      });

      return NextResponse.json(serializeEvent(updated, requestOrigin(request)));

    }

    if (isCustomerService && canEditCustomer) {
      let patch;
      try {
        patch = parseCustomerServicePatchBody(body);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Dados inválidos.";
        return NextResponse.json({ error: message }, { status: 400 });
      }

      try {
        const updated = await prisma.$transaction(async (tx) => {
          const data = buildCustomerServicePostUpdate(patch);

          if (patch.serviceTask) {
            const mapped = mapServiceTaskPatch(patch.serviceTask);
            await tx.eventTask.deleteMany({ where: { eventId: id } });
            await tx.eventTask.create({
              data: {
                eventId: id,
                taskCatalogId: mapped.taskCatalogId,
                customName: mapped.customName,
                price: mapped.price,
              },
            });
          }

          return tx.post.update({
            where: { id },
            data,
            include: eventInclude,
          });
        });

        return NextResponse.json(serializeEvent(updated, origin));
      } catch (error: unknown) {
        if (error instanceof Error && error.message.startsWith("INVALID_")) {
          return NextResponse.json({ error: "Serviço ou preço inválido." }, { status: 400 });
        }
        throw error;
      }
    }

    if (isProduction && canEditContent) {

      let patch;

      try {

        patch = parseProductionEventUpdate(body);

      } catch (error: unknown) {

        const message = error instanceof Error ? error.message : "Dados inválidos.";

        return NextResponse.json({ error: message }, { status: 400 });

      }



      const updated = await prisma.$transaction(async (tx) => {

        const data: Prisma.PostUpdateInput = {};



        if (patch.title !== undefined) data.title = patch.title;

        if (patch.content !== undefined) data.content = patch.content;

        if (patch.scheduledAt !== undefined) data.scheduledAt = patch.scheduledAt;

        if (patch.durationMinutes !== undefined) {

          data.durationMinutes = patch.durationMinutes;

        }

        if (patch.projectId !== undefined) {
          data.project = { connect: { id: patch.projectId } };
        }



        if (patch.mediaUrls !== undefined) data.mediaUrls = patch.mediaUrls;

        if (patch.externalLinks !== undefined) data.externalLinks = patch.externalLinks;



        if (patch.currentStatus !== undefined) {

          if (

            !canUpdateEventStatus(

              auth.user,

              patch.currentStatus,

              existing.currentStatus,

            )

          ) {

            throw new Error("FORBIDDEN_STATUS");

          }

          data.currentStatus = patch.currentStatus;

          await tx.eventStatusHistory.create({

            data: {

              eventId: id,

              status: patch.currentStatus,

              userId: auth.user.id,

              notes: patch.statusNotes ?? null,

            },

          });

        }



        if (patch.tasks !== undefined) {

          const incomingIds = patch.tasks

            .map((task) => task.id)

            .filter((taskId): taskId is string => Boolean(taskId));

          const existingIds = existing.tasks.map((task) => task.id);

          const removeIds = existingIds.filter(

            (taskId) => !incomingIds.includes(taskId),

          );



          if (removeIds.length > 0) {

            await tx.eventTask.deleteMany({

              where: { eventId: id, id: { in: removeIds } },

            });

          }



          for (const task of patch.tasks) {

            const price = new Prisma.Decimal(task.price);

            if (task.id) {

              await tx.eventTask.updateMany({

                where: { id: task.id, eventId: id },

                data: {

                  taskCatalogId: task.taskCatalogId ?? null,

                  customName: task.customName ?? null,

                  price,

                },

              });

            } else {

              await tx.eventTask.create({

                data: {

                  eventId: id,

                  taskCatalogId: task.taskCatalogId ?? null,

                  customName: task.customName ?? null,

                  price,

                },

              });

            }

          }

        }



        return tx.post.update({

          where: { id },

          data,

          include: eventInclude,

        });

      });



      return NextResponse.json(serializeEvent(updated, origin));

    }



    const data: Prisma.PostUpdateInput = {};

    let statusHistory: EventStatus | null = null;



    if ("currentStatus" in record) {

      const nextStatus = parseEventStatus(record.currentStatus);

      if (!nextStatus) {

        return NextResponse.json({ error: "Status inválido." }, { status: 400 });

      }

      if (

        !access.canUpdateSteps ||

        !canUpdateEventStatus(auth.user, nextStatus, existing.currentStatus)

      ) {

        return forbidden(

          "Seu perfil não pode alterar o status para este valor.",

        );

      }

      data.currentStatus = nextStatus;

      statusHistory = nextStatus;

    }



    if ("externalLinks" in record) {

      const mayEditLinks =

        canUploadTechLinks(auth.user) || canEditProductionAssets(auth.user);

      if (!mayEditLinks) return forbidden();

      const links = parseExternalLinks(record.externalLinks);

      if (!links) {

        return NextResponse.json({ error: "Links externos inválidos." }, { status: 400 });

      }

      data.externalLinks = links;

    }



    if ("taskCompletions" in record && Array.isArray(record.taskCompletions)) {

      if (!access.canUpdateSteps && !canCompleteAssignedTasks(auth.user)) {

        return forbidden();

      }

      const taskIds = record.taskCompletions.filter(

        (item): item is string => typeof item === "string",

      );

      if (taskIds.length > 0) {

        await prisma.eventTask.updateMany({

          where: {

            id: { in: taskIds },

            eventId: id,

            ...(auth.user.role === "TECHNICIAN"

              ? { assignedToUserId: auth.user.id }

              : {}),

          },

          data: { completed: true },

        });

      }

    }



    if (Object.keys(data).length === 0 && !("taskCompletions" in record)) {

      return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });

    }



    const updated = await prisma.$transaction(async (tx) => {

      if (statusHistory) {

        await tx.eventStatusHistory.create({

          data: {

            eventId: id,

            status: statusHistory,

            userId: auth.user.id,

            notes:

              typeof record.statusNotes === "string"

                ? record.statusNotes.trim()

                : null,

          },

        });

      }



      return tx.post.update({

        where: { id },

        data,

        include: eventInclude,

      });

    });



    return NextResponse.json(serializeEvent(updated, origin));

  } catch (error: unknown) {

    if (error instanceof Error && error.message === "FORBIDDEN_STATUS") {

      return forbidden("Seu perfil não pode alterar o status para este valor.");

    }

    console.error("[PATCH /api/events/[id]]", error);

    return NextResponse.json(

      { error: "Não foi possível atualizar o evento." },

      { status: 500 },

    );

  }

}



export async function DELETE(

  _request: Request,

  context: RouteContext,

): Promise<NextResponse<{ success: true } | { error: string }>> {

  const auth = await requireUser();

  if (!auth.ok) return auth.response;

  if (!canDeleteEvent(auth.user)) return forbidden();



  const { id } = await context.params;

  if (!id.trim()) {

    return NextResponse.json({ error: "ID inválido." }, { status: 400 });

  }



  const where =

    auth.user.role === "ADMIN"

      ? { id }

      : { id, userId: auth.user.id };



  const deleted = await prisma.post.deleteMany({ where });

  if (deleted.count === 0) {

    return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });

  }



  return NextResponse.json({ success: true });

}



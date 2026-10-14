import { centsToMoneyString, parseMoneyToCents } from "@/lib/money/brl";
import { digitsOnly } from "@/lib/phone/mask-br";
import type { CustomerServicePatchInput } from "@/lib/validators/customer-service";
import { parseScheduledAt } from "@/lib/validators/post-api";
import { Prisma } from "@prisma/client";

export function buildCustomerServicePostUpdate(
  patch: CustomerServicePatchInput,
): Prisma.PostUpdateInput {
  const data: Prisma.PostUpdateInput = {};

  if (patch.title !== undefined) data.title = patch.title;
  if (patch.agenda !== undefined) data.content = patch.agenda;
  if (patch.scheduledAt !== undefined) {
    data.scheduledAt = parseScheduledAt(patch.scheduledAt);
  }
  if (patch.durationMinutes !== undefined) {
    data.durationMinutes = patch.durationMinutes;
  }
  if (patch.projectId !== undefined) {
    data.project = { connect: { id: patch.projectId } };
  }
  if (patch.attendanceType !== undefined) {
    data.attendanceType = patch.attendanceType;
  }
  if (patch.serviceChannel !== undefined) {
    data.serviceChannel = patch.serviceChannel;
  }
  if (patch.meetingUrl !== undefined) {
    data.meetingUrl = patch.meetingUrl;
  }
  if (patch.meetingNotes !== undefined) {
    data.meetingNotes = patch.meetingNotes;
  }
  if (patch.internalResponsible !== undefined) {
    data.internalResponsible = patch.internalResponsible;
  }
  if (patch.clientName !== undefined) {
    data.clientName = patch.clientName;
  }
  if (patch.clientPhone !== undefined) {
    data.clientPhone = digitsOnly(patch.clientPhone);
  }
  if (patch.assignedProfessional !== undefined) {
    data.assignedProfessional = patch.assignedProfessional;
  }
  if (patch.appointmentStatus !== undefined) {
    data.appointmentStatus = patch.appointmentStatus;
  }

  return data;
}

export function mapServiceTaskPatch(
  task: NonNullable<CustomerServicePatchInput["serviceTask"]>,
): {
  taskCatalogId: string | null;
  customName: string | null;
  price: Prisma.Decimal;
} {
  const cents = parseMoneyToCents(task.price);
  if (cents === null) {
    throw new Error("INVALID_SERVICE_PRICE");
  }
  const customName = task.customName?.trim() || null;
  const taskCatalogId = task.taskCatalogId?.trim() || null;
  if (!customName && !taskCatalogId) {
    throw new Error("INVALID_SERVICE_TASK");
  }
  return {
    taskCatalogId,
    customName,
    price: new Prisma.Decimal(centsToMoneyString(cents)),
  };
}

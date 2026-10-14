import { centsToMoneyString, parseMoneyToCents } from "@/lib/money/brl";
import { digitsOnly } from "@/lib/phone/mask-br";
import type { ParsedEventCreate } from "@/lib/validators/event-create";
import { parseScheduledAt } from "@/lib/validators/post-api";
import { z } from "zod";

const serviceChannelSchema = z.enum([
  "GOOGLE_MEET",
  "WHATSAPP",
  "PHONE_CALL",
  "IN_PERSON",
  "OTHER",
]);

const appointmentStatusSchema = z.enum([
  "SCHEDULED",
  "CONFIRMED",
  "IN_SERVICE",
  "COMPLETED",
  "NO_SHOW",
  "CANCELLED",
]);

const durationSchema = z.union([
  z.literal(15),
  z.literal(30),
  z.literal(45),
  z.literal(60),
]);

const serviceTaskSchema = z.object({
  taskCatalogId: z.string().trim().optional(),
  customName: z.string().trim().optional(),
  price: z.union([z.string(), z.number()]),
});

const baseFields = {
  entryType: z.literal("CUSTOMER_SERVICE"),
  projectId: z.string().trim().min(1, "Selecione o projeto."),
  scheduledAt: z.string().min(1, "Informe data e hora."),
  title: z.string().trim().min(1, "Informe o título."),
};

const corporateMeetingSchema = z
  .object({
    ...baseFields,
    attendanceType: z.literal("CORPORATE_MEETING"),
    agenda: z.string().trim().min(1, "Informe a pauta da reunião."),
    serviceChannel: serviceChannelSchema,
    meetingUrl: z.string().trim().optional().nullable(),
    meetingNotes: z.string().trim().optional(),
    internalResponsible: z.string().trim().min(1, "Informe o responsável interno."),
    durationMinutes: z.number().int().positive().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.serviceChannel === "GOOGLE_MEET") {
      if (!data.meetingUrl?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Informe o link da reunião (Google Meet).",
          path: ["meetingUrl"],
        });
      } else {
        try {
          const url = new URL(data.meetingUrl.trim());
          if (!["http:", "https:"].includes(url.protocol)) {
            ctx.addIssue({
              code: "custom",
              message: "Link da reunião inválido.",
              path: ["meetingUrl"],
            });
          }
        } catch {
          ctx.addIssue({
            code: "custom",
            message: "Link da reunião inválido.",
            path: ["meetingUrl"],
          });
        }
      }
    }
  });

const serviceAppointmentSchema = z.object({
  ...baseFields,
  attendanceType: z.literal("SERVICE_APPOINTMENT"),
  clientName: z.string().trim().min(1, "Informe o nome do cliente."),
  clientPhone: z
    .string()
    .trim()
    .min(1, "Informe o WhatsApp.")
    .refine((value) => digitsOnly(value).length >= 10, "Telefone incompleto."),
  durationMinutes: durationSchema,
  assignedProfessional: z
    .string()
    .trim()
    .min(1, "Informe o profissional escalado."),
  serviceTask: serviceTaskSchema,
  appointmentStatus: appointmentStatusSchema.optional(),
  serviceChannel: serviceChannelSchema.optional(),
});

export const customerServiceCreateSchema = z.discriminatedUnion("attendanceType", [
  corporateMeetingSchema,
  serviceAppointmentSchema,
]);

export type CustomerServiceCreateInput = z.infer<typeof customerServiceCreateSchema>;

function zodErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Dados inválidos.";
}

function mapServiceTask(task: z.infer<typeof serviceTaskSchema>) {
  const cents = parseMoneyToCents(task.price);
  if (cents === null) {
    throw new TypeError("Valor do serviço inválido.");
  }
  const customName = task.customName?.trim();
  const taskCatalogId = task.taskCatalogId?.trim();
  if (!customName && !taskCatalogId) {
    throw new TypeError("Selecione ou nomeie o serviço.");
  }
  return {
    taskCatalogId: taskCatalogId || undefined,
    customName: customName || undefined,
    price: centsToMoneyString(cents),
  };
}

export function parseCustomerServiceCreateBody(body: unknown): ParsedEventCreate {
  const parsed = customerServiceCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new TypeError(zodErrorMessage(parsed.error));
  }

  const data = parsed.data;
  const scheduledAt = parseScheduledAt(data.scheduledAt);

  if (data.attendanceType === "CORPORATE_MEETING") {
    return {
      projectId: data.projectId,
      title: data.title,
      content: data.agenda,
      scheduledAt,
      mediaUrls: [],
      channels: [],
      attendanceType: "CORPORATE_MEETING",
      serviceChannel: data.serviceChannel,
      meetingUrl: data.meetingUrl?.trim() || null,
      meetingNotes: data.meetingNotes?.trim() || null,
      internalResponsible: data.internalResponsible,
      durationMinutes: data.durationMinutes ?? 60,
      clientName: null,
      clientPhone: null,
    };
  }

  const serviceTask = mapServiceTask(data.serviceTask);

  return {
    projectId: data.projectId,
    title: data.title,
    content: `Atendimento: ${data.clientName}`,
    scheduledAt,
    mediaUrls: [],
    channels: [],
    attendanceType: "SERVICE_APPOINTMENT",
    clientName: data.clientName,
    clientPhone: digitsOnly(data.clientPhone),
    durationMinutes: data.durationMinutes,
    serviceChannel: data.serviceChannel ?? "IN_PERSON",
    meetingUrl: null,
    meetingNotes: null,
    assignedProfessional: data.assignedProfessional,
    appointmentStatus: data.appointmentStatus ?? "SCHEDULED",
    tasks: [serviceTask],
  };
}

export const customerServicePatchSchema = z
  .object({
    projectId: z.string().trim().min(1).optional(),
    title: z.string().trim().min(1).optional(),
    scheduledAt: z.string().optional(),
    durationMinutes: durationSchema.or(z.number().int().positive()).optional(),
    attendanceType: z.enum(["CORPORATE_MEETING", "SERVICE_APPOINTMENT"]).optional(),
    agenda: z.string().trim().optional(),
    serviceChannel: serviceChannelSchema.optional(),
    meetingUrl: z.string().trim().nullable().optional(),
    meetingNotes: z.string().trim().nullable().optional(),
    internalResponsible: z.string().trim().optional(),
    clientName: z.string().trim().optional(),
    clientPhone: z.string().trim().optional(),
    assignedProfessional: z.string().trim().optional(),
    serviceTask: serviceTaskSchema.optional(),
    appointmentStatus: appointmentStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Nada para atualizar.",
  });

export type CustomerServicePatchInput = z.infer<typeof customerServicePatchSchema>;

export function parseCustomerServicePatchBody(body: unknown): CustomerServicePatchInput {
  const parsed = customerServicePatchSchema.safeParse(body);
  if (!parsed.success) {
    throw new TypeError(zodErrorMessage(parsed.error));
  }
  return parsed.data;
}

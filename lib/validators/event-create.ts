import type {
  AttendanceType,
  EntryType,
  ServiceChannel,
  SocialChannel,
} from "@prisma/client";
import { centsToMoneyString, parseMoneyToCents } from "@/lib/money/brl";
import type { ExternalLinkItem } from "@/lib/types/event-api";
import { parseSocialChannels } from "@/lib/validators/social";
import {
  isNonEmptyString,
  parseScheduledAt,
} from "@/lib/validators/post-api";

export type EventTaskCreateInput = {
  taskCatalogId?: string;
  customName?: string;
  price: string;
};

export type ParsedEventCreate = {
  projectId: string;
  title: string;
  content: string;
  scheduledAt: Date;
  mediaUrls: string[];
  channels: SocialChannel[];
  attendanceType?: AttendanceType;
  clientName?: string | null;
  clientPhone?: string | null;
  durationMinutes?: number | null;
  serviceChannel?: ServiceChannel | null;
  meetingUrl?: string | null;
  meetingNotes?: string | null;
  internalResponsible?: string | null;
  assignedProfessional?: string | null;
  appointmentStatus?: import("@prisma/client").AppointmentStatus;
  tasks?: EventTaskCreateInput[];
  externalLinks?: ExternalLinkItem[];
};

function parseOptionalString(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (!isNonEmptyString(value)) return null;
  return value.trim();
}

function parseAttendanceType(value: unknown): AttendanceType | null {
  if (value === "CORPORATE_MEETING" || value === "SERVICE_APPOINTMENT") {
    return value;
  }
  return null;
}

function parseServiceChannel(value: unknown): ServiceChannel | null {
  const allowed: ServiceChannel[] = [
    "GOOGLE_MEET",
    "WHATSAPP",
    "PHONE_CALL",
    "IN_PERSON",
    "OTHER",
  ];
  if (typeof value === "string" && allowed.includes(value as ServiceChannel)) {
    return value as ServiceChannel;
  }
  return null;
}

function parseTasks(value: unknown): EventTaskCreateInput[] {
  if (!Array.isArray(value)) return [];
  const tasks: EventTaskCreateInput[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const cents = parseMoneyToCents(
      typeof record.price === "number" || typeof record.price === "string"
        ? record.price
        : "",
    );
    if (cents === null) continue;

    const taskCatalogId = parseOptionalString(record.taskCatalogId);
    const customName = parseOptionalString(record.customName);
    if (!taskCatalogId && !customName) continue;

    tasks.push({
      taskCatalogId: taskCatalogId ?? undefined,
      customName: customName ?? undefined,
      price: centsToMoneyString(cents),
    });
  }
  return tasks;
}

export function parseEventCreateBody(
  body: unknown,
  entryType: EntryType,
): ParsedEventCreate {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new TypeError("Corpo da requisição inválido.");
  }

  const record = body as Record<string, unknown>;

  if (!isNonEmptyString(record.projectId)) {
    throw new TypeError("Selecione o projeto.");
  }

  if (!isNonEmptyString(record.title)) {
    throw new TypeError("Informe o título.");
  }

  const scheduledAt = parseScheduledAt(record.scheduledAt);
  const content =
    isNonEmptyString(record.content)
      ? record.content.trim()
      : entryType === "SIMPLE_REMINDER" || entryType === "CUSTOMER_SERVICE"
        ? ""
        : (() => {
            throw new TypeError("Informe a descrição ou observações.");
          })();

  let channels: SocialChannel[] = [];
  if (entryType === "SOCIAL_POST") {
    if (!Array.isArray(record.channels) || record.channels.length === 0) {
      throw new TypeError("Selecione ao menos uma rede de destino.");
    }
    channels = parseSocialChannels(
      record.channels.filter((item): item is string => typeof item === "string"),
    );
  }

  const mediaUrls = Array.isArray(record.mediaUrls)
    ? record.mediaUrls
        .filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        )
        .map((item) => item.trim())
    : [];

  const base: ParsedEventCreate = {
    projectId: record.projectId.trim(),
    title: record.title.trim(),
    content,
    scheduledAt,
    mediaUrls,
    channels,
  };

  if (entryType === "PRODUCTION_EVENT") {
    const tasks = parseTasks(record.tasks);
    if (tasks.length === 0) {
      throw new TypeError("Adicione ao menos uma tarefa de produção.");
    }

    let durationMinutes: number | null = null;
    if (record.durationMinutes !== undefined && record.durationMinutes !== null) {
      const parsed =
        typeof record.durationMinutes === "number"
          ? record.durationMinutes
          : Number.parseInt(String(record.durationMinutes), 10);
      if (Number.isFinite(parsed) && parsed > 0) durationMinutes = parsed;
    }

    let externalLinks: ExternalLinkItem[] | undefined;
    if (Array.isArray(record.externalLinks)) {
      externalLinks = [];
      for (const item of record.externalLinks) {
        if (!item || typeof item !== "object" || Array.isArray(item)) continue;
        const link = item as Record<string, unknown>;
        if (typeof link.title !== "string" || typeof link.url !== "string") continue;
        const title = link.title.trim();
        const url = link.url.trim();
        if (!title || !url) continue;
        externalLinks.push({
          title,
          url,
          type:
            typeof link.type === "string" && link.type.trim()
              ? link.type.trim()
              : "reference",
        });
      }
    }

    return { ...base, tasks, durationMinutes, externalLinks };
  }

  if (entryType === "CUSTOMER_SERVICE") {
    throw new TypeError("Use parseCustomerServiceCreateBody para atendimentos.");
  }

  if (entryType === "SIMPLE_REMINDER") {
    return base;
  }

  return base;
}

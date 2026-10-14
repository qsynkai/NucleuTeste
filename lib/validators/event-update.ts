import type { EventStatus } from "@prisma/client";
import {
  isNonEmptyString,
  parseScheduledAt,
} from "@/lib/validators/post-api";
import { parseMoneyToCents, centsToMoneyString } from "@/lib/money/brl";
import type { ExternalLinkItem } from "@/lib/types/event-api";

export type EventTaskUpsertInput = {
  id?: string;
  taskCatalogId?: string;
  customName?: string;
  price: string;
};

export type ParsedProductionEventUpdate = {
  title?: string;
  content?: string;
  scheduledAt?: Date;
  durationMinutes?: number | null;
  projectId?: string;
  currentStatus?: EventStatus;
  statusNotes?: string | null;
  mediaUrls?: string[];
  externalLinks?: ExternalLinkItem[];
  tasks?: EventTaskUpsertInput[];
};

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
    if (typeof record.title !== "string" || typeof record.url !== "string") {
      return null;
    }
    const title = record.title.trim();
    const url = record.url.trim();
    if (!title || !url) continue;
    const type =
      typeof record.type === "string" && record.type.trim()
        ? record.type.trim()
        : "reference";
    links.push({ title, url, type });
  }
  return links;
}

function parseTasks(value: unknown): EventTaskUpsertInput[] | null {
  if (!Array.isArray(value)) return null;
  const tasks: EventTaskUpsertInput[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const record = item as Record<string, unknown>;
    const cents = parseMoneyToCents(
      typeof record.price === "number" || typeof record.price === "string"
        ? record.price
        : "",
    );
    if (cents === null) return null;

    const id =
      typeof record.id === "string" && record.id.trim() ? record.id.trim() : undefined;
    const taskCatalogId =
      typeof record.taskCatalogId === "string" && record.taskCatalogId.trim()
        ? record.taskCatalogId.trim()
        : undefined;
    const customName =
      typeof record.customName === "string" && record.customName.trim()
        ? record.customName.trim()
        : undefined;

    if (!taskCatalogId && !customName) return null;

    tasks.push({
      id,
      taskCatalogId,
      customName,
      price: centsToMoneyString(cents),
    });
  }
  return tasks;
}

export function parseProductionEventUpdate(
  body: unknown,
): ParsedProductionEventUpdate {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new TypeError("Corpo da requisição inválido.");
  }

  const record = body as Record<string, unknown>;
  const patch: ParsedProductionEventUpdate = {};

  if ("title" in record) {
    if (!isNonEmptyString(record.title)) {
      throw new TypeError("Título inválido.");
    }
    patch.title = record.title.trim();
  }

  if ("content" in record) {
    if (!isNonEmptyString(record.content)) {
      throw new TypeError("Descrição inválida.");
    }
    patch.content = record.content.trim();
  }

  if ("projectId" in record) {
    if (!isNonEmptyString(record.projectId)) {
      throw new TypeError("Projeto inválido.");
    }
    patch.projectId = record.projectId.trim();
  }

  if ("scheduledAt" in record) {
    patch.scheduledAt = parseScheduledAt(record.scheduledAt);
  }

  if ("durationMinutes" in record) {
    if (record.durationMinutes === null) {
      patch.durationMinutes = null;
    } else {
      const parsed =
        typeof record.durationMinutes === "number"
          ? record.durationMinutes
          : Number.parseInt(String(record.durationMinutes), 10);
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new TypeError("Duração inválida.");
      }
      patch.durationMinutes = parsed;
    }
  }

  if ("currentStatus" in record) {
    const status = parseEventStatus(record.currentStatus);
    if (!status) throw new TypeError("Status inválido.");
    patch.currentStatus = status;
    patch.statusNotes =
      typeof record.statusNotes === "string" ? record.statusNotes.trim() : null;
  }

  if ("mediaUrls" in record) {
    if (!Array.isArray(record.mediaUrls)) {
      throw new TypeError("mediaUrls inválido.");
    }
    patch.mediaUrls = record.mediaUrls
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .map((item) => item.trim());
  }

  if ("externalLinks" in record) {
    const links = parseExternalLinks(record.externalLinks);
    if (!links) throw new TypeError("Links inválidos.");
    patch.externalLinks = links;
  }

  if ("tasks" in record) {
    const tasks = parseTasks(record.tasks);
    if (!tasks) throw new TypeError("Tarefas inválidas.");
    patch.tasks = tasks;
  }

  if (Object.keys(patch).length === 0) {
    throw new TypeError("Nada para atualizar.");
  }

  return patch;
}

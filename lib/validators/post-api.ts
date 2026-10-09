import type { SocialChannel } from "@prisma/client";
import { parseSocialChannels } from "@/lib/validators/social";

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function parseScheduledAt(value: unknown): Date {
  if (!isNonEmptyString(value)) {
    throw new TypeError("scheduledAt é obrigatório e deve ser uma string ISO.");
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("scheduledAt inválido.");
  }

  return date;
}

function parseStringArray(value: unknown, field: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new TypeError(`${field} deve ser um array de strings.`);
  }

  return value.map((item, index) => {
    if (!isNonEmptyString(item)) {
      throw new TypeError(`${field}[${index}] inválido.`);
    }
    return item.trim();
  });
}

export type ParsedPostPayload = {
  projectId: string;
  title: string;
  content: string;
  scheduledAt: Date;
  channels: SocialChannel[];
  mediaUrls: string[];
};

export function parsePostPayload(body: unknown): ParsedPostPayload {
  if (!body || typeof body !== "object") {
    throw new TypeError("Corpo da requisição inválido.");
  }

  const record = body as Record<string, unknown>;

  if (!isNonEmptyString(record.projectId)) {
    throw new TypeError("Selecione o projeto do post.");
  }

  if (!isNonEmptyString(record.title)) {
    throw new TypeError("title é obrigatório.");
  }

  if (!isNonEmptyString(record.content)) {
    throw new TypeError("content é obrigatório.");
  }

  const scheduledAt = parseScheduledAt(record.scheduledAt);

  if (!Array.isArray(record.channels) || record.channels.length === 0) {
    throw new TypeError("Selecione ao menos uma rede de destino.");
  }

  const channels = parseSocialChannels(
    record.channels.filter((item): item is string => typeof item === "string"),
  );

  const mediaUrls = parseStringArray(record.mediaUrls, "mediaUrls");

  return {
    projectId: record.projectId.trim(),
    title: record.title.trim(),
    content: record.content.trim(),
    scheduledAt,
    channels,
    mediaUrls,
  };
}

export function parseGenerateCopyBody(body: unknown): {
  brief: string;
  title?: string;
  channels: SocialChannel[];
} {
  if (!body || typeof body !== "object") {
    throw new TypeError("Corpo da requisição inválido.");
  }

  const record = body as Record<string, unknown>;

  if (!isNonEmptyString(record.brief)) {
    throw new TypeError("Descreva o que deseja transmitir na postagem.");
  }

  if (!Array.isArray(record.channels) || record.channels.length === 0) {
    throw new TypeError("Selecione ao menos uma rede para gerar a legenda.");
  }

  const channels = parseSocialChannels(
    record.channels.filter((item): item is string => typeof item === "string"),
  );

  const title = isNonEmptyString(record.title) ? record.title.trim() : undefined;

  return {
    brief: record.brief.trim(),
    title,
    channels,
  };
}

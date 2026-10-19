import type { EventParticipantAccess } from "@prisma/client";

export type ParsedEventParticipant = {
  userId: string;
  accessLevel: EventParticipantAccess;
};

const ACCESS_LEVELS: EventParticipantAccess[] = [
  "VIEW",
  "ADD_INFO",
  "EDIT_CONTENT",
  "UPDATE_STEPS",
];

export function parseEventParticipantAccess(
  value: unknown,
): EventParticipantAccess {
  if (
    typeof value === "string" &&
    ACCESS_LEVELS.includes(value as EventParticipantAccess)
  ) {
    return value as EventParticipantAccess;
  }
  throw new TypeError("Nível de acesso do participante inválido.");
}

export function parseEventParticipantsInput(
  value: unknown,
  ownerUserId: string,
): ParsedEventParticipant[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new TypeError("Participantes deve ser uma lista.");
  }

  const seen = new Set<string>();
  const result: ParsedEventParticipant[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new TypeError("Participante inválido.");
    }
    const record = item as Record<string, unknown>;
    if (typeof record.userId !== "string" || !record.userId.trim()) {
      throw new TypeError("Selecione o usuário participante.");
    }
    const userId = record.userId.trim();
    if (userId === ownerUserId) continue;
    if (seen.has(userId)) continue;
    seen.add(userId);
    result.push({
      userId,
      accessLevel: parseEventParticipantAccess(record.accessLevel),
    });
  }

  return result;
}

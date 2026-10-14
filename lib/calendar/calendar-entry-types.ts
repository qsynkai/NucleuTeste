import type { EntryType } from "@prisma/client";

export const CALENDAR_ENTRY_TYPE_ORDER: EntryType[] = [
  "SOCIAL_POST",
  "PRODUCTION_EVENT",
  "CUSTOMER_SERVICE",
  "SIMPLE_REMINDER",
];

export const CALENDAR_ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  SOCIAL_POST: "Redes Sociais",
  PRODUCTION_EVENT: "Produções Audiovisuais",
  CUSTOMER_SERVICE: "Atendimentos",
  SIMPLE_REMINDER: "Lembretes",
};

export function defaultVisibleEntryTypes(): EntryType[] {
  return [...CALENDAR_ENTRY_TYPE_ORDER];
}

export function isAllEntryTypesVisible(visible: EntryType[]): boolean {
  return CALENDAR_ENTRY_TYPE_ORDER.every((type) => visible.includes(type));
}

export function toLocalDateTimeInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseLocalDateTimeInput(value: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new TypeError("Data/hora inválida.");
  }
  return parsed;
}

export function defaultScheduleDate(base = new Date()): Date {
  const next = new Date(base);
  if (next.getHours() === 0 && next.getMinutes() === 0) {
    next.setHours(9, 0, 0, 0);
  }
  return next;
}

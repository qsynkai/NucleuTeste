/** Valores em BRL com precisão de centavos (evita float em somatórios). */

export function parseMoneyToCents(input: string | number): number | null {
  if (typeof input === "number") {
    if (!Number.isFinite(input) || input < 0) return null;
    return Math.round(input * 100);
  }

  const normalized = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized) return null;

  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return null;

  const whole = Number.parseInt(match[1], 10);
  const fraction = match[2] ? match[2].padEnd(2, "0") : "00";
  const cents = whole * 100 + Number.parseInt(fraction.slice(0, 2), 10);
  if (!Number.isFinite(cents) || cents < 0) return null;
  return cents;
}

export function centsToMoneyString(cents: number): string {
  const safe = Math.max(0, Math.round(cents));
  const whole = Math.floor(safe / 100);
  const fraction = String(safe % 100).padStart(2, "0");
  return `${whole}.${fraction}`;
}

export function sumMoneyCents(values: Array<string | number>): number {
  return values.reduce<number>((total, value) => {
    const cents = parseMoneyToCents(value);
    return cents === null ? total : total + cents;
  }, 0);
}

export function formatBrlFromCents(cents: number): string {
  const amount = cents / 100;
  return amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatBrlMoneyInput(value: string | number): string {
  const cents = parseMoneyToCents(value);
  if (cents === null) return formatBrlFromCents(0);
  return formatBrlFromCents(cents);
}

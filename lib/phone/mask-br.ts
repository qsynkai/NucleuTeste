/** Máscara brasileira (XX) XXXXX-XXXX para celular. */

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

export function formatBrMobilePhone(value: string): string {
  const digits = digitsOnly(value);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function phoneToWhatsAppDigits(masked: string): string {
  const digits = digitsOnly(masked);
  if (digits.length < 10) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

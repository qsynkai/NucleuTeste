const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const SLUG_MAX_LENGTH = 60;

export function slugify(input: string): string {
  const base = input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, "");

  return base || "projeto";
}

export function isValidSlug(value: string): boolean {
  return value.length <= SLUG_MAX_LENGTH && SLUG_PATTERN.test(value);
}

/** Devolve `base`, `base-2`, `base-3`… até encontrar um slug livre. */
export async function findAvailableSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  if (!(await exists(base))) return base;

  for (let attempt = 2; attempt < 1000; attempt += 1) {
    const suffix = `-${attempt}`;
    const candidate = `${base.slice(0, SLUG_MAX_LENGTH - suffix.length)}${suffix}`;
    if (!(await exists(candidate))) return candidate;
  }

  return `${base.slice(0, SLUG_MAX_LENGTH - 7)}-${Date.now().toString(36).slice(-6)}`;
}

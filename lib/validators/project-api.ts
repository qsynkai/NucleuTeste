import type { ProjectType } from "@prisma/client";
import {
  PROJECT_DESCRIPTION_MAX,
  PROJECT_NAME_MAX,
} from "@/lib/projects/project-meta";
import { isValidSlug, slugify } from "@/lib/projects/slug";
import { parseProjectType } from "@/lib/validators/social";

export const AVATAR_URL_MAX = 2048;
/** Avatar enviado como data URL já redimensionado no cliente (~192px). */
export const AVATAR_DATA_URL_MAX = 200_000;

const DATA_IMAGE_PATTERN =
  /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+=*$/;
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

function parseName(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError("Informe o nome do projeto.");
  }
  const name = value.trim();
  if (name.length > PROJECT_NAME_MAX) {
    throw new TypeError(`O nome deve ter até ${PROJECT_NAME_MAX} caracteres.`);
  }
  return name;
}

function parseOptionalText(
  value: unknown,
  field: string,
  max: number,
): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new TypeError(`${field} inválido.`);
  }
  const text = value.trim();
  if (!text) return null;
  if (text.length > max) {
    throw new TypeError(`${field} deve ter até ${max} caracteres.`);
  }
  return text;
}

export function parseAvatarUrl(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new TypeError("Imagem do projeto inválida.");
  }

  const url = value.trim();
  if (!url) return null;

  if (url.startsWith("data:")) {
    if (url.length > AVATAR_DATA_URL_MAX || !DATA_IMAGE_PATTERN.test(url)) {
      throw new TypeError("Imagem do projeto inválida ou muito grande.");
    }
    return url;
  }

  if (url.length > AVATAR_URL_MAX) {
    throw new TypeError("O link da imagem é muito longo.");
  }

  // Imagem hospedada no próprio app (ex.: /preview/avatars/ana.jpg).
  if (url.startsWith("/")) {
    if (url.startsWith("//") || url.includes("\\") || /[\s<>"']/.test(url)) {
      throw new TypeError("Link da imagem inválido.");
    }
    return url;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new TypeError("Link da imagem inválido.");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new TypeError("Use um link http(s) para a imagem.");
  }
  return url;
}

export function parseAccentColor(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !HEX_COLOR_PATTERN.test(value.trim())) {
    throw new TypeError("Cor inválida. Use o formato #RRGGBB.");
  }
  return value.trim().toUpperCase();
}

function asRecord(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new TypeError("Corpo da requisição inválido.");
  }
  return body as Record<string, unknown>;
}

export type ParsedCreateProject = {
  name: string;
  type: ProjectType;
  /** Informado explicitamente; quando ausente é derivado do nome. */
  slug: string | null;
  avatarUrl: string | null;
  description: string | null;
  accentColor: string | null;
};

export function parseCreateProjectPayload(body: unknown): ParsedCreateProject {
  const record = asRecord(body);
  const name = parseName(record.name);

  let slug: string | null = null;
  if (record.slug !== undefined && record.slug !== null && record.slug !== "") {
    if (typeof record.slug !== "string") {
      throw new TypeError("Identificador (slug) inválido.");
    }
    const candidate = slugify(record.slug);
    if (!isValidSlug(candidate) || candidate !== record.slug.trim()) {
      throw new TypeError(
        "Slug inválido. Use letras minúsculas, números e hífens.",
      );
    }
    slug = candidate;
  }

  return {
    name,
    type: record.type === undefined ? "OTHER" : parseProjectType(record.type),
    slug,
    avatarUrl: parseAvatarUrl(record.avatarUrl),
    description: parseOptionalText(
      record.description,
      "Descrição",
      PROJECT_DESCRIPTION_MAX,
    ),
    accentColor: parseAccentColor(record.accentColor),
  };
}

export type ParsedUpdateProject = Partial<{
  name: string;
  type: ProjectType;
  avatarUrl: string | null;
  description: string | null;
  accentColor: string | null;
  isActive: boolean;
}>;

export function parseUpdateProjectPayload(body: unknown): ParsedUpdateProject {
  const record = asRecord(body);
  const update: ParsedUpdateProject = {};

  if ("name" in record) update.name = parseName(record.name);
  if ("type" in record) update.type = parseProjectType(record.type);
  if ("avatarUrl" in record) update.avatarUrl = parseAvatarUrl(record.avatarUrl);
  if ("description" in record) {
    update.description = parseOptionalText(
      record.description,
      "Descrição",
      PROJECT_DESCRIPTION_MAX,
    );
  }
  if ("accentColor" in record) {
    update.accentColor = parseAccentColor(record.accentColor);
  }
  if ("isActive" in record) {
    if (typeof record.isActive !== "boolean") {
      throw new TypeError("isActive deve ser verdadeiro ou falso.");
    }
    update.isActive = record.isActive;
  }

  if (Object.keys(update).length === 0) {
    throw new TypeError("Nenhum campo para atualizar.");
  }

  return update;
}

import type { ProjectType } from "@prisma/client";

export const PROJECT_NAME_MAX = 80;
export const PROJECT_DESCRIPTION_MAX = 500;

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  COMPANY: "Empresa",
  PERSONAL_BRAND: "Marca pessoal",
  PROFESSIONAL: "Profissional",
  CAMPAIGN: "Campanha",
  OTHER: "Outro",
};

export const PROJECT_TYPE_ORDER: ProjectType[] = [
  "COMPANY",
  "PERSONAL_BRAND",
  "PROFESSIONAL",
  "CAMPAIGN",
  "OTHER",
];

/** Identificação visual discreta — mantida dentro da paleta azul-bebê/neutros. */
export const ACCENT_PRESETS = [
  "#A5D8FF",
  "#7FC3F5",
  "#4A90C2",
  "#D6ECFF",
  "#FFFFFF",
  "#8D949C",
] as const;

export function projectInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

export function shortProjectName(name: string, max = 10): string {
  const trimmed = name.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

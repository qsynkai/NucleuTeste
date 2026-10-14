const TECH_KEYWORDS = [
  "captação",
  "captacao",
  "som",
  "imagem",
  "live",
  "cortes",
  "capas",
  "transmiss",
  "vídeo",
  "video",
];

export function isTechnicalProductionTask(name: string): boolean {
  const normalized = name.toLowerCase();
  return TECH_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

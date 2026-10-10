import type { PostStatus, ProjectType, SocialChannel } from "@prisma/client";

const POST_STATUS_VALUES = [
  "DRAFT",
  "SCHEDULED",
  "PUBLISHED",
  "FAILED",
] as const satisfies readonly PostStatus[];
const SOCIAL_CHANNEL_VALUES = [
  "INSTAGRAM",
  "FACEBOOK",
  "YOUTUBE",
  "LINKEDIN",
] as const satisfies readonly SocialChannel[];
const PROJECT_TYPE_VALUES = [
  "COMPANY",
  "PERSONAL_BRAND",
  "PROFESSIONAL",
  "CAMPAIGN",
  "OTHER",
] as const satisfies readonly ProjectType[];

export function isProjectType(value: unknown): value is ProjectType {
  return (
    typeof value === "string" &&
    PROJECT_TYPE_VALUES.includes(value as ProjectType)
  );
}

export function parseProjectType(value: unknown): ProjectType {
  if (!isProjectType(value)) {
    throw new TypeError("Tipo de projeto inválido.");
  }
  return value;
}

export function isPostStatus(value: string): value is PostStatus {
  return POST_STATUS_VALUES.includes(value as PostStatus);
}

export function isSocialChannel(value: string): value is SocialChannel {
  return SOCIAL_CHANNEL_VALUES.includes(value as SocialChannel);
}

export function parsePostStatus(value: string): PostStatus {
  if (!isPostStatus(value)) {
    throw new TypeError(`Status de postagem inválido: ${value}`);
  }
  return value;
}

export function parseSocialChannels(values: string[]): SocialChannel[] {
  return values.map((value) => {
    if (!isSocialChannel(value)) {
      throw new TypeError(`Canal inválido: ${value}`);
    }
    return value;
  });
}

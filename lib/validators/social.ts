import { PostStatus, ProjectType, SocialChannel } from "@prisma/client";

const POST_STATUS_VALUES = Object.values(PostStatus) as PostStatus[];
const SOCIAL_CHANNEL_VALUES = Object.values(SocialChannel) as SocialChannel[];
const PROJECT_TYPE_VALUES = Object.values(ProjectType) as ProjectType[];

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

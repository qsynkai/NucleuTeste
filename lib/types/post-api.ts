import type { PostStatus, SocialChannel } from "@prisma/client";
import type { ProjectSummary } from "@/lib/types/project-api";

export type PostCalendarItem = {
  id: string;
  title: string;
  content: string;
  scheduledAt: string | null;
  status: PostStatus;
  channels: SocialChannel[];
  mediaUrls: string[];
  projectId: string;
  project: ProjectSummary;
};

export type PostsListResponse = {
  posts: PostCalendarItem[];
};

export type CreatePostBody = {
  projectId: string;
  title: string;
  content: string;
  scheduledAt: string;
  channels: SocialChannel[];
  mediaUrls?: string[];
};

export type UpdatePostBody = CreatePostBody;

export type GenerateCopyBody = {
  brief: string;
  title?: string;
  channels: SocialChannel[];
};

export type GenerateCopyResponse = {
  caption: string;
};

import type { PostWithRelations } from "@/lib/posts/post-include";
import type { PostCalendarItem } from "@/lib/types/post-api";

export function serializePost(post: PostWithRelations): PostCalendarItem {
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    scheduledAt: post.scheduledAt?.toISOString() ?? null,
    status: post.status,
    channels: post.channels.map((item) => item.channel),
    mediaUrls: post.mediaUrls,
    projectId: post.projectId,
    project: {
      id: post.project.id,
      name: post.project.name,
      avatarUrl: post.project.avatarUrl,
      type: post.project.type,
      accentColor: post.project.accentColor,
    },
  };
}

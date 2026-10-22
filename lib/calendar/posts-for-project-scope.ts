import type { PostCalendarItem } from "@/lib/types/post-api";

/**
 * Na visão por projeto, mantém os eventos do projeto e também convites
 * em que o usuário participa (mesmo em projetos de outras contas).
 */
export function postsForProjectScope(
  allPosts: PostCalendarItem[],
  projectId: string | null,
): PostCalendarItem[] {
  if (!projectId) return allPosts;

  const seen = new Set<string>();
  const scoped: PostCalendarItem[] = [];

  for (const post of allPosts) {
    if (post.projectId !== projectId && !post.sharedAsParticipant) continue;
    if (seen.has(post.id)) continue;
    seen.add(post.id);
    scoped.push(post);
  }

  return scoped;
}

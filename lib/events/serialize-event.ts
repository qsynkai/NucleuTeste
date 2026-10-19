import { buildSharePreviewPath } from "@/lib/events/share-preview-token";
import type { EventWithRelations } from "@/lib/events/event-include";
import type { EventListItem, ExternalLinkItem } from "@/lib/types/event-api";
import { serializePost } from "@/lib/posts/serialize-post";
import type { Prisma } from "@prisma/client";

function parseExternalLinks(value: Prisma.JsonValue | null): ExternalLinkItem[] {
  if (!value || !Array.isArray(value)) return [];
  return value
    .filter((item): item is ExternalLinkItem => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return false;
      const record = item as Record<string, unknown>;
      return (
        typeof record.title === "string" &&
        typeof record.url === "string" &&
        typeof record.type === "string"
      );
    })
    .map((item) => ({
      title: item.title,
      url: item.url,
      type: item.type,
    }));
}

export function serializeEvent(
  post: EventWithRelations,
  requestOrigin?: string | null,
): EventListItem {
  const base = serializePost(post);
  const shareUrl =
    post.sharePreviewEnabled && post.sharePreviewToken
      ? requestOrigin
        ? `${requestOrigin}${buildSharePreviewPath(post.sharePreviewToken)}`
        : buildSharePreviewPath(post.sharePreviewToken)
      : null;

  return {
    ...base,
    entryType: post.entryType,
    currentStatus: post.currentStatus,
    durationMinutes: post.durationMinutes,
    attendanceType: post.attendanceType,
    clientName: post.clientName,
    clientPhone: post.clientPhone,
    serviceChannel: post.serviceChannel,
    meetingUrl: post.meetingUrl,
    meetingNotes: post.meetingNotes,
    internalResponsible: post.internalResponsible,
    assignedProfessional: post.assignedProfessional,
    appointmentStatus: post.appointmentStatus,
    externalLinks: parseExternalLinks(post.externalLinks),
    tasks: post.tasks.map((task) => ({
      id: task.id,
      customName: task.customName,
      catalogName: task.taskCatalog?.name ?? null,
      price: task.price.toString(),
      completed: task.completed,
      assignedToUserId: task.assignedToUserId,
    })),
    statusHistory: post.statusHistory.map((entry) => ({
      id: entry.id,
      status: entry.status,
      createdAt: entry.createdAt.toISOString(),
      notes: entry.notes,
      user: { id: entry.user.id, name: entry.user.name },
    })),
    participants: post.participants.map((row) => ({
      userId: row.userId,
      accessLevel: row.accessLevel,
      user: {
        id: row.user.id,
        name: row.user.name,
        email: row.user.email,
        role: row.user.role,
      },
    })),
    sharePreview: {
      enabled: post.sharePreviewEnabled,
      url: shareUrl,
    },
  };
}

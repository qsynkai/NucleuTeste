import type { ParsedEventParticipant } from "@/lib/validators/event-participants";
import type { Prisma } from "@prisma/client";

export async function syncEventParticipants(
  tx: Prisma.TransactionClient,
  eventId: string,
  participants: ParsedEventParticipant[],
): Promise<void> {
  const userIds = participants.map((p) => p.userId);
  if (userIds.length > 0) {
    const active = await tx.user.findMany({
      where: { id: { in: userIds }, isActive: true },
      select: { id: true },
    });
    const activeIds = new Set(active.map((u) => u.id));
    for (const participant of participants) {
      if (!activeIds.has(participant.userId)) {
        throw new Error("INVALID_PARTICIPANT");
      }
    }
  }

  await tx.eventParticipant.deleteMany({ where: { eventId } });

  if (participants.length === 0) return;

  await tx.eventParticipant.createMany({
    data: participants.map((p) => ({
      eventId,
      userId: p.userId,
      accessLevel: p.accessLevel,
    })),
  });
}

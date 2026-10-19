import { eventInclude } from "@/lib/events/event-include";
import { toPublicEventPreview } from "@/lib/events/public-preview";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ token: string }>;
};

async function loadPreview(token: string) {
  const post = await prisma.post.findFirst({
    where: { sharePreviewToken: token, sharePreviewEnabled: true },
    include: eventInclude,
  });
  if (!post) return null;
  return toPublicEventPreview(post);
}

function formatWhen(scheduledAt: string | null, durationMinutes: number | null) {
  if (!scheduledAt) return "Data a definir";
  const start = new Date(scheduledAt);
  const date = start.toLocaleString("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
  });
  if (!durationMinutes) return date;
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const endTime = end.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} · até ${endTime}`;
}

export default async function EventPreviewPage({ params }: PageProps) {
  const { token } = await params;
  const preview = await loadPreview(token);
  if (!preview) notFound();

  return (
    <main className="preview-page">
      <div className="preview-card">
        <p className="preview-card__eyebrow">Prévia do compromisso</p>
        <h1 className="preview-card__title">{preview.title}</h1>
        <p className="preview-card__type">{preview.entryTypeLabel}</p>
        <p className="preview-card__when">
          {formatWhen(preview.scheduledAt, preview.durationMinutes)}
        </p>
        {preview.currentStatusLabel ? (
          <p className="preview-card__status">
            Status: {preview.currentStatusLabel}
          </p>
        ) : null}
        <p className="preview-card__project">Projeto: {preview.projectName}</p>
        <p className="preview-card__note">
          Visualização resumida. Dados internos e contatos não são exibidos neste
          link.
        </p>
      </div>
    </main>
  );
}

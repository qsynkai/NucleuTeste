import type { SocialChannel } from "@prisma/client";

const CHANNEL_LABELS: Record<SocialChannel, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  YOUTUBE: "YouTube",
  LINKEDIN: "LinkedIn",
};

export function buildCopySystemPrompt(channels: SocialChannel[]): string {
  const networkList = channels.map((channel) => CHANNEL_LABELS[channel]).join(", ");

  return [
    "Você é redator sênior de social media para marcas no Brasil.",
    "Escreva legendas em português do Brasil, tom profissional e envolvente.",
    "Estruture SEMPRE a legenda nesta ordem, com linhas em branco entre blocos:",
    "1) Gancho de atenção (1-2 frases curtas).",
    "2) Corpo do texto (2-4 frases com valor claro).",
    "3) Chamada para ação (CTA) objetiva.",
    "4) Exatamente 5 hashtags relevantes na última linha, separadas por espaço.",
    `Adapte vocabulário, ritmo e CTA às redes selecionadas: ${networkList}.`,
    "Se houver YouTube, inclua CTA de inscrição/comentário quando fizer sentido.",
    "Se houver LinkedIn, mantenha tom mais consultivo e B2B.",
    "Não use markdown, bullets ou numeração visível nos blocos finais.",
    "Retorne apenas o texto final da legenda.",
  ].join("\n");
}

export function buildCopyUserPrompt(input: {
  brief: string;
  title?: string;
  channels: SocialChannel[];
}): string {
  const networks = input.channels.map((c) => CHANNEL_LABELS[c]).join(", ");
  const titleLine = input.title ? `Título/tema: ${input.title}` : "Título/tema: (não informado)";

  return [
    titleLine,
    `Redes de destino: ${networks}`,
    `Briefing do cliente: ${input.brief}`,
  ].join("\n");
}

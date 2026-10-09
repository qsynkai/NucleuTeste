import { SocialChannel } from "@prisma/client";
import type { PostStatus, ProjectType } from "@prisma/client";

/**
 * Dados fictícios apenas para preview local (demos, screenshots, QA).
 * Imagens em public/preview (fotos de banco de imagens) — não usar em produção.
 */

export const PREVIEW_NOTE =
  "Dados de preview (fictícios). Rode npm run db:seed para recarregar.";

/** Retratos e capas locais (public/preview) — funcionam sem internet. */
export const PREVIEW_AVATARS = {
  sanca: "/preview/avatars/sanca.jpg",
  lucas: "/preview/avatars/lucas.jpg",
  marina: "/preview/avatars/marina.jpg",
  rafael: "/preview/avatars/rafael.jpg",
  ana: "/preview/avatars/ana.jpg",
  campanha: "/preview/avatars/campanha.jpg",
} as const;

export const PREVIEW_MEDIA = {
  product: "/preview/media/product.jpg",
  office: "/preview/media/office.jpg",
  speaker: "/preview/media/speaker.jpg",
  social: "/preview/media/social.jpg",
  launch: "/preview/media/launch.jpg",
} as const;

export const PREVIEW_PROJECTS = [
  {
    key: "sanca",
    slug: "sanca",
    name: "Sanca",
    type: "COMPANY" satisfies ProjectType,
    accentColor: "#A5D8FF",
    avatarUrl: PREVIEW_AVATARS.sanca,
    description: "Conta institucional da empresa Sanca.",
  },
  {
    key: "lucas",
    slug: "lucas-souza",
    name: "Lucas Souza",
    type: "PERSONAL_BRAND" satisfies ProjectType,
    accentColor: "#7FC3F5",
    avatarUrl: PREVIEW_AVATARS.lucas,
    description: "Marca pessoal e posicionamento profissional.",
  },
  {
    key: "marina",
    slug: "marina-costa",
    name: "Marina Costa",
    type: "PERSONAL_BRAND" satisfies ProjectType,
    accentColor: "#D6ECFF",
    avatarUrl: PREVIEW_AVATARS.marina,
    description: "Conteúdo de lifestyle e empreendedorismo feminino.",
  },
  {
    key: "rafael",
    slug: "dr-rafael-mendes",
    name: "Dr. Rafael Mendes",
    type: "PROFESSIONAL" satisfies ProjectType,
    accentColor: "#4A90C2",
    avatarUrl: PREVIEW_AVATARS.rafael,
    description: "Consultório — educação em saúde e prevenção.",
  },
  {
    key: "ana",
    slug: "ana-beatriz",
    name: "Ana Beatriz",
    type: "PROFESSIONAL" satisfies ProjectType,
    accentColor: "#8D949C",
    avatarUrl: PREVIEW_AVATARS.ana,
    description: "Advocacia trabalhista e carreira.",
  },
  {
    key: "campanha",
    slug: "campanha-de-lancamento",
    name: "Campanha de Lançamento",
    type: "CAMPAIGN" satisfies ProjectType,
    accentColor: "#CBE8FF",
    avatarUrl: PREVIEW_AVATARS.campanha,
    description: "Campanha multicanal de lançamento de produto.",
  },
] as const;

export type PreviewProjectKey = (typeof PREVIEW_PROJECTS)[number]["key"];

export type PreviewSeedPost = {
  project: PreviewProjectKey;
  title: string;
  content: string;
  scheduledAt: Date | null;
  status: PostStatus;
  mediaUrls: string[];
  channels: SocialChannel[];
};

export function buildPreviewPosts(at: (days: number, hour: number, minute?: number) => Date): PreviewSeedPost[] {
  return [
    {
      project: "sanca",
      title: "Lançamento do produto",
      content: "Conheça nossa nova linha — link na bio.",
      scheduledAt: at(2, 10),
      status: "SCHEDULED" satisfies PostStatus,
      mediaUrls: [PREVIEW_MEDIA.product],
      channels: ["INSTAGRAM", "FACEBOOK"] satisfies SocialChannel[],
    },
    {
      project: "sanca",
      title: "Bastidores da produção",
      content: "Um olhar por dentro de como a Sanca faz acontecer.",
      scheduledAt: at(1, 15, 30),
      status: "SCHEDULED" satisfies PostStatus,
      mediaUrls: [PREVIEW_MEDIA.office],
      channels: ["INSTAGRAM"] satisfies SocialChannel[],
    },
    {
      project: "sanca",
      title: "Tutorial em vídeo",
      content: "Passo a passo completo no YouTube. Inscreva-se no canal!",
      scheduledAt: null,
      status: "DRAFT" satisfies PostStatus,
      mediaUrls: [PREVIEW_MEDIA.speaker],
      channels: ["YOUTUBE"] satisfies SocialChannel[],
    },
    {
      project: "lucas",
      title: "Artigo de thought leadership",
      content: "Tendências de marketing B2B para 2026.",
      scheduledAt: at(-2, 9),
      status: "PUBLISHED" satisfies PostStatus,
      mediaUrls: [],
      channels: ["LINKEDIN"] satisfies SocialChannel[],
    },
    {
      project: "lucas",
      title: "Dica da semana",
      content: "Três hábitos que melhoram a consistência de conteúdo.",
      scheduledAt: at(3, 9),
      status: "SCHEDULED" satisfies PostStatus,
      mediaUrls: [PREVIEW_MEDIA.social],
      channels: ["LINKEDIN", "INSTAGRAM"] satisfies SocialChannel[],
    },
    {
      project: "lucas",
      title: "Live: perguntas da comunidade",
      content: "Respostas ao vivo sobre posicionamento e funil de conteúdo.",
      scheduledAt: at(0, 19),
      status: "SCHEDULED" satisfies PostStatus,
      mediaUrls: [PREVIEW_AVATARS.lucas],
      channels: ["INSTAGRAM", "YOUTUBE"] satisfies SocialChannel[],
    },
    {
      project: "marina",
      title: "Rotina de segunda",
      content: "Como organizo a semana entre reuniões e criação de conteúdo.",
      scheduledAt: at(1, 8),
      status: "SCHEDULED" satisfies PostStatus,
      mediaUrls: [PREVIEW_AVATARS.marina],
      channels: ["INSTAGRAM"] satisfies SocialChannel[],
    },
    {
      project: "marina",
      title: "Carrossel: 5 erros comuns",
      content: "Evite esses deslizes ao começar sua marca pessoal.",
      scheduledAt: at(5, 11),
      status: "DRAFT" satisfies PostStatus,
      mediaUrls: [PREVIEW_MEDIA.social],
      channels: ["INSTAGRAM", "FACEBOOK"] satisfies SocialChannel[],
    },
    {
      project: "marina",
      title: "Parceria com marca",
      content: "Bastidores do shooting — muito gratidão pela confiança.",
      scheduledAt: at(-1, 14),
      status: "PUBLISHED" satisfies PostStatus,
      mediaUrls: [PREVIEW_MEDIA.product],
      channels: ["INSTAGRAM"] satisfies SocialChannel[],
    },
    {
      project: "rafael",
      title: "Mito vs verdade",
      content: "Check-up anual: o que realmente importa na prevenção.",
      scheduledAt: at(2, 18),
      status: "SCHEDULED" satisfies PostStatus,
      mediaUrls: [],
      channels: ["LINKEDIN", "INSTAGRAM"] satisfies SocialChannel[],
    },
    {
      project: "rafael",
      title: "Vídeo educativo",
      content: "Sinais que merecem atenção — sem alarmismo, com ciência.",
      scheduledAt: at(4, 10),
      status: "SCHEDULED" satisfies PostStatus,
      mediaUrls: [PREVIEW_AVATARS.rafael],
      channels: ["YOUTUBE"] satisfies SocialChannel[],
    },
    {
      project: "ana",
      title: "Direitos do trabalhador",
      content: "Resumo prático para quem está em período de experiência.",
      scheduledAt: at(-3, 12),
      status: "PUBLISHED" satisfies PostStatus,
      mediaUrls: [],
      channels: ["LINKEDIN"] satisfies SocialChannel[],
    },
    {
      project: "ana",
      title: "Pergunta do seguidor",
      content: "Demissão sem justa causa: o que verificar no acordo.",
      scheduledAt: at(1, 17),
      status: "SCHEDULED" satisfies PostStatus,
      mediaUrls: [PREVIEW_AVATARS.ana],
      channels: ["INSTAGRAM", "LINKEDIN"] satisfies SocialChannel[],
    },
    {
      project: "campanha",
      title: "Teaser da campanha",
      content: "Algo grande está chegando. Fique de olho.",
      scheduledAt: at(1, 18),
      status: "SCHEDULED" satisfies PostStatus,
      mediaUrls: [PREVIEW_MEDIA.launch],
      channels: ["INSTAGRAM", "FACEBOOK", "YOUTUBE"] satisfies SocialChannel[],
    },
    {
      project: "campanha",
      title: "Contagem regressiva",
      content: "Faltam poucos dias para o lançamento.",
      scheduledAt: at(4, 12),
      status: "DRAFT" satisfies PostStatus,
      mediaUrls: [PREVIEW_MEDIA.product],
      channels: ["INSTAGRAM"] satisfies SocialChannel[],
    },
    {
      project: "campanha",
      title: "Depoimento de cliente",
      content: "História real de quem já testou o produto em beta.",
      scheduledAt: at(-1, 20),
      status: "PUBLISHED" satisfies PostStatus,
      mediaUrls: [PREVIEW_MEDIA.launch],
      channels: ["FACEBOOK", "INSTAGRAM"] satisfies SocialChannel[],
    },
    {
      project: "sanca",
      title: "Falha na publicação (exemplo)",
      content: "Post de teste para visualizar status de erro no calendário.",
      scheduledAt: at(-1, 8),
      status: "FAILED" satisfies PostStatus,
      mediaUrls: [],
      channels: ["FACEBOOK"] satisfies SocialChannel[],
    },
  ];
}

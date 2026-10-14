import type { EntryType } from "@prisma/client";
import type { ReactNode } from "react";

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const ShareIcon = () => (
  <svg {...iconProps}>
    <circle cx="18" cy="5" r="2.5" />
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="18" cy="19" r="2.5" />
    <path d="m8.2 10.7 7.6-3.9M8.2 13.3l7.6 3.9" />
  </svg>
);

const ClapperIcon = () => (
  <svg {...iconProps}>
    <path d="M4 8h16v12H4z" />
    <path d="M4 8 7 4h3l1 4M10 8l2-4h3l1 4M16 8l2-4h2l1 4" />
    <path d="M8 14h8" />
  </svg>
);

const HeadsetIcon = () => (
  <svg {...iconProps}>
    <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
    <rect x="2" y="14" width="4" height="6" rx="1.5" />
    <rect x="18" y="14" width="4" height="6" rx="1.5" />
    <path d="M8 20h2a2 2 0 0 0 2-2v-1" />
  </svg>
);

const ClockIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 8v4l2.5 2.5" />
    <path d="M9 17.5 10.5 15" />
  </svg>
);

export type CreateEntryOption = {
  entryType: EntryType;
  title: string;
  description: string;
  icon: ReactNode;
};

export const CREATE_ENTRY_OPTIONS: CreateEntryOption[] = [
  {
    entryType: "SOCIAL_POST",
    title: "Postagem Social",
    description:
      "Planejamento editorial para redes sociais com auxílio de IA.",
    icon: <ShareIcon />,
  },
  {
    entryType: "PRODUCTION_EVENT",
    title: "Evento / Produção",
    description: "Captação, lives, cortes e tarefas com orçamento em R$.",
    icon: <ClapperIcon />,
  },
  {
    entryType: "CUSTOMER_SERVICE",
    title: "Atendimento",
    description:
      "Reunião corporativa (Meet) ou atendimento de balcão (salão/barbearia).",
    icon: <HeadsetIcon />,
  },
  {
    entryType: "SIMPLE_REMINDER",
    title: "Lembrete Interno",
    description: "Compromisso pessoal rápido ou anotação de equipe.",
    icon: <ClockIcon />,
  },
];

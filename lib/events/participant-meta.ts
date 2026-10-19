import type { EventParticipantAccess } from "@prisma/client";

export const PARTICIPANT_ACCESS_OPTIONS: {
  value: EventParticipantAccess;
  label: string;
  description: string;
}[] = [
  {
    value: "VIEW",
    label: "Somente visualizar",
    description: "Vê data, detalhes e status, sem alterar.",
  },
  {
    value: "ADD_INFO",
    label: "Acrescentar informações",
    description: "Pode complementar notas e observações.",
  },
  {
    value: "EDIT_CONTENT",
    label: "Editar conteúdo",
    description: "Altera título, horário e campos principais.",
  },
  {
    value: "UPDATE_STEPS",
    label: "Atualizar etapas",
    description: "Muda status do fluxo e tarefas do processo.",
  },
];

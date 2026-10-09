import { getServerEnv } from "@/lib/env";
import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  const apiKey = getServerEnv().OPENAI_API_KEY.trim();
  if (!apiKey || apiKey === "sk-..." || apiKey.startsWith("sk-...")) {
    throw new Error(
      "OPENAI_API_KEY não configurada. Defina uma chave válida no .env para usar a IA.",
    );
  }

  if (!client) {
    client = new OpenAI({ apiKey });
  }

  return client;
}

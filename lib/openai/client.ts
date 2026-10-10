import { getServerEnv } from "@/lib/env";
import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  const apiKey = getServerEnv().OPENAI_API_KEY.trim();
  // Chaves reais têm o formato sk-… com dezenas de caracteres; valores de
  // exemplo ("sk-...", "sk-placeholder") nunca chegam à OpenAI.
  if (!/^sk-[A-Za-z0-9_-]{20,}$/.test(apiKey)) {
    throw new Error(
      "OPENAI_API_KEY não configurada. Defina uma chave válida no .env para usar a IA.",
    );
  }

  if (!client) {
    client = new OpenAI({ apiKey });
  }

  return client;
}

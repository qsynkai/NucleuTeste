import { canCreateEvent } from "@/lib/auth/permissions";
import { forbidden, requireUser } from "@/lib/auth/require-user";
import {
  buildCopySystemPrompt,
  buildCopyUserPrompt,
} from "@/lib/openai/copy-prompt";
import { getOpenAIClient } from "@/lib/openai/client";
import type { GenerateCopyResponse } from "@/lib/types/post-api";
import { parseGenerateCopyBody } from "@/lib/validators/post-api";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
): Promise<NextResponse<GenerateCopyResponse | { error: string }>> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  if (!canCreateEvent(auth.user)) return forbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  let parsed;
  try {
    parsed = parseGenerateCopyBody(body);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Dados inválidos.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.8,
      messages: [
        {
          role: "system",
          content: buildCopySystemPrompt(parsed.channels),
        },
        {
          role: "user",
          content: buildCopyUserPrompt(parsed),
        },
      ],
    });

    const caption = completion.choices[0]?.message?.content?.trim();
    if (!caption) {
      return NextResponse.json(
        { error: "A IA não retornou uma legenda válida." },
        { status: 502 },
      );
    }

    return NextResponse.json({ caption });
  } catch (error: unknown) {
    console.error("[POST /api/generate-copy]", error);
    const status = (error as { status?: number } | null)?.status;
    const keyProblem =
      status === 401 ||
      (error instanceof Error && error.message.includes("OPENAI_API_KEY"));

    if (keyProblem) {
      return NextResponse.json(
        {
          error:
            "A geração com IA não está configurada: a chave da OpenAI está ausente ou é inválida. Avise o administrador do sistema.",
        },
        { status: 503 },
      );
    }
    if (status === 429) {
      return NextResponse.json(
        {
          error:
            "O limite de uso da OpenAI foi atingido (créditos ou taxa). Tente novamente mais tarde.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Não foi possível gerar a legenda com IA." },
      { status: 500 },
    );
  }
}

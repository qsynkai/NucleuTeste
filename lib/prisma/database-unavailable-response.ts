import { NextResponse } from "next/server";

/**
 * Resposta 503 para falha de conexão com o banco. A mensagem é para o usuário
 * final (sem comandos); a dica técnica vai só para o log do servidor.
 */
export function databaseUnavailableResponse(
  context: string,
): NextResponse<{ error: string }> {
  console.error(
    `[${context}] Banco de dados inacessível. Em desenvolvimento: npm run db:dev:up`,
  );
  return NextResponse.json(
    {
      error:
        "Não foi possível conectar ao banco de dados agora. Tente novamente em instantes.",
    },
    { status: 503 },
  );
}

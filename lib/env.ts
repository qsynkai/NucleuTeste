import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL é obrigatória.")
    .refine(
      (value) =>
        value.startsWith("postgresql://") ||
        value.startsWith("postgres://") ||
        value.startsWith("prisma+postgres://"),
      "DATABASE_URL deve ser uma connection string PostgreSQL.",
    ),
  DIRECT_URL: z
    .string()
    .optional()
    .refine(
      (value) =>
        value === undefined ||
        value.startsWith("postgresql://") ||
        value.startsWith("postgres://"),
      "DIRECT_URL deve ser PostgreSQL quando definida.",
    ),
  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NEXTAUTH_SECRET deve ter ao menos 32 caracteres."),
  OPENAI_API_KEY: z
    .string()
    .min(1, "OPENAI_API_KEY é obrigatória."),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .optional()
    .default("development"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("\n");
}

export function validateServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Variáveis de ambiente inválidas:\n${formatZodError(parsed.error)}`,
    );
  }
  return parsed.data;
}

let cachedEnv: ServerEnv | undefined;

/** Validação sob demanda — evita falha no `next build` sem secrets no CI. */
export function getServerEnv(): ServerEnv {
  cachedEnv ??= validateServerEnv();
  return cachedEnv;
}

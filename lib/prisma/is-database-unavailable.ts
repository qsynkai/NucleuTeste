import { Prisma } from "@prisma/client";

/** O banco não pôde ser alcançado (a operação nunca chegou a executar). */
export function isDatabaseUnavailable(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientInitializationError ||
    (error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P1001")
  );
}

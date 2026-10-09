import { isDatabaseUnavailable } from "@/lib/prisma/is-database-unavailable";
import { PrismaClient } from "@prisma/client";

// Falhas "banco inacessível" (P1001) acontecem antes de a operação executar,
// então repetir é seguro — inclusive para escritas. O Postgres embutido do
// desenvolvimento recusa conexões de forma intermitente sob concorrência.
const RETRY_DELAYS_MS = [150, 400, 900];

function createPrismaClient() {
  const client = new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

  return client.$extends({
    name: "retry-unreachable-database",
    query: {
      async $allOperations({ args, query }) {
        for (let attempt = 0; ; attempt += 1) {
          try {
            return await query(args);
          } catch (error: unknown) {
            const delay = RETRY_DELAYS_MS[attempt];
            if (delay === undefined || !isDatabaseUnavailable(error)) {
              throw error;
            }
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      },
    },
  });
}

type AppPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: AppPrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const ADMIN_EMAIL = "admin";
const ADMIN_PASSWORD = "0000";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      name: "Administrador",
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
    },
    create: {
      name: "Administrador",
      email: ADMIN_EMAIL,
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });
  console.log(
    `Login admin criado/atualizado. Use login "${ADMIN_EMAIL}" e senha "${ADMIN_PASSWORD}".`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import { SEED_DEMO_EMAIL } from "../lib/constants/brand";
import {
  PREVIEW_NOTE,
  PREVIEW_PROJECTS,
  type PreviewProjectKey,
  buildPreviewPosts,
} from "./seed-preview-data";
import { Prisma, PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SEED_PASSWORD = "SenhaTeste123!";
const ADMIN_LOGIN_EMAIL = "admin";
const ADMIN_LOGIN_PASSWORD = "0000";

const SEED_USER = {
  name: "Usuário Preview",
  email: SEED_DEMO_EMAIL,
  role: Role.COLLABORATOR,
} as const;

const RBAC_USERS: {
  name: string;
  email: string;
  role: Role;
}[] = [
  { name: "Administrador", email: ADMIN_LOGIN_EMAIL, role: Role.ADMIN },
  {
    name: "Colaborador Teste",
    email: "colaborador@nucleuomnisagenda.local",
    role: Role.COLLABORATOR,
  },
  {
    name: "Técnico Teste",
    email: "tecnico@nucleuomnisagenda.local",
    role: Role.TECHNICIAN,
  },
  {
    name: "Parceiro Teste",
    email: "parceiro@nucleuomnisagenda.local",
    role: Role.PARTNER,
  },
];

const TASK_CATALOG: { name: string; basePrice: number }[] = [
  { name: "Capas", basePrice: 150 },
  { name: "Cortes", basePrice: 200 },
  { name: "Live", basePrice: 500 },
  { name: "Captação de som", basePrice: 300 },
  { name: "Captação de imagem", basePrice: 400 },
  { name: "Corte masculino", basePrice: 45 },
  { name: "Barba", basePrice: 35 },
  { name: "Coloração", basePrice: 120 },
  { name: "Hidratação", basePrice: 80 },
];

/** Data relativa a agora, em horário local (dias à frente, hora, minuto). */
function at(daysFromNow: number, hour: number, minute = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, minute, 0, 0);
  return date;
}

async function upsertUser(
  name: string,
  email: string,
  role: Role,
  passwordHash: string,
) {
  return prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, role, isActive: true },
    create: { name, email, passwordHash, role, isActive: true },
  });
}

async function seedTaskCatalog(): Promise<void> {
  for (const task of TASK_CATALOG) {
    await prisma.taskCatalog.upsert({
      where: { name: task.name },
      update: {
        basePrice: new Prisma.Decimal(task.basePrice),
        isActive: true,
      },
      create: {
        name: task.name,
        basePrice: new Prisma.Decimal(task.basePrice),
        isActive: true,
      },
    });
  }
}

const TECH_DEMO_EVENT_TITLE = "Demo — transmissão ao vivo (área técnica)";

async function seedTechDemoEvent(
  technicianId: string,
  ownerUserId: string,
  projectId: string,
): Promise<void> {
  const live = await prisma.taskCatalog.findUnique({ where: { name: "Live" } });
  const sound = await prisma.taskCatalog.findUnique({
    where: { name: "Captação de som" },
  });
  if (!live || !sound) return;

  const existing = await prisma.post.findFirst({
    where: { title: TECH_DEMO_EVENT_TITLE },
    select: { id: true },
  });
  if (existing) {
    await prisma.eventStatusHistory.deleteMany({ where: { eventId: existing.id } });
    await prisma.eventTask.deleteMany({ where: { eventId: existing.id } });
    await prisma.postChannel.deleteMany({ where: { postId: existing.id } });
    await prisma.post.delete({ where: { id: existing.id } });
  }

  const post = await prisma.post.create({
    data: {
      title: TECH_DEMO_EVENT_TITLE,
      content:
        "Evento de demonstração para checklist operacional e envio de links (Drive / Frame.io).",
      scheduledAt: at(1, 14, 0),
      status: "SCHEDULED",
      entryType: "PRODUCTION_EVENT",
      currentStatus: "OPEN",
      mediaUrls: [],
      userId: ownerUserId,
      projectId,
      tasks: {
        create: [
          {
            taskCatalogId: live.id,
            price: live.basePrice,
            assignedToUserId: technicianId,
          },
          {
            taskCatalogId: sound.id,
            price: sound.basePrice,
            assignedToUserId: technicianId,
          },
        ],
      },
    },
  });

  await prisma.eventStatusHistory.create({
    data: {
      eventId: post.id,
      status: "OPEN",
      userId: ownerUserId,
      notes: "Demanda técnica (seed).",
    },
  });

  console.log(`  Evento técnico demo: ${TECH_DEMO_EVENT_TITLE}`);
}

async function seedPreviewData(
  userId: string,
  passwordHash: string,
): Promise<string | null> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      name: SEED_USER.name,
      passwordHash,
      role: SEED_USER.role,
      isActive: true,
    },
  });

  await prisma.eventStatusHistory.deleteMany({
    where: { event: { userId } },
  });
  await prisma.eventTask.deleteMany({
    where: { event: { userId } },
  });
  await prisma.postChannel.deleteMany({
    where: { post: { userId } },
  });
  await prisma.post.deleteMany({ where: { userId } });
  await prisma.project.deleteMany({ where: { ownerId: userId } });

  const projectIds = new Map<PreviewProjectKey, string>();
  for (const project of PREVIEW_PROJECTS) {
    const created = await prisma.project.create({
      data: {
        name: project.name,
        slug: project.slug,
        type: project.type,
        accentColor: project.accentColor,
        description: project.description,
        avatarUrl: project.avatarUrl,
        ownerId: userId,
      },
    });
    projectIds.set(project.key, created.id);
  }

  const posts = buildPreviewPosts(at);

  for (const post of posts) {
    const projectId = projectIds.get(post.project);
    if (!projectId) throw new Error(`Projeto de seed ausente: ${post.project}`);

    const created = await prisma.post.create({
      data: {
        title: post.title,
        content: post.content,
        scheduledAt: post.scheduledAt,
        status: post.status,
        entryType: "SOCIAL_POST",
        currentStatus: "OPEN",
        mediaUrls: post.mediaUrls,
        userId,
        projectId,
        channels: {
          create: post.channels.map((channel) => ({ channel })),
        },
      },
    });

    await prisma.eventStatusHistory.create({
      data: {
        eventId: created.id,
        status: "OPEN",
        userId,
        notes: "Registro inicial (seed).",
      },
    });
  }

  console.log("Seed de preview concluído:");
  console.log(`  ${PREVIEW_NOTE}`);
  console.log(`  Usuário: ${SEED_USER.email} (senha: ${SEED_PASSWORD})`);
  console.log(
    `  Projetos (${PREVIEW_PROJECTS.length}): ${PREVIEW_PROJECTS.map((p) => p.name).join(", ")}`,
  );
  console.log(`  Postagens: ${posts.length}`);

  const firstProjectId = projectIds.values().next().value as string | undefined;
  return firstProjectId ?? null;
}

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);

  await seedTaskCatalog();

  const adminPasswordHash = await bcrypt.hash(ADMIN_LOGIN_PASSWORD, 12);
  for (const account of RBAC_USERS) {
    const hash =
      account.email === ADMIN_LOGIN_EMAIL ? adminPasswordHash : passwordHash;
    await upsertUser(account.name, account.email, account.role, hash);
  }

  const previewUser = await upsertUser(
    SEED_USER.name,
    SEED_USER.email,
    SEED_USER.role,
    passwordHash,
  );

  const previewProjectId = await seedPreviewData(previewUser.id, passwordHash);

  const technician = await prisma.user.findUnique({
    where: { email: "tecnico@nucleuomnisagenda.local" },
  });
  if (technician && previewProjectId) {
    await seedTechDemoEvent(technician.id, previewUser.id, previewProjectId);
  }

  console.log("Catálogo de tarefas:", TASK_CATALOG.map((t) => t.name).join(", "));
  console.log("Usuários RBAC:");
  for (const account of RBAC_USERS) {
    const pwd =
      account.email === ADMIN_LOGIN_EMAIL
        ? ADMIN_LOGIN_PASSWORD
        : SEED_PASSWORD;
    console.log(`  ${account.role}: ${account.email} (senha: ${pwd})`);
  }
}

main()
  .catch((error: unknown) => {
    console.error("Erro ao executar seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

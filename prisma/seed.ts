import { SEED_DEMO_EMAIL } from "../lib/constants/brand";
import {
  PREVIEW_NOTE,
  PREVIEW_PROJECTS,
  type PreviewProjectKey,
  buildPreviewPosts,
} from "./seed-preview-data";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SEED_USER = {
  name: "Usuário Preview",
  email: SEED_DEMO_EMAIL,
  password: "SenhaTeste123!",
} as const;

/** Data relativa a agora, em horário local (dias à frente, hora, minuto). */
function at(daysFromNow: number, hour: number, minute = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, minute, 0, 0);
  return date;
}

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(SEED_USER.password, 12);

  const user = await prisma.user.upsert({
    where: { email: SEED_USER.email },
    update: {
      name: SEED_USER.name,
      passwordHash,
    },
    create: {
      name: SEED_USER.name,
      email: SEED_USER.email,
      passwordHash,
    },
  });

  // Ordem importa: posts antes dos projetos (Post.projectId não aceita cascade).
  await prisma.postChannel.deleteMany({
    where: { post: { userId: user.id } },
  });
  await prisma.post.deleteMany({ where: { userId: user.id } });
  await prisma.project.deleteMany({ where: { ownerId: user.id } });

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
        ownerId: user.id,
      },
    });
    projectIds.set(project.key, created.id);
  }

  const posts = buildPreviewPosts(at);

  for (const post of posts) {
    const projectId = projectIds.get(post.project);
    if (!projectId) throw new Error(`Projeto de seed ausente: ${post.project}`);

    await prisma.post.create({
      data: {
        title: post.title,
        content: post.content,
        scheduledAt: post.scheduledAt,
        status: post.status,
        mediaUrls: post.mediaUrls,
        userId: user.id,
        projectId,
        channels: {
          create: post.channels.map((channel) => ({ channel })),
        },
      },
    });
  }

  console.log("Seed de preview concluído:");
  console.log(`  ${PREVIEW_NOTE}`);
  console.log(`  Usuário: ${user.email} (senha: ${SEED_USER.password})`);
  console.log(
    `  Projetos (${PREVIEW_PROJECTS.length}): ${PREVIEW_PROJECTS.map((p) => p.name).join(", ")}`,
  );
  console.log(`  Postagens: ${posts.length}`);
}

main()
  .catch((error: unknown) => {
    console.error("Erro ao executar seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

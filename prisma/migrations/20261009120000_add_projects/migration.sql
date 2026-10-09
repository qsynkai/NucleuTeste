-- Gestão por projetos: todo Post passa a pertencer a um Project.
-- Estratégia segura para bases já populadas:
--   1) cria Project e adiciona Post.projectId como NULLABLE;
--   2) cria o projeto "Geral" para cada usuário que já possui posts e faz o backfill;
--   3) só então torna Post.projectId obrigatório e cria o vínculo (FK).

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('COMPANY', 'PERSONAL_BRAND', 'PROFESSIONAL', 'CAMPAIGN', 'OTHER');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "ProjectType" NOT NULL DEFAULT 'OTHER',
    "avatarUrl" TEXT,
    "description" TEXT,
    "accentColor" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE INDEX "Project_ownerId_isActive_idx" ON "Project"("ownerId", "isActive");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable (nullable até o backfill)
ALTER TABLE "Post" ADD COLUMN "projectId" TEXT;

-- Backfill: um projeto "Geral" por usuário com posts pré-existentes
INSERT INTO "Project" ("id", "name", "slug", "type", "description", "isActive", "ownerId", "createdAt", "updatedAt")
SELECT
    'prj' || substr(md5(u."id"), 1, 21),
    'Geral',
    'geral-' || substr(md5(u."id"), 1, 8),
    'OTHER',
    'Projeto criado automaticamente para as postagens anteriores à gestão por projetos.',
    true,
    u."id",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User" u
WHERE EXISTS (SELECT 1 FROM "Post" p WHERE p."userId" = u."id");

UPDATE "Post" p
SET "projectId" = 'prj' || substr(md5(p."userId"), 1, 21)
WHERE p."projectId" IS NULL;

-- Torna obrigatório
ALTER TABLE "Post" ALTER COLUMN "projectId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Post_projectId_idx" ON "Post"("projectId");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

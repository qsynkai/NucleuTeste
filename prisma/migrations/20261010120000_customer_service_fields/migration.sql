ALTER TABLE "Post"
ADD COLUMN IF NOT EXISTS "internalResponsible" TEXT,
ADD COLUMN IF NOT EXISTS "assignedProfessional" TEXT;

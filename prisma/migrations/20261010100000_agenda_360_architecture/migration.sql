-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'COLLABORATOR', 'TECHNICIAN', 'PARTNER');

-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('SOCIAL_POST', 'PRODUCTION_EVENT', 'CUSTOMER_SERVICE', 'SIMPLE_REMINDER');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_COLLABORATORS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendanceType" AS ENUM ('CORPORATE_MEETING', 'SERVICE_APPOINTMENT');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_SERVICE', 'COMPLETED', 'NO_SHOW', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ServiceChannel" AS ENUM ('GOOGLE_MEET', 'WHATSAPP', 'PHONE_CALL', 'IN_PERSON', 'OTHER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'COLLABORATOR',
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "entryType" "EntryType" NOT NULL DEFAULT 'SOCIAL_POST',
ADD COLUMN     "currentStatus" "EventStatus" NOT NULL DEFAULT 'OPEN',
ADD COLUMN     "externalLinks" JSONB,
ADD COLUMN     "attendanceType" "AttendanceType",
ADD COLUMN     "clientName" TEXT,
ADD COLUMN     "clientPhone" TEXT,
ADD COLUMN     "durationMinutes" INTEGER,
ADD COLUMN     "serviceChannel" "ServiceChannel",
ADD COLUMN     "meetingUrl" TEXT,
ADD COLUMN     "meetingNotes" TEXT,
ADD COLUMN     "appointmentStatus" "AppointmentStatus";

-- CreateTable
CREATE TABLE "TaskCatalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "basePrice" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventTask" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "taskCatalogId" TEXT,
    "customName" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "assignedToUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventStatusHistory" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" "EventStatus" NOT NULL,
    "userId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskCatalog_name_key" ON "TaskCatalog"("name");

-- CreateIndex
CREATE INDEX "EventTask_eventId_idx" ON "EventTask"("eventId");

-- CreateIndex
CREATE INDEX "EventTask_taskCatalogId_idx" ON "EventTask"("taskCatalogId");

-- CreateIndex
CREATE INDEX "EventTask_assignedToUserId_idx" ON "EventTask"("assignedToUserId");

-- CreateIndex
CREATE INDEX "EventStatusHistory_eventId_createdAt_idx" ON "EventStatusHistory"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "EventStatusHistory_userId_idx" ON "EventStatusHistory"("userId");

-- CreateIndex
CREATE INDEX "Post_entryType_idx" ON "Post"("entryType");

-- CreateIndex
CREATE INDEX "Post_currentStatus_idx" ON "Post"("currentStatus");

-- AddForeignKey
ALTER TABLE "EventTask" ADD CONSTRAINT "EventTask_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTask" ADD CONSTRAINT "EventTask_taskCatalogId_fkey" FOREIGN KEY ("taskCatalogId") REFERENCES "TaskCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTask" ADD CONSTRAINT "EventTask_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventStatusHistory" ADD CONSTRAINT "EventStatusHistory_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventStatusHistory" ADD CONSTRAINT "EventStatusHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

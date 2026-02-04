-- CreateEnum
CREATE TYPE "HabitLogType" AS ENUM ('DONE', 'SICK', 'TRAVEL', 'STRESSED', 'BUSY', 'OTHER');

-- DropIndex
DROP INDEX "HabitLog_habitId_idx";

-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "lastDeclinedUpgradeAt" TIMESTAMP(3),
ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "phase" TEXT NOT NULL DEFAULT 'initiation';

-- AlterTable
ALTER TABLE "HabitLog" ADD COLUMN     "logType" "HabitLogType" NOT NULL DEFAULT 'DONE';

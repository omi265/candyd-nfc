-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "orderIndex" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pauseUntil" TIMESTAMP(3),
ADD COLUMN     "ritualType" TEXT NOT NULL DEFAULT 'OTHER';

-- AlterTable
ALTER TABLE "HabitLog" ADD COLUMN     "reflection" TEXT;

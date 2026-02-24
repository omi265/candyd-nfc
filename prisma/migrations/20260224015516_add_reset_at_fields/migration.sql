-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "resetAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "lastResetAt" TIMESTAMP(3);

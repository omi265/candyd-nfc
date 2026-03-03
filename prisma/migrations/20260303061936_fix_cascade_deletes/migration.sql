-- DropForeignKey
ALTER TABLE "Habit" DROP CONSTRAINT "Habit_productId_fkey";

-- DropForeignKey
ALTER TABLE "LifeList" DROP CONSTRAINT "LifeList_productId_fkey";

-- AddForeignKey
ALTER TABLE "LifeList" ADD CONSTRAINT "LifeList_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

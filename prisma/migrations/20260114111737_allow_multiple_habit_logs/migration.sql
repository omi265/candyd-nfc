-- DropIndex
DROP INDEX "HabitLog_habitId_date_key";

-- CreateIndex
CREATE INDEX "HabitLog_habitId_date_idx" ON "HabitLog"("habitId", "date");

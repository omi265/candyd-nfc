-- Add compound indexes for common filtered and ordered app queries.
CREATE INDEX "Product_userId_active_createdAt_idx" ON "Product"("userId", "active", "createdAt");
CREATE INDEX "Memory_userId_createdAt_idx" ON "Memory"("userId", "createdAt");
CREATE INDEX "Memory_productId_userId_createdAt_idx" ON "Memory"("productId", "userId", "createdAt");
CREATE INDEX "Habit_productId_userId_isActive_orderIndex_idx" ON "Habit"("productId", "userId", "isActive", "orderIndex");
CREATE INDEX "HabitLog_habitId_date_createdAt_idx" ON "HabitLog"("habitId", "date", "createdAt");

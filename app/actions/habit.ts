"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { createHabitSchema, logHabitSchema } from "@/lib/schemas";

// ===========================================
// HABIT SETUP & RETRIEVAL
// ===========================================

export async function createHabit(
  productId: string,
  data: {
    title: string;
    description?: string;
    focusArea: string;
    targetDays?: number; // Default 66
  }
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const validated = createHabitSchema.safeParse(data);
  if (!validated.success) {
      return { error: validated.error.issues[0].message };
  }
  const { title, description, focusArea, targetDays } = validated.data;

  try {
    // Verify product ownership and type
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { userId: true, type: true },
    });

    if (!product || product.userId !== session.user.id) {
      return { error: "Unauthorized" };
    }

    if (product.type !== "HABIT") {
      return { error: "This charm is not a Habit Charm" };
    }

    // Check if habit already exists
    const existingHabit = await db.habit.findFirst({
        where: { productId, isActive: true }
    });

    if (existingHabit) {
        return { error: "An active habit already exists for this charm." };
    }

    const habit = await db.habit.create({
      data: {
        title,
        description,
        focusArea,
        targetDays: targetDays || 66,
        productId,
        userId: session.user.id,
      },
    });

    revalidatePath(`/habit-charm`);
    return { success: true, habitId: habit.id };
  } catch (error) {
    console.error("Create Habit Error:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function getHabit(productId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  try {
    const habit = await db.habit.findFirst({
      where: {
        productId,
        userId: session.user.id,
        isActive: true
      },
      include: {
        logs: {
            orderBy: { date: 'desc' },
            take: 7 // Get last week of logs
        }
      }
    });

    return habit;
  } catch (error) {
    console.error("Failed to get habit:", error);
    return null;
  }
}

// ===========================================
// LOGGING & STREAK LOGIC
// ===========================================

export async function logHabit(habitId: string, notes?: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const validated = logHabitSchema.safeParse({ notes });
    if (!validated.success) {
        return { error: validated.error.issues[0].message };
    }

    try {
        const habit = await db.habit.findUnique({
            where: { id: habitId },
            include: { logs: { orderBy: { date: 'desc' }, take: 1 } }
        });

        if (!habit || habit.userId !== session.user.id) {
            return { error: "Unauthorized" };
        }

        // Normalize today to start of day (UTC or user timezone? Keeping it simple UTC for now)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if already logged today
        const lastLog = habit.logs[0];
        if (lastLog) {
            const lastLogDate = new Date(lastLog.date);
            lastLogDate.setHours(0, 0, 0, 0);
            
            if (lastLogDate.getTime() === today.getTime()) {
                return { error: "Already logged today!" }; // Or success: true but do nothing
            }
        }

        // Create log
        await db.habitLog.create({
            data: {
                date: today,
                notes: validated.data.notes,
                habitId
            }
        });

        // Calculate Streak
        let newStreak = 1;
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (lastLog) {
            const lastLogDate = new Date(lastLog.date);
            lastLogDate.setHours(0, 0, 0, 0);

            if (lastLogDate.getTime() === yesterday.getTime()) {
                // Streak continues
                newStreak = habit.currentStreak + 1;
            } else {
                // Streak broken (already reset to 1)
                // Exception: Grace periods? For now, strict.
            }
        }

        // Update Habit Stats
        const updates: any = {
            currentStreak: newStreak,
            totalCompletions: habit.totalCompletions + 1,
        };

        if (newStreak > habit.longestStreak) {
            updates.longestStreak = newStreak;
        }

        // Graduation Check
        if (newStreak >= habit.targetDays) {
             updates.graduatedAt = new Date();
             updates.isActive = false; // Or keep active but marked as graduated?
             
             // Also graduate the product
             await db.product.update({
                 where: { id: habit.productId },
                 data: { state: "GRADUATED", graduatedAt: new Date() }
             });
        }

        await db.habit.update({
            where: { id: habitId },
            data: updates
        });

        revalidatePath(`/habit-charm`);
        return { success: true, newStreak, graduated: !!updates.graduatedAt };

    } catch (error) {
        console.error("Log Habit Error:", error);
        return { error: error instanceof Error ? error.message : "Unknown error" };
    }
}

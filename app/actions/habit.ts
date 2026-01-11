"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { createHabitSchema, logHabitSchema } from "@/lib/schemas";

// ===========================================
// HABIT SETUP & RETRIEVAL
// ===========================================

export async function createHabits(
  productId: string,
  habitsData: {
    title: string;
    description?: string;
    focusArea: string;
    targetDays?: number;
  }[],
  charmName?: string
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  if (habitsData.length === 0) return { error: "No habits provided" };
  if (habitsData.length > 6) return { error: "Maximum 6 habits allowed" };

  try {
     // Verify product ownership and type
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { userId: true, type: true }
    });

    if (!product || product.userId !== session.user.id) {
      return { error: "Unauthorized" };
    }

    if (product.type !== "HABIT") {
      return { error: "This charm is not a Habit Charm" };
    }

    // Update product name if provided
    if (charmName) {
        await db.product.update({
            where: { id: productId },
            data: { name: charmName }
        });
    }

    // Create all habits in a transaction
    await db.$transaction(
        habitsData.map(data => 
            db.habit.create({
                data: {
                    title: data.title,
                    description: data.description,
                    focusArea: data.focusArea,
                    targetDays: data.targetDays || 66,
                    productId,
                    userId: session.user.id
                }
            })
        )
    );

    revalidatePath(`/habit-charm`);
    return { success: true };

  } catch (error) {
      console.error("Create Habits Error:", error);
      return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

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

export async function getHabits(productId: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  try {
    const habits = await db.habit.findMany({
      where: {
        productId,
        userId: session.user.id,
        isActive: true
      },
      include: {
        logs: {
            orderBy: { date: 'desc' },
            take: 365 // Get last year of logs
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return habits;
  } catch (error) {
    console.error("Failed to get habits:", error);
    return [];
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

export async function updateHabitStats(
  habitId: string,
  data: { currentStreak?: number; totalCompletions?: number }
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const habit = await db.habit.findUnique({
      where: { id: habitId },
      select: { userId: true },
    });

    if (!habit || habit.userId !== session.user.id) {
      return { error: "Unauthorized" };
    }

    await db.habit.update({
      where: { id: habitId },
      data: {
        ...(data.currentStreak !== undefined && { currentStreak: data.currentStreak }),
        ...(data.totalCompletions !== undefined && { totalCompletions: data.totalCompletions }),
      },
    });

    revalidatePath(`/habit-charm`);
    return { success: true };
  } catch (error) {
    console.error("Update Habit Stats Error:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function toggleHabitDate(habitId: string, date: Date) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    try {
        const habit = await db.habit.findUnique({
            where: { id: habitId },
            select: { userId: true, currentStreak: true, targetDays: true, totalCompletions: true, productId: true, longestStreak: true }
        });

        if (!habit || habit.userId !== session.user.id) {
            return { error: "Unauthorized" };
        }

        // Normalize date to start of day
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        // Check if log exists
        const existingLog = await db.habitLog.findUnique({
            where: {
                habitId_date: {
                    habitId,
                    date: targetDate
                }
            }
        });

        let newTotal = habit.totalCompletions;

        if (existingLog) {
            // Remove log (Toggle OFF)
            await db.habitLog.delete({
                where: { id: existingLog.id }
            });
            newTotal = Math.max(0, newTotal - 1);
        } else {
            // Add log (Toggle ON)
            await db.habitLog.create({
                data: {
                    habitId,
                    date: targetDate
                }
            });
            newTotal += 1;
        }

        // Recalculate Streak
        // Fetch all logs again
        const allLogs = await db.habitLog.findMany({
            where: { habitId },
            orderBy: { date: 'desc' },
            select: { date: true }
        });
        
        let streak = 0;
        const today = new Date();
        today.setHours(0,0,0,0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (allLogs.length > 0) {
            const lastLogDate = new Date(allLogs[0].date);
            lastLogDate.setHours(0,0,0,0);
            
            // Streak is alive if last log is today or yesterday
            // BUT if we just toggled OFF today/yesterday, the streak logic needs to check the NEXT available log.
            // Actually, we just iterate from top log down.
            
            // Is the most recent log relevant?
            // If the most recent log is older than yesterday, streak is 0.
            if (lastLogDate.getTime() === today.getTime() || lastLogDate.getTime() === yesterday.getTime()) {
                streak = 1;
                for (let i = 0; i < allLogs.length - 1; i++) {
                    const current = new Date(allLogs[i].date);
                    const prev = new Date(allLogs[i+1].date);
                    // Normalize
                    current.setHours(0,0,0,0);
                    prev.setHours(0,0,0,0);

                    const diffTime = Math.abs(current.getTime() - prev.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                    
                    if (diffDays === 1) {
                        streak++;
                    } else {
                        break;
                    }
                }
            }
        }
        
        const updates: any = {
            currentStreak: streak,
            totalCompletions: newTotal
        };
        
        if (streak > habit.longestStreak) {
            updates.longestStreak = streak;
        }

        await db.habit.update({
            where: { id: habitId },
            data: updates
        });

        revalidatePath(`/habit-charm`);
        return { success: true, newStreak: streak };

    } catch (error) {
        console.error("Toggle Habit Date Error:", error);
        return { error: error instanceof Error ? error.message : "Unknown error" };
    }
}

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
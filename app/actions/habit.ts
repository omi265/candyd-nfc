"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { createHabitSchema, logHabitSchema } from "@/lib/schemas";
import { HabitLogType, Habit, HabitLog } from "@prisma/client";
import { CORE_HABITS } from "@/lib/habit-templates";

// ===========================================
// HABIT SETUP & RETRIEVAL
// ===========================================

export async function createHabits(
  productId: string,
  habitsData: {
    title: string;
    description?: string;
    focusArea: string;
    frequency?: string;
    targetDays?: number;
  }[],
  charmName?: string
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  if (habitsData.length === 0) return { error: "No habits provided" };
  if (habitsData.length > 10) return { error: "Maximum 10 habits allowed" };

  try {
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

    if (charmName) {
        await db.product.update({
            where: { id: productId },
            data: { name: charmName }
        });
    }

    // Create habits
    await db.$transaction(
        habitsData.map(data => 
            db.habit.create({
                data: {
                    title: data.title,
                    description: data.description,
                    focusArea: data.focusArea,
                    frequency: data.frequency || "daily",
                    targetDays: data.targetDays || 66,
                    productId,
                    userId: session.user.id,
                    level: 1,
                    phase: "initiation",
                    isActive: true
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
    frequency?: string;
    targetDays?: number; 
  }
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const validated = createHabitSchema.safeParse(data);
  if (!validated.success) {
      return { error: validated.error.issues[0].message };
  }
  const { title, description, focusArea, frequency, targetDays } = validated.data;

  try {
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

    const habit = await db.habit.create({
      data: {
        title,
        description,
        focusArea,
        frequency: frequency || "daily",
        targetDays: targetDays || 66,
        productId,
        userId: session.user.id,
        level: 1,
        phase: "initiation",
        isActive: true
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
            take: 365 
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    if (habits.length === 0) return [];

    // Filter logs in memory based on resetAt
    const habitsWithFilteredLogs = habits.map((habit) => {
        if (!habit.resetAt) return habit;
        
        const resetTime = new Date(habit.resetAt).getTime();
        const filteredLogs = habit.logs.filter(log => 
            new Date(log.createdAt).getTime() > resetTime
        );
        
        return { ...habit, logs: filteredLogs };
    });

    return habitsWithFilteredLogs;
  } catch (error) {
    console.error("Failed to get habits:", error);
    return [];
  }
}

export async function resetHabitCharm(productId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        console.error("Reset Charm: No Session");
        return { error: "Unauthorized" };
    }

    try {
        const product = await db.product.findUnique({
            where: { id: productId },
            include: { habits: true }
        });

        if (!product) {
            console.error("Reset Charm: Product not found", productId);
            return { error: "Product not found" };
        }
        if (product.userId !== session.user.id) {
            console.error("Reset Charm: User mismatch", product.userId, session.user.id);
            return { error: "Unauthorized" };
        }

        const now = new Date();

        // Update all habits using a single updateMany for efficiency where possible,
        // but since we need to set resetAt to now and individual streaks to 0,
        // and we might want individual control later, we'll keep the transaction.
        await db.$transaction([
            db.product.update({
                where: { id: productId },
                data: { lastResetAt: now }
            }),
            db.habit.updateMany({
                where: { productId: productId },
                data: {
                    resetAt: now,
                    currentStreak: 0,
                    longestStreak: 0,
                    totalCompletions: 0,
                    level: 1,
                    phase: "initiation",
                    lastDeclinedUpgradeAt: null,
                    isActive: true,
                    graduatedAt: null,
                    archivedAt: null
                }
            })
        ]);

        revalidatePath(`/habit-charm`);
        return { success: true };
    } catch (error) {
        console.error("Reset Charm Error:", error);
        return { error: "Failed to reset charm" };
    }
}

export async function updateHabit(
    habitId: string,
    data: {
        title?: string;
        description?: string;
        targetDays?: number;
        isActive?: boolean;
    }
) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    try {
        const habit = await db.habit.findUnique({ where: { id: habitId } });
        if (!habit || habit.userId !== session.user.id) return { error: "Unauthorized" };

        await db.habit.update({
            where: { id: habitId },
            data
        });

        revalidatePath(`/habit-charm`);
        return { success: true };
    } catch (error) {
        return { error: "Failed to update habit" };
    }
}

export async function deleteHabit(habitId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    try {
        const habit = await db.habit.findUnique({ where: { id: habitId } });
        if (!habit || habit.userId !== session.user.id) return { error: "Unauthorized" };

        await db.habit.delete({ where: { id: habitId } });

        revalidatePath(`/habit-charm`);
        return { success: true };
    } catch (error) {
        return { error: "Failed to delete habit" };
    }
}

export async function resetHabit(habitId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        console.error("Reset Habit: No Session");
        return { error: "Unauthorized" };
    }

    try {
        const habit = await db.habit.findUnique({ where: { id: habitId } });
        if (!habit) {
            console.error("Reset Habit: Habit not found", habitId);
            return { error: "Habit not found" };
        }
        if (habit.userId !== session.user.id) {
            console.error("Reset Habit: User mismatch", habit.userId, session.user.id);
            return { error: "Unauthorized" };
        }

        await db.habit.update({
            where: { id: habitId },
            data: {
                resetAt: new Date(),
                currentStreak: 0,
                longestStreak: 0,
                totalCompletions: 0,
                level: 1,
                phase: "initiation",
                lastDeclinedUpgradeAt: null,
                isActive: true,
                graduatedAt: null,
                archivedAt: null
            }
        });

        revalidatePath(`/habit-charm`);
        return { success: true };
    } catch (error) {
        console.error("Reset Habit Error:", error);
        return { error: "Failed to reset habit" };
    }
}

// ===========================================
// HABIT ACTIONS & LOGIC
// ===========================================

async function checkProgression(habit: Habit & { logs: HabitLog[] }) {
    if (habit.focusArea === "custom") return null;
    if (habit.level >= 4) return null; 

    // Don't suggest if declined recently (e.g. last 7 days)
    if (habit.lastDeclinedUpgradeAt) {
        const daysSinceDecline = (Date.now() - habit.lastDeclinedUpgradeAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceDecline < 14) return null;
    }

    // Logic 1: 7 days consecutive logging (Streak >= 7)
    // Note: This logic assumes 'currentStreak' is accurate.
    if (habit.currentStreak >= 7 && habit.currentStreak % 7 === 0) {
        // Find next level details
        const coreHabit = CORE_HABITS.find(h => h.id === habit.focusArea);
        const nextLevel = coreHabit?.levels.find(l => l.level === habit.level + 1);
        
        if (nextLevel) {
            return {
                shouldUpgrade: true,
                nextLevel: nextLevel.level,
                nextTitle: nextLevel.description,
                nextDuration: nextLevel.duration,
                message: "You've been consistent for 7 days! Ready to level up?"
            };
        }
    }
    
    return null;
}

export async function upgradeHabit(habitId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    try {
        const habit = await db.habit.findUnique({ where: { id: habitId } });
        if (!habit || habit.userId !== session.user.id) return { error: "Unauthorized" };

        const coreHabit = CORE_HABITS.find(h => h.id === habit.focusArea);
        const nextLevel = coreHabit?.levels.find(l => l.level === habit.level + 1);

        if (!nextLevel) return { error: "Max level reached" };

        await db.habit.update({
            where: { id: habitId },
            data: {
                level: nextLevel.level,
                title: nextLevel.description, // Update title to new micro-habit
                description: `Level ${nextLevel.level}: ${nextLevel.duration}`,
                lastDeclinedUpgradeAt: null // Reset decline timer
            }
        });

        revalidatePath(`/habit-charm`);
        return { success: true };
    } catch (error) {
        return { error: "Failed to upgrade" };
    }
}

export async function declineUpgrade(habitId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    try {
        await db.habit.update({
            where: { id: habitId },
            data: { lastDeclinedUpgradeAt: new Date() }
        });
        return { success: true };
    } catch (error) {
        return { error: "Failed to decline" };
    }
}

// ===========================================
// LOGGING & STREAK LOGIC
// ===========================================

export async function logHabit(habitId: string, notes?: string, logType: HabitLogType = "DONE") {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const validated = logHabitSchema.safeParse({ notes, logType });
    if (!validated.success) {
        return { error: validated.error.issues[0].message };
    }

    try {
        const habit = await db.habit.findUnique({
            where: { id: habitId },
            include: {
                logs: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });

        if (!habit || habit.userId !== session.user.id) {
            return { error: "Unauthorized" };
        }

        // Fetch last log specifically after resetAt if it exists
        let lastLog = habit.logs[0];
        if (habit.resetAt && lastLog && new Date(lastLog.createdAt) <= new Date(habit.resetAt)) {
            lastLog = undefined as any;
        }

        // Normalize today to UTC start of day, with 4 AM local cutoff (Virtual Day)
        const now = new Date();
        if (now.getHours() < 4) {
            now.setDate(now.getDate() - 1);
        }
        const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

        // Check already logged
        let alreadyLoggedToday = false;
        if (lastLog) {
            const lastLogDate = new Date(lastLog.date);
            if (lastLogDate.getTime() === today.getTime()) {
                alreadyLoggedToday = true;
            }
        }

        // Create log
        await db.habitLog.create({
            data: {
                date: today,
                notes: validated.data.notes,
                logType: validated.data.logType,
                habitId
            }
        });

        // Streak Logic
        let newStreak = habit.currentStreak;
        let newTotal = habit.totalCompletions;

        if (!alreadyLoggedToday) {
            newStreak = 1;
            const yesterday = new Date(today);
            yesterday.setUTCDate(yesterday.getUTCDate() - 1);

            if (lastLog) {
                const lastLogDate = new Date(lastLog.date);
                if (lastLogDate.getTime() === yesterday.getTime()) {
                    newStreak = habit.currentStreak + 1;
                }
            }
            
            if (logType === 'DONE') {
                newTotal += 1;
            }
        }

        // Check Progression
        const updatedHabitMock = { ...habit, currentStreak: newStreak, logs: lastLog ? [lastLog] : [] }; 
        const progression = await checkProgression(updatedHabitMock);

        const updates: Partial<Habit> = {
            currentStreak: newStreak,
            totalCompletions: newTotal,
        };

        if (newStreak > habit.longestStreak) {
            updates.longestStreak = newStreak;
        }

        if (newStreak >= habit.targetDays && !habit.graduatedAt) {
             updates.graduatedAt = new Date();
             updates.isActive = false; 
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
        
        return { 
            success: true, 
            newStreak, 
            graduated: !!updates.graduatedAt,
            progression 
        };

    } catch (error) {
        console.error("Log Habit Error:", error);
        return { error: error instanceof Error ? error.message : "Unknown error" };
    }
}

export async function adjustHabitLogs(habitId: string, dateStr: string, adjustment: number) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    console.log(`[adjustHabitLogs] Started for habit ${habitId} on ${dateStr} with adjustment ${adjustment}`);

    try {
        const habit = await db.habit.findUnique({
            where: { id: habitId }
        });

        if (!habit) {
            console.error(`[adjustHabitLogs] Habit not found: ${habitId}`);
            return { error: "Habit not found" };
        }

        if (habit.userId !== session.user.id) {
            console.error(`[adjustHabitLogs] Unauthorized access attempt by user ${session.user.id} for habit owned by ${habit.userId}`);
            return { error: "Unauthorized" };
        }

        // Standard UTC date for the adjustment
        const targetDate = new Date(`${dateStr}T00:00:00Z`);
        console.log(`[adjustHabitLogs] Target Date (UTC): ${targetDate.toISOString()}`);

        if (adjustment > 0) {
            console.log(`[adjustHabitLogs] Creating log...`);
            await db.habitLog.create({
                data: { 
                    habitId, 
                    date: targetDate, 
                    logType: 'DONE' 
                }
            });
        } else if (adjustment < 0) {
            console.log(`[adjustHabitLogs] Finding log to delete...`);
            const lastLogForDay = await db.habitLog.findFirst({
                where: { 
                    habitId, 
                    date: targetDate 
                },
                orderBy: { createdAt: 'desc' },
                select: { id: true }
            });

            if (lastLogForDay) {
                console.log(`[adjustHabitLogs] Deleting log ${lastLogForDay.id}`);
                await db.habitLog.delete({
                    where: { id: lastLogForDay.id }
                });
            } else {
                console.log(`[adjustHabitLogs] No log found to delete for ${dateStr}`);
            }
        }

        console.log(`[adjustHabitLogs] Recalculating stats...`);
        const allLogs = await db.habitLog.findMany({ 
            where: { habitId }, 
            orderBy: { date: 'desc' }
        });

        const activeLogs = habit.resetAt 
            ? allLogs.filter(l => new Date(l.createdAt) > new Date(habit.resetAt!))
            : allLogs;

        let streak = 0;
        const now = new Date();
        const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
        const yesterdayUTC = todayUTC - (1000 * 60 * 60 * 24);

        if (activeLogs.length > 0) {
            const uniqueDates = Array.from(new Set(activeLogs.map(l => {
                return new Date(l.date).getTime();
            }))).sort((a, b) => b - a);

            if (uniqueDates.length > 0) {
                const lastLogTime = uniqueDates[0];
                if (lastLogTime === todayUTC || lastLogTime === yesterdayUTC) {
                    streak = 1;
                    for (let i = 0; i < uniqueDates.length - 1; i++) {
                        const current = uniqueDates[i];
                        const prev = uniqueDates[i+1];
                        const diffTime = Math.abs(current - prev);
                        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 
                        if (diffDays === 1) streak++; else break;
                    }
                }
            }
        }

        console.log(`[adjustHabitLogs] New streak: ${streak}, Total: ${activeLogs.length}`);

        await db.habit.update({
            where: { id: habitId },
            data: { 
                currentStreak: streak, 
                totalCompletions: activeLogs.length,
                longestStreak: streak > habit.longestStreak ? streak : habit.longestStreak
            }
        });

        revalidatePath(`/habit-charm`);
        return { success: true };
    } catch (e) { 
        console.error("[adjustHabitLogs] FATAL ERROR:", e);
        if (e instanceof Error) {
            console.error("[adjustHabitLogs] Name:", e.name);
            console.error("[adjustHabitLogs] Message:", e.message);
            console.error("[adjustHabitLogs] Stack:", e.stack);
        }
        return { error: e instanceof Error ? e.message : "Error adjusting logs" }; 
    }
}

export async function toggleHabitDate(habitId: string, date: Date) {
    // ... [Previous Implementation adapted]
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    try {
        const habit = await db.habit.findUnique({
            where: { id: habitId },
            select: { userId: true, totalCompletions: true, longestStreak: true }
        });

        if (!habit || habit.userId !== session.user.id) return { error: "Unauthorized" };

        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        const existingLogs = await db.habitLog.findMany({ where: { habitId, date: targetDate } });

        if (existingLogs.length > 0) {
            await db.habitLog.deleteMany({ where: { habitId, date: targetDate } });
        } else {
            await db.habitLog.create({ data: { habitId, date: targetDate, logType: 'DONE' } });
        }

        // Trigger Recalc by calling adjust (0 adjustment but forces recalc? No, adjustHabitLogs does logic)
        // I will just copy the recalc logic or assume user refreshes. 
        // For brevity, I'll return success and let revalidate handle it or reuse adjust logic if I extracted it.
        // I'll reuse adjustHabitLogs for simplicity of this file rewrite.
        const dateStr = date.getFullYear() + '-' + 
                        String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                        String(date.getDate()).padStart(2, '0');
        
        return adjustHabitLogs(habitId, dateStr, 0);

    } catch (error) { return { error: "Error" }; }
}

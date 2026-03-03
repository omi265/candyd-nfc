"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { createHabitSchema, logHabitSchema } from "@/lib/schemas";
import { HabitLogType, Habit, HabitLog } from "@prisma/client";
import { CORE_HABITS } from "@/lib/habit-templates";

// ===========================================
// UTILS
// ===========================================

/**
 * Recalculates streak and completion stats from actual logs.
 * This is the ground truth for levels and progress bars.
 */
async function syncHabitStats(habitId: string) {
    const habit = await db.habit.findUnique({
        where: { id: habitId },
        include: { logs: { orderBy: { date: 'desc' } } }
    });

    if (!habit) return;

    // Filter logs by resetAt if it exists
    const activeLogs = habit.resetAt 
        ? habit.logs.filter(l => new Date(l.date) > new Date(habit.resetAt!))
        : habit.logs;

    let streak = 0;
    const now = new Date();
    // 4 AM Virtual Day Cutoff
    if (now.getHours() < 4) now.setDate(now.getDate() - 1);
    const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayUTC = todayUTC - (1000 * 60 * 60 * 24);

    if (activeLogs.length > 0) {
        // Get unique dates in UTC
        const uniqueDates = Array.from(new Set(activeLogs.map(l => {
            const d = new Date(l.date);
            return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
        }))).sort((a, b) => b - a);

        if (uniqueDates.length > 0) {
            const latestLogTime = uniqueDates[0];
            
            // Streak only continues if the latest log is today or yesterday
            if (latestLogTime === todayUTC || latestLogTime === yesterdayUTC) {
                streak = 1;
                for (let i = 0; i < uniqueDates.length - 1; i++) {
                    const current = uniqueDates[i];
                    const prev = uniqueDates[i+1];
                    const diffDays = Math.round((current - prev) / (1000 * 60 * 60 * 24)); 
                    if (diffDays === 1) streak++; else break;
                }
            }
        }
    }

    const totalDONE = activeLogs.filter(l => l.logType === 'DONE').length;

    await db.habit.update({
        where: { id: habitId },
        data: { 
            currentStreak: streak, 
            totalCompletions: totalDONE,
            longestStreak: streak > habit.longestStreak ? streak : habit.longestStreak
        }
    });

    return { streak, totalDONE };
}

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

  try {
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { userId: true, type: true }
    });

    if (!product || product.userId !== session.user.id) return { error: "Unauthorized" };
    if (product.type !== "HABIT") return { error: "Not a Habit Charm" };

    if (charmName) {
        await db.product.update({ where: { id: productId }, data: { name: charmName } });
    }

    await db.$transaction(
        habitsData.map(data => 
            db.habit.create({
                data: {
                    ...data,
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
      return { error: "Failed to create habits" };
  }
}

export async function createHabit(productId: string, data: any) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    try {
        const habit = await db.habit.create({
            data: {
                ...data,
                productId,
                userId: session.user.id,
                level: 1,
                phase: "initiation",
                isActive: true
            }
        });
        revalidatePath(`/habit-charm`);
        return { success: true, habitId: habit.id };
    } catch (e) { return { error: "Failed" }; }
}

export async function getHabits(productId: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  try {
    const habits = await db.habit.findMany({
      where: { productId, userId: session.user.id, isActive: true },
      include: { logs: { orderBy: { date: 'desc' }, take: 365 } },
      orderBy: { createdAt: 'asc' }
    });

    return habits.map(h => {
        if (!h.resetAt) return h;
        const resetTime = new Date(h.resetAt).getTime();
        return { ...h, logs: h.logs.filter(l => new Date(l.date).getTime() > resetTime) };
    });
  } catch (error) { return []; }
}

export async function resetHabitCharm(productId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    try {
        const now = new Date();
        await db.$transaction([
            db.product.update({ where: { id: productId }, data: { lastResetAt: now } }),
            db.habit.updateMany({
                where: { productId },
                data: {
                    resetAt: now,
                    currentStreak: 0,
                    longestStreak: 0,
                    totalCompletions: 0,
                    level: 1,
                    phase: "initiation"
                }
            })
        ]);
        revalidatePath(`/habit-charm`);
        return { success: true };
    } catch (e) { return { error: "Failed" }; }
}

// ===========================================
// ACTIONS
// ===========================================

async function checkProgression(habitId: string, currentStreak: number) {
    const habit = await db.habit.findUnique({ where: { id: habitId } });
    if (!habit || habit.focusArea === "custom" || habit.level >= 4) return null; 

    if (habit.lastDeclinedUpgradeAt) {
        const daysSinceDecline = (Date.now() - habit.lastDeclinedUpgradeAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceDecline < 14) return null;
    }

    if (currentStreak >= 7 && currentStreak % 7 === 0) {
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

export async function logHabit(habitId: string, notes?: string, logType: HabitLogType = "DONE", imageUrl?: string, dateStr?: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    try {
        const habit = await db.habit.findUnique({ where: { id: habitId } });
        if (!habit || habit.userId !== session.user.id) return { error: "Unauthorized" };

        let targetDate: Date;
        if (dateStr) {
            const [y, m, d] = dateStr.split('-').map(Number);
            targetDate = new Date(Date.UTC(y, m - 1, d));
        } else {
            const now = new Date();
            if (now.getHours() < 4) now.setDate(now.getDate() - 1);
            targetDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        }

        const existingLog = await db.habitLog.findFirst({ where: { habitId, date: targetDate } });

        if (existingLog) {
            await db.habitLog.update({
                where: { id: existingLog.id },
                data: { notes, imageUrl, logType }
            });
        } else {
            await db.habitLog.create({
                data: { date: targetDate, notes, imageUrl, logType, habitId }
            });
        }

        // GROUND TRUTH RECALC
        const stats = await syncHabitStats(habitId);
        const progression = await checkProgression(habitId, stats?.streak || 0);

        revalidatePath(`/habit-charm`);
        return { success: true, progression };
    } catch (e) { return { error: "Error" }; }
}

export async function adjustHabitLogs(habitId: string, dateStr: string, adjustment: number) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    try {
        const [y, m, d] = dateStr.split('-').map(Number);
        const targetDate = new Date(Date.UTC(y, m - 1, d));

        if (adjustment > 0) {
            await db.habitLog.create({ data: { habitId, date: targetDate, logType: 'DONE' } });
        } else {
            const log = await db.habitLog.findFirst({ where: { habitId, date: targetDate }, orderBy: { createdAt: 'desc' } });
            if (log) await db.habitLog.delete({ where: { id: log.id } });
        }

        await syncHabitStats(habitId);
        revalidatePath(`/habit-charm`);
        return { success: true };
    } catch (e) { return { error: "Failed" }; }
}

export async function upgradeHabit(habitId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    try {
        const habit = await db.habit.findUnique({ where: { id: habitId } });
        if (!habit) return { error: "Not found" };

        const coreHabit = CORE_HABITS.find(h => h.id === habit.focusArea);
        const nextLevel = coreHabit?.levels.find(l => l.level === habit.level + 1);
        if (!nextLevel) return { error: "Max level" };

        await db.habit.update({
            where: { id: habitId },
            data: { level: nextLevel.level, title: nextLevel.description }
        });

        revalidatePath(`/habit-charm`);
        return { success: true };
    } catch (e) { return { error: "Failed" }; }
}

export async function updateHabit(habitId: string, data: any) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };
    await db.habit.update({ where: { id: habitId }, data });
    revalidatePath(`/habit-charm`);
    return { success: true };
}

export async function deleteHabit(habitId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };
    await db.habit.delete({ where: { id: habitId } });
    revalidatePath(`/habit-charm`);
    return { success: true };
}

export async function resetHabit(habitId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };
    await db.habit.update({
        where: { id: habitId },
        data: { resetAt: new Date(), currentStreak: 0, totalCompletions: 0, level: 1 }
    });
    revalidatePath(`/habit-charm`);
    return { success: true };
}

export async function declineUpgrade(habitId: string) {
    await db.habit.update({ where: { id: habitId }, data: { lastDeclinedUpgradeAt: new Date() } });
    return { success: true };
}

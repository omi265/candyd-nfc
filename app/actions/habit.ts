"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { createHabitSchema, logHabitSchema } from "@/lib/schemas";
import { HabitLogType, Habit, HabitLog } from "@prisma/client";
import { CORE_HABITS } from "@/lib/habit-templates";

const DAY_MS = 1000 * 60 * 60 * 24;
const RITUAL_TYPES = ["MORNING", "NIGHT"] as const;

function getTargetHabitDate(dateStr?: string) {
    if (dateStr) {
        const [y, m, d] = dateStr.split("-").map(Number);
        return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
    }

    const now = new Date();
    const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    if (istTime.getHours() < 4) istTime.setDate(istTime.getDate() - 1);
    return new Date(Date.UTC(istTime.getFullYear(), istTime.getMonth(), istTime.getDate(), 0, 0, 0, 0));
}

function getDayRange(targetDate: Date) {
    const startOfDay = new Date(targetDate);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
    return { startOfDay, endOfDay };
}

function getUTCDateKey(date: Date) {
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function getLatestLogForUtcDay(
    logs: Pick<HabitLog, "date" | "createdAt" | "logType">[],
    utcDay: number,
    resetAt?: Date | null
) {
    return logs
        .filter((log) => {
            const logDate = new Date(log.date);
            return getUTCDateKey(logDate) === utcDay && (!resetAt || new Date(log.createdAt) > resetAt);
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

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
        ? habit.logs.filter(l => new Date(l.createdAt) > new Date(habit.resetAt!))
        : habit.logs;

    let streak = 0;
    const now = new Date();
    // Use IST for Virtual Today calculation
    const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    if (istTime.getHours() < 4) istTime.setDate(istTime.getDate() - 1);
    
    const todayUTC = Date.UTC(istTime.getFullYear(), istTime.getMonth(), istTime.getDate());
    const yesterdayUTC = todayUTC - (1000 * 60 * 60 * 24);

    if (activeLogs.length > 0) {
        // Get unique dates in UTC normalized from IST days
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

    const totalUniqueDONE = Array.from(new Set(
        activeLogs
            .filter(l => l.logType === 'DONE')
            .map(l => {
                const d = new Date(l.date);
                return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
            })
    )).length;

    await db.habit.update({
        where: { id: habitId },
        data: { 
            currentStreak: streak, 
            totalCompletions: totalUniqueDONE,
            longestStreak: streak > habit.longestStreak ? streak : habit.longestStreak
        }
    });

    // After updating individual habit, sync the overall medallion streak
    if (habit.productId) {
        await syncProductStreak(habit.productId);
    }

    return { streak, totalDONE: totalUniqueDONE };
}

/**
 * Recalculates the overall Medallion (Product) streak.
 * Logic:
 * - Full Day: Both Morning and Night rituals done.
 * - Partial Day: At least 1 ritual done.
 * - Missed: 0 rituals done.
 * - Grace: 1 day miss is allowed (streak continues).
 * - Pause: Days where pauseUntil is active are skipped.
 */
async function syncProductStreak(productId: string) {
    const product = await db.product.findUnique({
        where: { id: productId },
        include: { habits: { include: { logs: true } } }
    });

    if (!product || product.type !== 'HABIT') return;

    const habits = product.habits.filter(h => h.isActive);
    const morningHabits = habits.filter(h => h.ritualType === 'MORNING');
    const nightHabits = habits.filter(h => h.ritualType === 'NIGHT');
    const ritualHabits = habits.filter(h => RITUAL_TYPES.includes(h.ritualType as typeof RITUAL_TYPES[number]));

    const now = new Date();
    const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    if (istTime.getHours() < 4) istTime.setDate(istTime.getDate() - 1);
    
    const todayUTC = Date.UTC(istTime.getFullYear(), istTime.getMonth(), istTime.getDate());
    
    // Collect all unique log dates across all habits
    const allLogDates = new Set<number>();
    habits.forEach(h => h.logs.forEach(l => {
        const d = new Date(l.date);
        allLogDates.add(getUTCDateKey(d));
    }));

    // Find earliest log date to start calculation
    let checkDate = product.lastResetAt ? 
        Date.UTC(product.lastResetAt.getUTCFullYear(), product.lastResetAt.getUTCMonth(), product.lastResetAt.getUTCDate()) : 
        (allLogDates.size > 0 ? Math.min(...Array.from(allLogDates)) : todayUTC);

    // Iteratively check each day from start until today
    let streak = 0;
    let graceUsed = false;
    const getStatusForDay = (utc: number) => {
        const morningLogs = morningHabits.map(h => getLatestLogForUtcDay(h.logs, utc, h.resetAt));
        const nightLogs = nightHabits.map(h => getLatestLogForUtcDay(h.logs, utc, h.resetAt));
        const ritualLogs = ritualHabits.map(h => getLatestLogForUtcDay(h.logs, utc, h.resetAt));

        const morningDone = morningHabits.length > 0 && morningLogs.every(l => l?.logType === "DONE");
        const nightDone = nightHabits.length > 0 && nightLogs.every(l => l?.logType === "DONE");
        const anyDone = ritualLogs.some(l => l?.logType === "DONE");

        // Preserve legacy pauseUntil support while preferring actual day logs for historical accuracy.
        const allPausedByLogs = ritualHabits.length > 0 && ritualLogs.every(l => l && l.logType !== "DONE");
        const allPausedByPauseUntil = ritualHabits.length > 0 && ritualHabits.every(h => h.pauseUntil && h.pauseUntil.getTime() > utc);

        return { 
            isFull: (morningHabits.length === 0 || morningDone) && (nightHabits.length === 0 || nightDone),
            isPartial: anyDone,
            isPaused: allPausedByLogs || allPausedByPauseUntil
        };
    };

    // Calculate backwards for streak
    let dateToTrack = todayUTC;
    
    // Special case: check if today is done or partial
    const todayStatus = getStatusForDay(todayUTC);
    if (!todayStatus.isPartial && !todayStatus.isPaused) {
        // Streak might still be alive from yesterday
        dateToTrack -= (1000 * 60 * 60 * 24);
    }

    while (dateToTrack >= checkDate) {
        const status = getStatusForDay(dateToTrack);
        
        if (status.isPaused) {
            // Skip this day, continue back
            dateToTrack -= (1000 * 60 * 60 * 24);
            continue;
        }

        if (status.isPartial) {
            streak++;
            graceUsed = false; // Reset grace usage since we found a success
        } else {
            if (!graceUsed && dateToTrack !== todayUTC) {
                // Use grace for one missed day (but not today if not started yet)
                graceUsed = true;
                // Streak count doesn't increase, but also doesn't reset
            } else {
                // Break streak
                break;
            }
        }
        dateToTrack -= (1000 * 60 * 60 * 24);
    }

    await db.product.update({
        where: { id: productId },
        data: {
            currentStreak: streak,
            longestStreak: streak > product.longestStreak ? streak : product.longestStreak
        }
    });
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
    ritualType?: string;
    duration?: number;
    orderIndex?: number;
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

    // Use an interactive transaction for atomicity and to prevent "Array of Promises" issues
    await db.$transaction(async (tx) => {
        // 0. Update product name if provided
        if (charmName) {
            await tx.product.update({ 
                where: { id: productId }, 
                data: { name: charmName } 
            });
        }

        // 1. Archive existing habits
        await tx.habit.updateMany({
            where: { productId, userId: session.user.id, isActive: true },
            data: { isActive: false }
        });

        // 2. Create new habits sequentially
        for (const data of habitsData) {
            await tx.habit.create({
                data: {
                    title: data.title,
                    description: data.description,
                    focusArea: data.focusArea,
                    frequency: data.frequency || "daily",
                    targetDays: data.targetDays || 66,
                    ritualType: data.ritualType || "OTHER",
                    duration: data.duration || null,
                    orderIndex: data.orderIndex || 0,
                    productId,
                    userId: session.user.id,
                    isActive: true
                }
            });
        }
    });

    revalidatePath(`/habit-charm`);
    return { success: true };
  } catch (error) {
      console.error("[CREATE_HABITS_ERROR]", error);
      return { error: error instanceof Error ? error.message : "Failed to create habits" };
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
        return { ...h, logs: h.logs.filter(l => new Date(l.createdAt).getTime() > resetTime) };
    });
  } catch (error) { return []; }
}

export async function resetHabitCharm(productId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    try {
        const now = new Date();
        await db.$transaction(async (tx) => {
            await tx.product.update({ 
                where: { id: productId }, 
                data: { 
                    lastResetAt: now,
                    currentStreak: 0,
                    longestStreak: 0
                } 
            });
            await tx.habit.updateMany({
                where: { productId },
                data: {
                    resetAt: now,
                    currentStreak: 0,
                    longestStreak: 0,
                    totalCompletions: 0,
                    level: 1,
                    phase: "initiation"
                }
            });
        });
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

export async function logHabit(habitId: string, notes?: string, logType: HabitLogType = "DONE", imageUrl?: string, dateStr?: string, reflection?: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    try {
        const habit = await db.habit.findUnique({ where: { id: habitId } });
        if (!habit || habit.userId !== session.user.id) return { error: "Unauthorized" };

        const targetDate = getTargetHabitDate(dateStr);
        const { startOfDay, endOfDay } = getDayRange(targetDate);

        // Check already logged for this specific day (Range search is safer than exact match)
        // CRITICAL: Only match logs created AFTER the last reset
        const existingLog = await db.habitLog.findFirst({
            where: {
                habitId,
                date: {
                    gte: startOfDay,
                    lt: endOfDay
                },
                ...(habit.resetAt ? { createdAt: { gt: habit.resetAt } } : {})
            }
        });

        if (existingLog) {
            // Update existing log if it exists (standardize to UTC midnight while we're at it)
            await db.habitLog.update({
                where: { id: existingLog.id },
                data: {
                    date: targetDate, // Standardize legacy logs
                    notes: notes || undefined,
                    imageUrl: imageUrl || undefined,
                    reflection: reflection || undefined,
                    logType: logType
                }
            });
        } else {
            // Create new log
            await db.habitLog.create({
                data: {
                    date: targetDate,
                    notes: notes || undefined,
                    imageUrl: imageUrl || undefined,
                    reflection: reflection || undefined,
                    logType: logType,
                    habitId
                }
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
        const habit = await db.habit.findUnique({ where: { id: habitId } });
        if (!habit || habit.userId !== session.user.id) return { error: "Unauthorized" };

        const targetDate = getTargetHabitDate(dateStr);

        if (adjustment > 0) {
            await db.habitLog.create({ data: { habitId, date: targetDate, logType: 'DONE' } });
        } else {
            // CRITICAL: Ensure we only delete for THIS habitId and active logs after reset
            const { startOfDay, endOfDay } = getDayRange(targetDate);

            const log = await db.habitLog.findFirst({ 
                where: { 
                    habitId: habitId, 
                    date: {
                        gte: startOfDay,
                        lt: endOfDay
                    },
                    ...(habit.resetAt ? { createdAt: { gt: habit.resetAt } } : {})
                }, 
                orderBy: { createdAt: 'desc' } 
            });
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

export async function pauseRitual(
    productId: string,
    ritualType: "MORNING" | "NIGHT",
    logType: HabitLogType,
    dateStr?: string
) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };
    if (!RITUAL_TYPES.includes(ritualType)) return { error: "Invalid ritual type" };
    if (logType === "DONE") return { error: "Invalid pause type" };

    try {
        const habits = await db.habit.findMany({
            where: {
                productId,
                userId: session.user.id,
                isActive: true,
                ritualType
            },
            select: { id: true, resetAt: true, productId: true }
        });

        if (habits.length === 0) return { error: "No habits found for ritual" };

        const targetDate = getTargetHabitDate(dateStr);
        const { startOfDay, endOfDay } = getDayRange(targetDate);

        await db.$transaction(async (tx) => {
            for (const habit of habits) {
                const existingLog = await tx.habitLog.findFirst({
                    where: {
                        habitId: habit.id,
                        date: {
                            gte: startOfDay,
                            lt: endOfDay
                        },
                        ...(habit.resetAt ? { createdAt: { gt: habit.resetAt } } : {})
                    },
                    orderBy: { createdAt: "desc" }
                });

                if (existingLog) {
                    await tx.habitLog.update({
                        where: { id: existingLog.id },
                        data: {
                            date: targetDate,
                            logType,
                            notes: undefined,
                            imageUrl: undefined,
                            reflection: undefined
                        }
                    });
                } else {
                    await tx.habitLog.create({
                        data: {
                            habitId: habit.id,
                            date: targetDate,
                            logType
                        }
                    });
                }

                await tx.habit.update({
                    where: { id: habit.id },
                    data: { pauseUntil: endOfDay }
                });
            }
        });

        for (const habit of habits) {
            await syncHabitStats(habit.id);
        }

        revalidatePath(`/habit-charm`);
        return { success: true };
    } catch (error) {
        console.error("[PAUSE_RITUAL_ERROR]", error);
        return { error: "Failed to pause ritual" };
    }
}

export async function updateRitualHabits(
    productId: string,
    ritualType: "MORNING" | "NIGHT",
    habits: {
        id?: string;
        title: string;
        description?: string;
        focusArea?: string;
        targetDays?: number;
        duration?: number | null;
    }[]
) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };
    if (!RITUAL_TYPES.includes(ritualType)) return { error: "Invalid ritual type" };

    try {
        const existingHabits = await db.habit.findMany({
            where: {
                productId,
                userId: session.user.id,
                isActive: true,
                ritualType
            },
            select: {
                id: true,
                frequency: true,
                level: true,
                phase: true
            }
        });

        const existingIds = new Set(existingHabits.map(h => h.id));
        const incomingIds = new Set(habits.map(h => h.id).filter((id): id is string => !!id && existingIds.has(id)));
        const toDeleteIds = existingHabits.filter(h => !incomingIds.has(h.id)).map(h => h.id);

        await db.$transaction(async (tx) => {
            if (toDeleteIds.length > 0) {
                await tx.habit.deleteMany({
                    where: {
                        id: { in: toDeleteIds },
                        userId: session.user.id
                    }
                });
            }

            for (let index = 0; index < habits.length; index++) {
                const habit = habits[index];
                const payload = {
                    title: habit.title.trim(),
                    description: habit.description?.trim() || null,
                    focusArea: habit.focusArea || "custom",
                    targetDays: habit.targetDays || 66,
                    duration: habit.duration ?? 60,
                    ritualType,
                    orderIndex: index
                };

                if (habit.id && existingIds.has(habit.id)) {
                    await tx.habit.update({
                        where: { id: habit.id },
                        data: payload
                    });
                } else {
                    await tx.habit.create({
                        data: {
                            ...payload,
                            frequency: "daily",
                            productId,
                            userId: session.user.id,
                            level: 1,
                            phase: "initiation",
                            isActive: true
                        }
                    });
                }
            }
        });

        await syncProductStreak(productId);
        revalidatePath(`/habit-charm`);
        return { success: true };
    } catch (error) {
        console.error("[UPDATE_RITUAL_HABITS_ERROR]", error);
        return { error: "Failed to update ritual" };
    }
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

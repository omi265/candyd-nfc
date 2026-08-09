"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { logHabit, adjustHabitLogs, upgradeHabit, declineUpgrade, updateHabit, deleteHabit, createHabit, resetHabitCharm, resetHabit, pauseRitual, updateRitualHabits } from "@/app/actions/habit";
import { Check, Flame, Trophy, Calendar, Plus, Pencil, ChevronLeft, ChevronRight, AlertTriangle, Minus, Loader2, Plane, BedDouble, Frown, Briefcase, HelpCircle, ArrowUpCircle, Trash2, Target, Save, X, RotateCcw, Pause, Sparkles, ChevronDown, ChevronUp, ArrowRight, Sun, Moon, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Habit, HabitLog, Product, HabitLogType } from "@prisma/client";
import { CORE_HABITS } from "@/lib/habit-templates";
import { useRitualTimer, type RitualType } from "@/lib/ritual-timer-context";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";

type HabitWithLogs = Habit & { logs: HabitLog[] };
type RitualDayStatus = "full" | "partial" | "paused" | "missed";

interface EditableRitualHabit {
    clientId: string;
    id?: string;
    title: string;
    description: string;
    focusArea: string;
    duration: number;
    targetDays: number;
    orderIndex: number;
}

const DAY_MS = 1000 * 60 * 60 * 24;
const RITUAL_PAUSE_OPTIONS: { id: Exclude<HabitLogType, "DONE">; icon: typeof BedDouble; label: string }[] = [
    { id: "SICK", icon: BedDouble, label: "Sick / Rest" },
    { id: "TRAVEL", icon: Plane, label: "Traveling" },
    { id: "STRESSED", icon: Frown, label: "Stressed" },
    { id: "BUSY", icon: Briefcase, label: "Busy" },
    { id: "OTHER", icon: HelpCircle, label: "Other" },
];

function getVirtualTodayUTC() {
    const now = new Date();
    const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    if (istTime.getHours() < 4) istTime.setDate(istTime.getDate() - 1);
    return Date.UTC(istTime.getFullYear(), istTime.getMonth(), istTime.getDate());
}

function getUTCDateLabel(dateUTC: number) {
    return new Date(dateUTC).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function getDateStringFromUTC(dateUTC: number) {
    const date = new Date(dateUTC);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function getLatestLogForDay(logs: HabitLog[], utcDate: number) {
    // Assuming logs are already sorted by date descending from Prisma (which they are)
    return logs.find(log => {
        const logDate = new Date(log.date);
        return Date.UTC(logDate.getUTCFullYear(), logDate.getUTCMonth(), logDate.getUTCDate()) === utcDate;
    });
}

function parseDurationToSeconds(duration: string) {
    const value = parseInt(duration, 10);
    if (!Number.isFinite(value)) return 60;
    return duration.toLowerCase().includes("min") ? value * 60 : value;
}

function createClientId() {
    return globalThis.crypto?.randomUUID?.() ?? `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getRitualDayStatus(habits: HabitWithLogs[], utcDate: number): RitualDayStatus {
    if (habits.length === 0) return "missed";

    const dayLogs = habits.map(habit => getLatestLogForDay(habit.logs, utcDate));
    const allDone = dayLogs.every(log => log?.logType === "DONE");
    const anyDone = dayLogs.some(log => log?.logType === "DONE");
    const allPausedByLogs = dayLogs.every(log => log && log.logType !== "DONE");
    const allPausedByDate = habits.every(habit => habit.pauseUntil && habit.pauseUntil.getTime() > utcDate);

    if (allPausedByLogs || allPausedByDate) return "paused";
    if (allDone) return "full";
    if (anyDone) return "partial";
    return "missed";
}

function getRitualDayBreakdown(habits: HabitWithLogs[], utcDate: number) {
    return habits.map(habit => {
        const log = getLatestLogForDay(habit.logs, utcDate);
        if (!log) return "missed" as const;
        if (log.logType === "DONE") return "done" as const;
        return "paused" as const;
    });
}

function normalizeRitualDraft(habits: EditableRitualHabit[]) {
    return habits.map((habit, index) => ({
        ...habit,
        title: habit.title.trim(),
        description: habit.description.trim(),
        duration: Number.isFinite(habit.duration) ? Math.max(15, habit.duration) : 60,
        targetDays: Number.isFinite(habit.targetDays) ? Math.max(1, habit.targetDays) : 66,
        orderIndex: index
    }));
}

function buildEditableHabit(habit: HabitWithLogs): EditableRitualHabit {
    return {
        clientId: habit.id,
        id: habit.id,
        title: habit.title,
        description: habit.description || "",
        focusArea: habit.focusArea,
        duration: habit.duration || 60,
        targetDays: habit.targetDays,
        orderIndex: habit.orderIndex
    };
}

export default function HabitDashboard({ habits, product }: { habits: HabitWithLogs[], product: Product }) {
    const router = useRouter();
    const { startRitual: startGlobalRitual } = useRitualTimer();
    const [viewMode, setViewMode] = useState<'cards' | 'history'>('cards');
    const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
    const [isResetDrawerOpen, setIsResetDrawerOpen] = useState(false);
    const [isRestartDrawerOpen, setIsRestartDrawerOpen] = useState(false);
    const [pendingRitualType, setPendingRitualType] = useState<RitualType | null>(null);
    const [ritualPauseType, setRitualPauseType] = useState<RitualType | null>(null);
    const [ritualManageType, setRitualManageType] = useState<RitualType | null>(null);
    const [viewLogData, setViewLogData] = useState<{
        isOpen: boolean;
        date: Date;
        habitTitle: string;
        reflection?: string | null;
        notes?: string | null;
        imageUrl?: string | null;
        logType: string;
    } | null>(null);

    const morningHabits = useMemo(() => habits.filter(h => h.ritualType === "MORNING").sort((a, b) => a.orderIndex - b.orderIndex), [habits]);
    const nightHabits = useMemo(() => habits.filter(h => h.ritualType === "NIGHT").sort((a, b) => a.orderIndex - b.orderIndex), [habits]);
    const otherHabits = habits.filter(h => h.ritualType === "OTHER" || !h.ritualType);
    const todayUTC = useMemo(() => getVirtualTodayUTC(), []);
    const hasShownMessages = useRef(false);

    const handleStartRitual = (type: RitualType, force: boolean = false) => {
        const ritualHabits = type === "MORNING" ? morningHabits : nightHabits;
        if (ritualHabits.length === 0) {
            toast.error(`No habits in your ${type.toLowerCase()} ritual.`);
            return;
        }

        const status = getRitualDayStatus(ritualHabits, todayUTC);

        if (status === "paused") {
            toast.error(`${type === "MORNING" ? "Morning" : "Night"} ritual is paused for today.`);
            return;
        }

        if (status === "full" && !force) {
            setPendingRitualType(type);
            setIsRestartDrawerOpen(true);
            return;
        }

        startGlobalRitual({
            productId: product.id,
            type,
            habits: ritualHabits.map(habit => ({
                id: habit.id,
                title: habit.title,
                description: habit.description,
                duration: habit.duration
            }))
        });
    };

    // Messaging System (Phase 5)
    useEffect(() => {
        if (hasShownMessages.current) return;

        const checkMessages = () => {
            // 1. Milestones
            if (product.currentStreak === 7) {
                toast("7 days with yourself", { icon: "✨", description: "You're showing up. Keep going." });
            } else if (product.currentStreak === 21) {
                toast("21 days of showing up", { icon: "🔥", description: "This is becoming part of who you are." });
            }

            // 2. Weekly Reflection (On Sundays)
            const ist = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
            if (ist.getDay() === 0) {
                toast("What did this week feel like?", { icon: "🪞" });
            }

            hasShownMessages.current = true;
        };

        const timer = setTimeout(checkMessages, 1000);
        return () => clearTimeout(timer);
    }, [product.currentStreak]);

    return (
        <div className="flex flex-col h-full relative overflow-hidden bg-transparent">
             {/* Background Decorative Shapes */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl transform translate-x-20 -translate-y-20 pointer-events-none" />
             <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl transform -translate-x-10 translate-y-10 pointer-events-none" />

             {/* Local Action Bar */}
             <div className="px-6 py-2 flex items-center justify-end gap-3 z-10">
                <button 
                    onClick={() => setIsResetDrawerOpen(true)}
                    className="w-10 h-10 rounded-full bg-white/40 backdrop-blur-md shadow-sm flex items-center justify-center text-[#556B5A] border border-white/50 hover:bg-white/60 transition-colors"
                >
                    <RotateCcw className="w-4 h-4" />
                </button>
                <button 
                    onClick={() => setViewMode(prev => prev === 'cards' ? 'history' : 'cards')}
                    className="w-10 h-10 rounded-full bg-white/40 backdrop-blur-md shadow-sm flex items-center justify-center text-[#556B5A] border border-white/50 hover:bg-white/60 transition-colors"
                >
                    {viewMode === 'cards' ? <Calendar className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                </button>
                {habits.length < 10 && (
                    <button 
                        onClick={() => setIsAddDrawerOpen(true)}
                        className="w-10 h-10 rounded-full bg-[#556B5A] shadow-sm flex items-center justify-center text-white hover:bg-[#445849] transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                )}
             </div>

             {/* Main Content */}
             <main className="flex-1 p-4 pt-2 z-10 overflow-y-auto no-scrollbar pb-32">
                 {viewMode === 'cards' ? (
                     <div className="flex flex-col gap-6">
                        {/* Medallion Status */}
                        <MedallionStreak habits={habits} product={product} />

                        {/* Rituals Section */}
                        {(morningHabits.length > 0 || nightHabits.length > 0) && (
                            <div className="grid grid-cols-2 gap-3">
                                {morningHabits.length > 0 && (
                                    <RitualCard 
                                        type="MORNING" 
                                        habits={morningHabits} 
                                        onPause={() => setRitualPauseType("MORNING")}
                                        onManage={() => setRitualManageType("MORNING")}
                                        onBegin={() => handleStartRitual("MORNING")} 
                                    />
                                )}
                                {nightHabits.length > 0 && (
                                    <RitualCard 
                                        type="NIGHT" 
                                        habits={nightHabits} 
                                        onPause={() => setRitualPauseType("NIGHT")}
                                        onManage={() => setRitualManageType("NIGHT")}
                                        onBegin={() => handleStartRitual("NIGHT")} 
                                    />
                                )}
                            </div>
                        )}

                        {/* Other Habits Grid */}
                        <div className="grid grid-cols-2 gap-3 w-full">
                            {otherHabits.map(habit => (
                                <HabitCard key={habit.id} habit={habit} router={router} />
                            ))}
                            {habits.length < 10 && (
                                <motion.button 
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setIsAddDrawerOpen(true)}
                                    className="bg-white/40 backdrop-blur-md border-2 border-dashed border-white/50 rounded-[40px] p-4 flex flex-col items-center justify-center aspect-[2/3] group hover:border-[#556B5A]/20 hover:bg-white/60 transition-all shadow-sm"
                                >
                                    <div className="w-12 h-12 rounded-full bg-white/60 flex items-center justify-center mb-3 text-[#556B5A]/30 group-hover:text-[#556B5A]/50 transition-colors">
                                        <Plus className="w-6 h-6" />
                                    </div>
                                    <span className="text-[10px] font-bold text-[#556B5A]/30 group-hover:text-[#556B5A]/50 uppercase tracking-widest text-center">Add Habit</span>
                                </motion.button>
                            )}
                        </div>
                     </div>
                 ) : (
                     <div className="flex flex-col gap-4 w-full">
                        {morningHabits.length > 0 && (
                            <RitualHistoryCard type="MORNING" habits={morningHabits} setViewLogData={setViewLogData} />
                        )}
                        {nightHabits.length > 0 && (
                            <RitualHistoryCard type="NIGHT" habits={nightHabits} setViewLogData={setViewLogData} />
                        )}
                        {otherHabits.map(habit => (
                            <HabitHistoryCard key={habit.id} habit={habit} optimisticLogs={habit.logs} setViewLogData={setViewLogData} />
                        ))}
                     </div>
                 )}
             </main>

             <AddHabitDrawer 
                productId={product.id} 
                isOpen={isAddDrawerOpen} 
                onClose={() => setIsAddDrawerOpen(false)} 
                router={router}
             />

             <ResetCharmDrawer 
                productId={product.id} 
                isOpen={isResetDrawerOpen} 
                onClose={() => setIsResetDrawerOpen(false)} 
                router={router}
             />

             <RitualRestartDrawer
                isOpen={isRestartDrawerOpen}
                onClose={() => {
                    setIsRestartDrawerOpen(false);
                    setPendingRitualType(null);
                }}
                onConfirm={() => {
                    if (pendingRitualType) {
                        handleStartRitual(pendingRitualType, true);
                        setIsRestartDrawerOpen(false);
                        setPendingRitualType(null);
                    }
                }}
                type={pendingRitualType}
             />

             <RitualPauseDrawer
                productId={product.id}
                ritualType={ritualPauseType}
                habits={ritualPauseType === "MORNING" ? morningHabits : nightHabits}
                isOpen={!!ritualPauseType}
                onClose={() => setRitualPauseType(null)}
                router={router}
             />

             <RitualManageDrawer
                productId={product.id}
                ritualType={ritualManageType}
                habits={ritualManageType === "MORNING" ? morningHabits : nightHabits}
                isOpen={!!ritualManageType}
                onClose={() => setRitualManageType(null)}
                onBegin={() => {
                    if (ritualManageType) {
                        setRitualManageType(null);
                        handleStartRitual(ritualManageType);
                    }
                }}
                onPause={() => {
                    if (ritualManageType) {
                        setRitualManageType(null);
                        setRitualPauseType(ritualManageType);
                    }
                }}
                router={router}
             />

             <ReflectionLogDrawer
                data={viewLogData}
                onClose={() => setViewLogData(null)}
             />
        </div>
    );
}

function MedallionStreak({ habits, product }: { habits: HabitWithLogs[], product: Product }) {
    const todayUTC = getVirtualTodayUTC();

    const morningHabits = habits.filter(h => h.ritualType === "MORNING");
    const nightHabits = habits.filter(h => h.ritualType === "NIGHT");

    const getDayStatus = (utc: number) => {
        const morningStatus = morningHabits.length > 0 ? getRitualDayStatus(morningHabits, utc) : "missed";
        const nightStatus = nightHabits.length > 0 ? getRitualDayStatus(nightHabits, utc) : "missed";

        if (
            habits.length > 0 &&
            (morningHabits.length === 0 || morningStatus === "paused") &&
            (nightHabits.length === 0 || nightStatus === "paused")
        ) {
            return "paused";
        }
        if ((morningHabits.length === 0 || morningStatus === "full") && (nightHabits.length === 0 || nightStatus === "full")) return "full";
        if (morningStatus === "full" || morningStatus === "partial" || nightStatus === "full" || nightStatus === "partial") return "partial";
        return "missed";
    };

    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(todayUTC);
        d.setDate(d.getDate() - (6 - i));
        const utc = d.getTime();
        return {
            utc,
            status: getDayStatus(utc),
            label: d.toLocaleDateString('en-US', { weekday: 'narrow' })
        };
    });

    return (
        <div className="bg-white/40 backdrop-blur-xl rounded-[40px] p-6 shadow-sm border border-white/50 relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-black text-[#556B5A] uppercase tracking-tighter leading-none mb-1">
                        {product.name || "Daily Rituals"}
                    </h2>
                    <span className="text-[10px] font-black text-[#556B5A]/40 uppercase tracking-widest">
                        7-Day Overview
                    </span>
                </div>
                <div className="flex items-center gap-1.5 bg-orange-50/50 backdrop-blur-sm px-4 py-2 rounded-2xl border border-orange-100/50">
                    <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
                    <span className="text-xl font-black text-orange-600">{product.currentStreak}</span>
                </div>
            </div>

            <div className="flex justify-between items-center px-1">
                {last7Days.map((day, i) => (
                    <div key={i} className="flex flex-col items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                            day.status === 'full' ? 'bg-[#7C9A86] text-white shadow-lg shadow-[#7C9A86]/20' :
                            day.status === 'partial' ? 'bg-[#7C9A86]/30 text-[#556B5A]' :
                            day.status === 'paused' ? 'bg-blue-100/50 backdrop-blur-sm text-blue-500 border border-blue-200/50' :
                            'bg-[#F6F2EC]/50 text-[#556B5A]/20 border border-white/20'
                        }`}>
                            {day.status === 'full' && <Check className="w-5 h-5" strokeWidth={3} />}
                            {day.status === 'partial' && <div className="w-4 h-4 rounded-full border-2 border-[#7C9A86] border-r-transparent animate-spin-slow" />}
                            {day.status === 'paused' && <Pause className="w-4 h-4" />}
                            {day.status === 'missed' && <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                        </div>
                        <span className="text-[10px] font-black text-[#556B5A]/30 uppercase">{day.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function RitualCard({ type, habits, onBegin, onPause, onManage }: { type: RitualType, habits: HabitWithLogs[], onBegin: () => void, onPause: () => void, onManage: () => void }) {
    const todayUTC = useMemo(() => getVirtualTodayUTC(), []);
    const todayStatus = useMemo(() => getRitualDayStatus(habits, todayUTC), [habits, todayUTC]);
    const isDone = todayStatus === "full";
    const isPartial = todayStatus === "partial";
    const isPaused = todayStatus === "paused";

    // Calculate actual progress percentage
    const doneCount = useMemo(() => habits.filter(h => {
        const log = getLatestLogForDay(h.logs, todayUTC);
        return log?.logType === "DONE";
    }).length, [habits, todayUTC]);
    const progressPercent = habits.length > 0 ? (doneCount / habits.length) * 100 : 0;

    const accentClasses = type === "MORNING"
        ? {
            surface: isDone ? "bg-orange-500 border-orange-500 text-white" : "bg-white/90 border-white/50 text-[#556B5A]",
            soft: "bg-orange-50/90 text-orange-500",
            badge: "bg-orange-50/90 text-orange-600 border-orange-100/50"
        }
        : {
            surface: isDone ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white/90 border-white/50 text-[#556B5A]",
            soft: "bg-indigo-50/90 text-indigo-500",
            badge: "bg-indigo-50/90 text-indigo-600 border-indigo-100/50"
        };

    return (
        <motion.div
            whileTap={{ scale: 0.98 }}
            className={`relative p-5 rounded-[40px] flex flex-col items-center justify-center aspect-[4/5.5] shadow-sm border overflow-hidden group ${accentClasses.surface}`}
        >
            {/* Top Actions */}
            <div className="absolute left-3 top-3 z-10">
                <button
                    onClick={(event) => {
                        event.stopPropagation();
                        onPause();
                    }}
                    className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-all ${isDone ? "bg-white/20 text-white" : "bg-white/60 backdrop-blur-md text-[#556B5A]/50 hover:bg-white/80 border border-white/50"}`}
                >
                    <Pause className="w-4 h-4" />
                </button>
            </div>

            <div className="absolute right-3 top-3 z-10">
                <button
                    onClick={(event) => {
                        event.stopPropagation();
                        onManage();
                    }}
                    className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-all ${isDone ? "bg-white/20 text-white" : "bg-[#556B5A] text-white hover:bg-[#445849]"}`}
                >
                    <Pencil className="w-4 h-4" />
                </button>
            </div>

            {/* Central Action Button (Similar to HabitCard) */}
            <div className="relative flex items-center justify-center w-full max-w-[100px] aspect-square mb-4 mt-4">
                <svg 
                    className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none z-0"
                    viewBox="0 0 100 100"
                >
                    <circle cx="50" cy="50" r="46" fill="none" stroke={isDone ? "rgba(255,255,255,0.2)" : "rgba(85, 107, 90, 0.05)"} strokeWidth="6" />
                    {!isDone && isPartial && (
                        <motion.circle
                            cx="50" cy="50" r="46" fill="none"
                            stroke={type === "MORNING" ? "#F97316" : "#4F46E5"}
                            strokeWidth="6" strokeLinecap="round" pathLength="100"
                            animate={{ strokeDasharray: `${progressPercent} 100` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                        />
                    )}
                </svg>

                <button
                    onClick={onBegin}
                    className={`relative w-[80%] h-[80%] rounded-full flex items-center justify-center transition-all shadow-xl active:scale-95 z-10 shrink-0 ${
                        isDone 
                        ? 'bg-white text-[#556B5A] hover:bg-white/90'
                        : 'bg-white/60 backdrop-blur-md text-[#556B5A] hover:bg-white/80 border border-white/50'
                    }`}
                >
                    {isDone ? (
                        <Check className="w-8 h-8" strokeWidth={3} />
                    ) : (
                        type === "MORNING" ? <Sun className="w-8 h-8 text-orange-500" /> : <Moon className="w-8 h-8 text-indigo-400" />
                    )}
                </button>
            </div>

            <div className="text-center">
                <h3 className="font-black text-xs uppercase tracking-widest mb-1">{type} Ritual</h3>
                <div className={`text-[10px] font-bold opacity-40 uppercase tracking-tighter ${isDone ? "text-white" : ""}`}>
                    {isDone ? "Completed" : isPaused ? "Paused Today" : (isPartial ? "In Progress" : `${habits.length} Habits`)}
                </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <div className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${isDone ? "bg-white/15 text-white border-white/20" : accentClasses.badge}`}>
                    {habits.length} {habits.length === 1 ? "Task" : "Tasks"}
                </div>
            </div>
        </motion.div>
    );
}

function RitualPauseDrawer({
    productId,
    ritualType,
    habits,
    isOpen,
    onClose,
    router
}: {
    productId: string;
    ritualType: RitualType | null;
    habits: HabitWithLogs[];
    isOpen: boolean;
    onClose: () => void;
    router: any;
}) {
    const [isSaving, setIsSaving] = useState(false);

    const handlePause = async (logType: Exclude<HabitLogType, "DONE">) => {
        if (!ritualType) return;

        setIsSaving(true);
        try {
            const result = await pauseRitual(productId, ritualType, logType);
            if (result.success) {
                toast.success(`${ritualType === "MORNING" ? "Morning" : "Night"} ritual paused for today.`);
                onClose();
                router.refresh();
            } else {
                toast.error(result.error || "Failed to pause ritual");
            }
        } catch (error) {
            toast.error("Failed to pause ritual");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Drawer repositionInputs={true} open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DrawerContent className="bg-[#F6F2EC]/45 backdrop-blur-xl border-t border-white/30 font-[Outfit]">
                <DrawerHeader className="sr-only">
                    <DrawerTitle>Pause Ritual</DrawerTitle>
                    <DrawerDescription>Pause every task in this ritual for today.</DrawerDescription>
                </DrawerHeader>
                <div className="p-6 pb-12 relative overflow-hidden">
                    {/* Background Decorative Shapes */}
                    <div className="absolute top-20 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute bottom-20 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />

                    <div className="text-center mb-6 relative z-10">
                        <h3 className="text-xl font-bold text-[#556B5A]">{ritualType === "MORNING" ? "Pause morning ritual?" : "Pause night ritual?"}</h3>
                        <p className="text-[#556B5A]/60 text-sm mt-1 px-4">
                            This will apply the same pause reason to all {habits.length} tasks in this ritual for today.
                        </p>
                    </div>
                    <div className="mb-6 flex flex-wrap justify-center gap-2 relative z-10">
                        {habits.map(habit => (
                            <span key={habit.id} className="rounded-full bg-white/40 backdrop-blur-md px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#556B5A]/60 shadow-sm border border-white/50">
                                {habit.title}
                            </span>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3 relative z-10">
                        {RITUAL_PAUSE_OPTIONS.map(option => (
                            <motion.button
                                key={option.id}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handlePause(option.id)}
                                disabled={isSaving}
                                className="bg-white/60 backdrop-blur-md p-5 rounded-[24px] flex flex-col items-center justify-center gap-2 hover:bg-white/80 transition-colors border border-white/50 active:border-white/80 disabled:opacity-50 shadow-sm"
                            >
                                <option.icon className="w-6 h-6 text-[#556B5A]/70" />
                                <span className="text-xs font-bold text-[#556B5A]">{option.label}</span>
                            </motion.button>
                        ))}
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
}

function RitualManageDrawer({
    productId,
    ritualType,
    habits,
    isOpen,
    onClose,
    onBegin,
    onPause,
    router
}: {
    productId: string;
    ritualType: RitualType | null;
    habits: HabitWithLogs[];
    isOpen: boolean;
    onClose: () => void;
    onBegin: () => void;
    onPause: () => void;
    router: any;
}) {
    const [isEditMode, setIsEditMode] = useState(false);
    const [draftHabits, setDraftHabits] = useState<EditableRitualHabit[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [addMode, setAddMode] = useState<"template" | "custom">("template");
    const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
    const [customTitle, setCustomTitle] = useState("");
    const [customDuration, setCustomDuration] = useState(60);
    const [customTarget, setCustomTarget] = useState(66);

    useEffect(() => {
        if (isOpen) {
            setDraftHabits(habits.map(buildEditableHabit).sort((a, b) => a.orderIndex - b.orderIndex));
        } else {
            setIsEditMode(false);
            setExpandedCategoryId(null);
            setAddMode("template");
            setCustomTitle("");
            setCustomDuration(60);
            setCustomTarget(66);
        }
    }, [habits, isOpen]);

    if (!ritualType) return null;

    const ritualName = ritualType === "MORNING" ? "Morning Ritual" : "Night Ritual";
    const ritualStatus = getRitualDayStatus(habits, getVirtualTodayUTC());
    const recentDays = Array.from({ length: 7 }, (_, index) => {
        const utcDate = getVirtualTodayUTC() - ((6 - index) * DAY_MS);
        return {
            utcDate,
            status: getRitualDayStatus(habits, utcDate)
        };
    });

    const moveHabit = (clientId: string, direction: -1 | 1) => {
        setDraftHabits(prev => {
            const currentIndex = prev.findIndex(habit => habit.clientId === clientId);
            const nextIndex = currentIndex + direction;
            if (currentIndex === -1 || nextIndex < 0 || nextIndex >= prev.length) return prev;
            const next = [...prev];
            const [item] = next.splice(currentIndex, 1);
            next.splice(nextIndex, 0, item);
            return normalizeRitualDraft(next);
        });
    };

    const updateDraftHabit = (clientId: string, patch: Partial<EditableRitualHabit>) => {
        setDraftHabits(prev => prev.map(habit => habit.clientId === clientId ? { ...habit, ...patch } : habit));
    };

    const removeDraftHabit = (clientId: string) => {
        setDraftHabits(prev => normalizeRitualDraft(prev.filter(habit => habit.clientId !== clientId)));
    };

    const addTemplateHabit = (categoryId: string, levelNum: number) => {
        const coreHabit = CORE_HABITS.find(habit => habit.id === categoryId);
        const level = coreHabit?.levels.find(item => item.level === levelNum);
        if (!coreHabit || !level) return;

        setDraftHabits(prev => normalizeRitualDraft([
            ...prev,
            {
                clientId: createClientId(),
                title: level.description,
                description: `Level ${level.level}: ${level.duration} • ${level.trigger}`,
                focusArea: coreHabit.id,
                duration: parseDurationToSeconds(level.duration),
                targetDays: 66,
                orderIndex: prev.length
            }
        ]));
        setExpandedCategoryId(null);
    };

    const addCustomHabit = () => {
        if (!customTitle.trim()) return;

        setDraftHabits(prev => normalizeRitualDraft([
            ...prev,
            {
                clientId: createClientId(),
                title: customTitle.trim(),
                description: "Custom ritual task",
                focusArea: "custom",
                duration: customDuration,
                targetDays: customTarget,
                orderIndex: prev.length
            }
        ]));
        setCustomTitle("");
        setCustomDuration(60);
        setCustomTarget(66);
    };

    const handleSave = async () => {
        const normalized = normalizeRitualDraft(draftHabits);
        if (normalized.some(habit => !habit.title)) {
            toast.error("Each ritual task needs a title.");
            return;
        }

        setIsSaving(true);
        try {
            const result = await updateRitualHabits(
                productId,
                ritualType,
                normalized.map(({ clientId, orderIndex, ...habit }) => habit)
            );

            if (result.success) {
                toast.success(`${ritualName} updated.`);
                setIsEditMode(false);
                router.refresh();
            } else {
                toast.error(result.error || "Failed to update ritual");
            }
        } catch (error) {
            toast.error("Failed to update ritual");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Drawer repositionInputs={true} open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DrawerContent className="bg-[#F6F2EC]/45 backdrop-blur-xl border-t border-white/30 font-[Outfit] max-h-[96dvh]">
                <DrawerHeader className="sr-only">
                    <DrawerTitle>{ritualName}</DrawerTitle>
                    <DrawerDescription>Review history and manage every task in this ritual.</DrawerDescription>
                </DrawerHeader>
                <div className="p-6 pb-20 overflow-y-auto no-scrollbar relative">
                    {/* Background Decorative Shapes */}
                    <div className="absolute top-20 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute bottom-40 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />

                    <div className="mb-8 flex items-center justify-between px-2 relative z-10">
                        <div>
                            <h3 className="text-2xl font-black text-[#556B5A] uppercase tracking-tighter leading-none mb-1">{ritualName}</h3>
                            <span className="text-[10px] font-black text-[#556B5A]/40 uppercase tracking-widest">Manage & History</span>
                        </div>
                        <button
                            onClick={() => setIsEditMode(prev => !prev)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isEditMode ? "bg-[#556B5A] text-white" : "bg-white/40 backdrop-blur-md text-[#556B5A] shadow-sm border border-white/50"}`}
                        >
                            {isEditMode ? <X className="w-5 h-5" /> : <Pencil className="w-4 h-4" />}
                        </button>
                    </div>

                    <div className="relative z-10">
                    {!isEditMode ? (
                        <>
                            <div className="bg-white/40 backdrop-blur-xl p-6 rounded-[32px] shadow-sm mb-6 border border-white/50">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h4 className="text-[10px] font-black text-[#556B5A]/40 uppercase tracking-widest mb-1">Today</h4>
                                        <p className="text-lg font-bold text-[#556B5A]">{ritualStatus === "full" ? "Completed" : ritualStatus === "paused" ? "Paused for today" : ritualStatus === "partial" ? "In progress" : "Ready to begin"}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={onPause} className="h-10 rounded-full bg-white/40 backdrop-blur-md px-4 text-xs font-black uppercase tracking-widest text-[#556B5A] border border-white/50">
                                            Pause
                                        </button>
                                        <button onClick={onBegin} className="h-10 rounded-full bg-[#556B5A] px-4 text-xs font-black uppercase tracking-widest text-white shadow-sm">
                                            Begin
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-7 gap-2">
                                    {recentDays.map(day => (
                                        <div key={day.utcDate} className="flex flex-col items-center gap-2">
                                            <div className={`w-full aspect-square rounded-2xl flex items-center justify-center border ${
                                                day.status === "full" ? "bg-[#7C9A86] border-[#7C9A86] text-white" :
                                                day.status === "partial" ? "bg-[#7C9A86]/25 border-[#7C9A86]/20 text-[#556B5A]" :
                                                day.status === "paused" ? "bg-blue-100/50 border-blue-200/50 text-blue-500" :
                                                "bg-[#F6F2EC]/50 border-white/20 text-[#556B5A]/20"
                                            }`}>
                                                {day.status === "full" && <Check className="w-4 h-4" strokeWidth={3} />}
                                                {day.status === "partial" && <div className="w-2.5 h-2.5 rounded-full bg-current" />}
                                                {day.status === "paused" && <Pause className="w-4 h-4" />}
                                                {day.status === "missed" && <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-[#556B5A]/30">
                                                {new Date(day.utcDate).toLocaleDateString("en-US", { weekday: "narrow" })}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white/40 backdrop-blur-xl p-6 rounded-[32px] shadow-sm mb-6 border border-white/50">
                                <h4 className="text-[10px] font-black text-[#556B5A]/40 uppercase tracking-widest mb-4">Ritual Tasks</h4>
                                <div className="space-y-3">
                                    {habits.map((habit, index) => (
                                        <div key={habit.id} className="flex items-center justify-between rounded-[24px] bg-white/40 backdrop-blur-md px-4 py-4 border border-white/50">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#556B5A]/30">{index + 1}</span>
                                                    <span className="text-sm font-bold text-[#556B5A] truncate">{habit.title}</span>
                                                </div>
                                                <p className="text-xs text-[#556B5A]/50 truncate font-medium">{habit.description || "No description"}</p>
                                            </div>
                                            <div className="text-right ml-4 shrink-0">
                                                <p className="text-sm font-black text-[#556B5A]">{habit.duration || 60}s</p>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-[#556B5A]/30">{habit.currentStreak}/{habit.targetDays}d</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white/40 backdrop-blur-xl p-6 rounded-[32px] shadow-sm border border-white/50">
                                <h4 className="text-[10px] font-black text-[#556B5A]/40 uppercase tracking-widest mb-4">Recent History</h4>
                                <div className="space-y-4">
                                    {recentDays.slice().reverse().map(day => (
                                        <div key={day.utcDate} className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-bold text-[#556B5A]">{getUTCDateLabel(day.utcDate)}</p>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-[#556B5A]/30">{day.status}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                {habits.map(habit => {
                                                    const log = getLatestLogForDay(habit.logs, day.utcDate);
                                                    return (
                                                        <span
                                                            key={`${habit.id}-${day.utcDate}`}
                                                            className={`h-8 min-w-8 rounded-full px-2 flex items-center justify-center text-[9px] font-black uppercase tracking-widest shadow-sm border ${
                                                                log?.logType === "DONE" ? "bg-[#7C9A86]/20 border-[#7C9A86]/20 text-[#556B5A]" :
                                                                log ? "bg-blue-100/50 border-blue-200/50 text-blue-600" :
                                                                "bg-[#F6F2EC]/50 border-white/20 text-[#556B5A]/20"
                                                            }`}
                                                        >
                                                            {log?.logType === "DONE" ? "✓" : log ? "P" : "·"}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-white/40 backdrop-blur-xl p-6 rounded-[32px] shadow-sm border border-white/50">
                                <h4 className="text-[10px] font-black text-[#556B5A]/40 uppercase tracking-widest mb-4">Edit Tasks</h4>
                                <div className="space-y-4">
                                    {draftHabits.map((habit, index) => (
                                        <div key={habit.clientId} className="rounded-[28px] bg-white/40 backdrop-blur-md p-4 border border-white/50 shadow-sm">
                                            <div className="mb-4 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-10 h-10 rounded-full bg-white/60 backdrop-blur-md flex items-center justify-center text-[#556B5A]/40 shadow-sm border border-white/50">
                                                        <GripVertical className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-[#556B5A]/30">Task {index + 1}</p>
                                                        <p className="text-sm font-bold text-[#556B5A]">{habit.focusArea === "custom" ? "Custom" : habit.focusArea}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => moveHabit(habit.clientId, -1)} disabled={index === 0} className="w-9 h-9 rounded-full bg-white/60 text-[#556B5A] shadow-sm border border-white/50 disabled:opacity-30">
                                                        <ChevronUp className="w-4 h-4 mx-auto" />
                                                    </button>
                                                    <button onClick={() => moveHabit(habit.clientId, 1)} disabled={index === draftHabits.length - 1} className="w-9 h-9 rounded-full bg-white/60 text-[#556B5A] shadow-sm border border-white/50 disabled:opacity-30">
                                                        <ChevronDown className="w-4 h-4 mx-auto" />
                                                    </button>
                                                    <button onClick={() => removeDraftHabit(habit.clientId)} className="w-9 h-9 rounded-full bg-red-50/50 text-red-500 border border-red-100/50">
                                                        <Trash2 className="w-4 h-4 mx-auto" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <input
                                                    type="text"
                                                    value={habit.title}
                                                    onChange={(event) => updateDraftHabit(habit.clientId, { title: event.target.value })}
                                                    className="w-full rounded-2xl border border-white/50 bg-white/60 px-4 py-3 text-[#556B5A] font-bold outline-none placeholder:text-[#556B5A]/20"
                                                    placeholder="Task title"
                                                />
                                                <input
                                                    type="text"
                                                    value={habit.description}
                                                    onChange={(event) => updateDraftHabit(habit.clientId, { description: event.target.value })}
                                                    className="w-full rounded-2xl border border-white/50 bg-white/60 px-4 py-3 text-sm text-[#556B5A] outline-none font-medium placeholder:text-[#556B5A]/20"
                                                    placeholder="Short description"
                                                />
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="relative">
                                                        <span className="absolute left-4 top-1 text-[8px] font-black text-[#556B5A]/30 uppercase">Secs</span>
                                                        <input
                                                            type="number"
                                                            min={15}
                                                            step={15}
                                                            value={habit.duration}
                                                            onChange={(event) => updateDraftHabit(habit.clientId, { duration: parseInt(event.target.value) || 60 })}
                                                            className="w-full rounded-2xl border border-white/50 bg-white/60 px-4 pt-5 pb-2 text-[#556B5A] font-bold outline-none"
                                                        />
                                                    </div>
                                                    <div className="relative">
                                                        <span className="absolute left-4 top-1 text-[8px] font-black text-[#556B5A]/30 uppercase">Goal</span>
                                                        <select
                                                            value={habit.targetDays}
                                                            onChange={(event) => updateDraftHabit(habit.clientId, { targetDays: parseInt(event.target.value) })}
                                                            className="w-full rounded-2xl border border-white/50 bg-white/60 px-4 pt-5 pb-2 text-[#556B5A] font-bold outline-none appearance-none"
                                                        >
                                                            <option value={21}>21 Days</option>
                                                            <option value={66}>66 Days</option>
                                                            <option value={100}>100 Days</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white/40 backdrop-blur-xl p-6 rounded-[32px] shadow-sm border border-white/50">
                                <div className="mb-6 flex gap-2">
                                    <button onClick={() => setAddMode("template")} className={`flex-1 h-12 rounded-2xl px-4 text-xs font-black uppercase tracking-widest transition-all ${addMode === "template" ? "bg-[#556B5A] text-white shadow-lg" : "bg-white/40 backdrop-blur-md text-[#556B5A] border border-white/50"}`}>
                                        Templates
                                    </button>
                                    <button onClick={() => setAddMode("custom")} className={`flex-1 h-12 rounded-2xl px-4 text-xs font-black uppercase tracking-widest transition-all ${addMode === "custom" ? "bg-[#556B5A] text-white shadow-lg" : "bg-white/40 backdrop-blur-md text-[#556B5A] border border-white/50"}`}>
                                        Custom
                                    </button>
                                </div>

                                {addMode === "template" ? (
                                    <div className="space-y-3">
                                        {CORE_HABITS.map(category => (
                                            <div key={category.id} className="overflow-hidden rounded-[24px] border border-white/30 bg-white/40 backdrop-blur-md">
                                                <button
                                                    onClick={() => setExpandedCategoryId(prev => prev === category.id ? null : category.id)}
                                                    className="flex w-full items-center justify-between p-4"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-2xl">{category.icon}</span>
                                                        <div className="text-left">
                                                            <h5 className="font-bold text-[#556B5A]">{category.title}</h5>
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-[#556B5A]/30">{category.levels.length} levels</p>
                                                        </div>
                                                    </div>
                                                    {expandedCategoryId === category.id ? <ChevronUp className="w-4 h-4 text-[#556B5A]/40" /> : <ChevronDown className="w-4 h-4 text-[#556B5A]/40" />}
                                                </button>
                                                <AnimatePresence>
                                                    {expandedCategoryId === category.id && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden px-3 pb-3 space-y-2"
                                                        >
                                                            {category.levels.map(level => (
                                                                <button
                                                                    key={level.level}
                                                                    onClick={() => addTemplateHabit(category.id, level.level)}
                                                                    className="w-full rounded-2xl bg-white/60 backdrop-blur-md px-4 py-4 text-left shadow-sm border border-white/30 hover:bg-[#556B5A] hover:text-white hover:border-[#556B5A] transition-all group"
                                                                >
                                                                    <p className="text-sm font-bold leading-tight group-hover:text-white">{level.description}</p>
                                                                    <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-[#556B5A]/30 group-hover:text-white/60">{level.duration} • {level.trigger}</p>
                                                                </button>
                                                            ))}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            value={customTitle}
                                            onChange={(event) => setCustomTitle(event.target.value)}
                                            className="w-full rounded-2xl border border-white/50 bg-white/60 px-4 py-4 text-[#556B5A] font-bold outline-none placeholder:text-[#556B5A]/20"
                                            placeholder="Task name"
                                        />
                                        <div className="grid grid-cols-2 gap-3">
                                            <input
                                                type="number"
                                                min={15}
                                                step={15}
                                                value={customDuration}
                                                onChange={(event) => setCustomDuration(parseInt(event.target.value) || 60)}
                                                className="w-full rounded-2xl border border-white/50 bg-white/60 px-4 py-4 text-[#556B5A] font-bold outline-none"
                                            />
                                            <select
                                                value={customTarget}
                                                onChange={(event) => setCustomTarget(parseInt(event.target.value))}
                                                className="w-full rounded-2xl border border-white/50 bg-white/60 px-4 py-4 text-[#556B5A] font-bold outline-none appearance-none"
                                            >
                                                <option value={21}>21 Days</option>
                                                <option value={66}>66 Days</option>
                                                <option value={100}>100 Days</option>
                                            </select>
                                        </div>
                                        <button onClick={addCustomHabit} className="w-full rounded-2xl bg-[#556B5A] py-4 text-sm font-bold text-white shadow-lg shadow-[#556B5A]/20 active:scale-95 transition-all">
                                            Add Custom Task
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="w-full rounded-[24px] bg-[#556B5A] py-5 text-sm font-bold text-white shadow-xl shadow-[#556B5A]/20 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 transition-all"
                            >
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4" /> Save Ritual Changes</>}
                            </button>
                        </div>
                    )}
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
}

function ResetCharmDrawer({ productId, isOpen, onClose, router }: { productId: string, isOpen: boolean, onClose: () => void, router: any }) {
    const [isResetting, setIsResetting] = useState(false);

    const handleReset = async () => {
        setIsResetting(true);
        try {
            const res = await resetHabitCharm(productId);
            if (res.success) {
                toast.success("Charm reset! New beginning.");
                onClose();
                router.refresh();
            } else {
                toast.error(res.error || "Failed");
            }
        } catch (e) {
            toast.error("Error");
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <Drawer repositionInputs={true} open={isOpen} onOpenChange={onClose}>
            <DrawerContent className="bg-[#F6F2EC]/45 backdrop-blur-xl border-t border-white/30 font-[Outfit]">
                <DrawerHeader className="sr-only">
                    <DrawerTitle>Reset Habit Charm</DrawerTitle>
                    <DrawerDescription>Clear all progress and start fresh with this charm.</DrawerDescription>
                </DrawerHeader>
                <div className="p-8 pb-12 flex flex-col items-center text-center relative overflow-hidden">
                    {/* Background Decorative Shapes */}
                    <div className="absolute top-10 right-0 w-32 h-32 bg-orange-100/30 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute bottom-10 left-0 w-32 h-32 bg-[#556B5A]/5 rounded-full blur-2xl pointer-events-none" />

                    <div className="w-20 h-20 bg-orange-100/50 backdrop-blur-md rounded-full flex items-center justify-center mb-6 text-orange-600 shadow-sm border border-orange-200/50 relative z-10">
                        <AlertTriangle className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-bold text-[#556B5A] mb-2 relative z-10">Reset This Charm?</h3>
                    <p className="text-[#556B5A]/60 mb-8 max-w-xs relative z-10">
                        This will archive your current streaks and logs for a fresh start. You won&apos;t see previous history, but it will be saved in our system.
                    </p>

                    <div className="flex flex-col gap-3 w-full relative z-10">
                        <button 
                            onClick={handleReset}
                            disabled={isResetting}
                            className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all"
                        >
                            {isResetting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Yes, Reset Everything"}
                        </button>
                        <button 
                            onClick={onClose}
                            className="w-full py-3 rounded-xl font-bold text-[#556B5A]/40 hover:bg-white/40 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
}

function AddHabitDrawer({ productId, isOpen, onClose, router }: { productId: string, isOpen: boolean, onClose: () => void, router: any }) {
    const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
    const [selectedHabit, setSelectedHabit] = useState<any>(null);
    const [mode, setMode] = useState<'template' | 'custom'>('template');
    
    const [customTitle, setCustomName] = useState("");
    const [customTarget, setCustomTarget] = useState(66);
    const [isSaving, setIsSaving] = useState(false);

    // Reset state when drawer closes
    useEffect(() => {
        if (!isOpen) {
            setExpandedCategoryId(null);
            setSelectedHabit(null);
            setMode('template');
            setCustomName("");
        }
    }, [isOpen]);

    const toggleCategory = (id: string) => {
        setExpandedCategoryId(expandedCategoryId === id ? null : id);
    };

    const handleSelectHabit = (categoryId: string, levelNum: number) => {
        const isCurrentlySelected = selectedHabit?.id === categoryId && selectedHabit?.level === levelNum;
        
        if (isCurrentlySelected) {
            setSelectedHabit(null);
            return;
        }

        const core = CORE_HABITS.find(h => h.id === categoryId);
        const level = core?.levels.find(l => l.level === levelNum);
        if (!core || !level) return;

        setSelectedHabit({
            id: categoryId,
            level: levelNum,
            title: level.description,
            description: `Level ${levelNum}: ${level.duration} • ${level.trigger}`
        });
    };

    const handleAdd = async () => {
        if (!selectedHabit && mode === 'template') return;
        if (mode === 'custom' && !customTitle.trim()) return;

        setIsSaving(true);
        try {
            const habitData = mode === 'template' ? {
                title: selectedHabit.title,
                description: selectedHabit.description,
                focusArea: selectedHabit.id,
                frequency: "daily",
                targetDays: 66,
            } : {
                title: customTitle.trim(),
                focusArea: "custom",
                frequency: "daily",
                targetDays: customTarget
            };

            const res = await createHabit(productId, habitData);
            if (res.success) {
                toast.success("Habit started!");
                onClose();
                router.refresh();
            } else {
                toast.error(res.error || "Failed");
            }
        } catch (e) {
            toast.error("Error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Drawer repositionInputs={true} open={isOpen} onOpenChange={onClose}>
            <DrawerContent className="bg-[#F6F2EC]/45 backdrop-blur-xl border-t border-white/30 font-[Outfit] max-h-[96dvh]">
                <div className="p-6 pb-20 overflow-y-auto no-scrollbar relative">
                    {/* Background Decorative Shapes */}
                    <div className="absolute top-20 right-0 w-32 h-32 bg-[#556B5A]/5 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute bottom-40 left-0 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none" />

                    <DrawerHeader className="px-0 text-left mb-4 relative z-10">
                        <DrawerTitle className="text-2xl font-bold text-[#556B5A]">Add New Habit</DrawerTitle>
                        <DrawerDescription>Pick a specific ritual to add to your medallion.</DrawerDescription>
                    </DrawerHeader>

                    {/* Accordion List */}
                    <div className="space-y-3 relative z-10">
                        {CORE_HABITS.map((category) => {
                            const isExpanded = expandedCategoryId === category.id;
                            const isSelected = selectedHabit?.id === category.id;

                            return (
                                <div key={category.id} className="overflow-hidden">
                                    <button
                                        onClick={() => toggleCategory(category.id)}
                                        className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all shadow-sm border ${
                                            isExpanded ? "bg-[#556B5A] border-[#556B5A] text-white shadow-md" : "bg-white/60 backdrop-blur-md border-white/50"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{category.icon}</span>
                                            <div className="text-left">
                                                <h3 className="font-bold">{category.title}</h3>
                                                {isSelected && !isExpanded && (
                                                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#7C9A86] text-[#556B5A]">
                                                        Selected
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5 text-[#556B5A]/40" />}
                                    </button>

                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="mt-2 bg-white/40 backdrop-blur-md rounded-2xl p-2 space-y-1 overflow-hidden border border-white/30"
                                            >
                                                {category.levels.map((lvl) => {
                                                    const isThisSelected = selectedHabit?.id === category.id && selectedHabit?.level === lvl.level;
                                                    return (
                                                        <button
                                                            key={lvl.level}
                                                            onClick={() => { handleSelectHabit(category.id, lvl.level); setMode('template'); }}
                                                            className={`w-full text-left p-3 rounded-xl flex flex-col gap-1 transition-colors ${
                                                                isThisSelected ? "bg-[#556B5A]/10" : "hover:bg-white/60"
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className={`text-sm font-bold ${isThisSelected ? "text-[#556B5A]" : "text-[#556B5A]/80"}`}>
                                                                    {lvl.description}
                                                                </span>
                                                                <div className={`w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-all ${
                                                                    isThisSelected ? "bg-[#556B5A] border-[#556B5A]" : "border-[#556B5A]/20"
                                                                }`}>
                                                                    {isThisSelected && <Check className="w-3 h-3 text-white" />}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[10px] font-bold text-[#556B5A]/40 uppercase tracking-tight">
                                                                <span>Lvl {lvl.level}</span>
                                                                <span>•</span>
                                                                <span>{lvl.duration}</span>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}

                        {/* Custom Option */}
                        <div className="overflow-hidden">
                            <button
                                onClick={() => { setMode('custom'); setExpandedCategoryId(expandedCategoryId === 'custom' ? null : 'custom'); }}
                                className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed transition-all shadow-sm ${
                                    expandedCategoryId === 'custom' ? "border-[#556B5A] bg-[#556B5A]/5" : "border-white/50 bg-white/40 backdrop-blur-md"
                                }`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${
                                    expandedCategoryId === 'custom' ? "bg-[#556B5A]" : "bg-white/60"
                                }`}>
                                    <Plus className={`w-5 h-5 ${expandedCategoryId === 'custom' ? "text-white" : "text-[#556B5A]"}`} />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold text-[#556B5A]">Add custom goal</h3>
                                </div>
                            </button>

                            <AnimatePresence>
                                {expandedCategoryId === 'custom' && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="mt-2 bg-white/40 backdrop-blur-md rounded-2xl p-4 shadow-sm space-y-4 overflow-hidden border border-white/30"
                                    >
                                        <div className="space-y-4">
                                            <label className="block text-[10px] font-black text-[#556B5A]/40 uppercase tracking-widest ml-1">Habit Title</label>
                                            <input
                                                type="text"
                                                value={customTitle}
                                                onChange={(e) => setCustomName(e.target.value)}
                                                placeholder="What is the ritual?"
                                                className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/30 text-[#556B5A] outline-none placeholder:text-[#556B5A]/20 font-bold"
                                            />
                                            <div>
                                                <label className="block text-[10px] font-black text-[#556B5A]/40 uppercase tracking-widest mb-2 ml-1">Daily Target</label>
                                                <select 
                                                    value={customTarget}
                                                    onChange={(e) => setCustomTarget(parseInt(e.target.value))}
                                                    className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/30 text-[#556B5A] text-sm outline-none appearance-none font-bold"
                                                >
                                                    <option value={21}>21 Days</option>
                                                    <option value={66}>66 Days</option>
                                                    <option value={100}>100 Days</option>
                                                </select>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Final Action */}
                    <div className="mt-8 relative z-10">
                        <button 
                            onClick={handleAdd}
                            disabled={isSaving || (mode === 'template' && !selectedHabit) || (mode === 'custom' && !customTitle.trim())}
                            className="w-full py-5 bg-[#7C9A86] text-[#556B5A] rounded-[24px] font-black text-lg shadow-xl shadow-[#7C9A86]/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all"
                        >
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                <>
                                    Activate Habit
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
}

function HabitHistoryCard({ habit, optimisticLogs, setViewLogData }: { habit: HabitWithLogs, optimisticLogs: HabitLog[], setViewLogData: any }) {
    const [range, setRange] = useState<7 | 30>(30);
    const today = new Date();
    // Use IST for "today" in history calculation
    const todayIST = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const pastDate = new Date(todayIST);
    pastDate.setDate(todayIST.getDate() - (range - 1));
    
    return (
        <div className="bg-white/40 backdrop-blur-xl rounded-[32px] p-5 shadow-sm border border-white/50">
            <div className="flex items-center justify-between mb-6">
                <div className="max-w-[60%]">
                    <h3 className="text-lg font-bold text-[#556B5A] truncate">{habit.title}</h3>
                    <div className="text-[10px] font-black text-[#556B5A]/40 uppercase tracking-widest">Level {habit.level}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-1.5 bg-transparent px-3 py-1 rounded-full">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-bold text-[#556B5A]">{habit.currentStreak}</span>
                    </div>
                    <div className="flex bg-white/40 backdrop-blur-md rounded-lg p-1 border border-white/30">
                        <button 
                            onClick={() => setRange(7)}
                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${range === 7 ? 'bg-[#556B5A] text-white shadow-sm' : 'text-[#556B5A]/40'}`}
                        >7D</button>
                        <button 
                            onClick={() => setRange(30)}
                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${range === 30 ? 'bg-[#556B5A] text-white shadow-sm' : 'text-[#556B5A]/40'}`}
                        >30D</button>
                    </div>
                </div>
            </div>
            <div className="overflow-x-auto no-scrollbar -mx-2 px-2">
                <ContributionGraph 
                    logs={optimisticLogs} 
                    startDate={pastDate}
                    isWeekly={range === 7}
                    habitTitle={habit.title}
                    setViewLogData={setViewLogData}
                />
            </div>
        </div>
    );
}

function RitualHistoryCard({ type, habits, setViewLogData }: { type: RitualType; habits: HabitWithLogs[]; setViewLogData: any }) {
    const [range, setRange] = useState<7 | 30>(30);
    const title = type === "MORNING" ? "Morning Ritual" : "Night Ritual";
    const accent = type === "MORNING"
        ? {
            chip: "bg-orange-50/50 text-orange-600 border-orange-100/50",
            icon: "text-orange-500",
            soft: "bg-orange-50/50 backdrop-blur-sm"
        }
        : {
            chip: "bg-indigo-50/50 text-indigo-600 border-indigo-100/50",
            icon: "text-indigo-500",
            soft: "bg-indigo-50/50 backdrop-blur-sm"
        };

    const today = new Date();
    const todayIST = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const pastDate = new Date(todayIST);
    pastDate.setDate(todayIST.getDate() - (range - 1));

    const todayUTC = getVirtualTodayUTC();
    const currentStatus = getRitualDayStatus(habits, todayUTC);
    const totalStreak = habits.reduce((max, habit) => Math.max(max, habit.currentStreak), 0);

    return (
        <div className="bg-white/40 backdrop-blur-xl rounded-[32px] p-5 shadow-sm border border-white/50">
            <div className="flex items-center justify-between mb-6">
                <div className="max-w-[60%]">
                    <div className="flex items-center gap-2 mb-1">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm ${accent.soft}`}>
                            {type === "MORNING" ? <Sun className={`w-4 h-4 ${accent.icon}`} /> : <Moon className={`w-4 h-4 ${accent.icon}`} />}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-[#556B5A] truncate">{title}</h3>
                            <div className="text-[10px] font-black text-[#556B5A]/40 uppercase tracking-widest">
                                {habits.length} {habits.length === 1 ? "task" : "tasks"} • {currentStatus}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border backdrop-blur-sm ${accent.chip}`}>
                        <Flame className={`w-4 h-4 ${accent.icon}`} />
                        <span className="text-sm font-bold">{totalStreak}</span>
                    </div>
                    <div className="flex bg-white/40 backdrop-blur-md rounded-lg p-1 border border-white/30">
                        <button
                            onClick={() => setRange(7)}
                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${range === 7 ? 'bg-[#556B5A] text-white shadow-sm' : 'text-[#556B5A]/40'}`}
                        >7D</button>
                        <button
                            onClick={() => setRange(30)}
                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${range === 30 ? 'bg-[#556B5A] text-white shadow-sm' : 'text-[#556B5A]/40'}`}
                        >30D</button>
                    </div>
                </div>
            </div>
            <div className="overflow-x-auto no-scrollbar -mx-2 px-2">
                <RitualContributionGraph habits={habits} startDate={pastDate} isWeekly={range === 7} ritualTitle={title} setViewLogData={setViewLogData} />
            </div>
        </div>
    );
}

function HabitCard({ habit, router }: { habit: HabitWithLogs, router: any }) {
    const [isLogging, setIsLogging] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showAnomaly, setShowAnomaly] = useState(false);
    const [logDrawerData, setLogDrawerData] = useState<{ isOpen: boolean, type: HabitLogType, dateStr?: string } | null>(null);
    const [upgradeData, setUpgradeData] = useState<any>(null); // { nextLevel, message }
    
    // --- OPTIMISTIC UI STATE ---
    const [optimisticLogs, setOptimisticLogs] = useState<HabitLog[]>(habit.logs);
    
    // Sync optimistic state with real data when props change
    useEffect(() => {
        setOptimisticLogs(habit.logs);
    }, [habit.logs]);

    // Edit State
    const [isEditMode, setIsEditMode] = useState(false);
    const [editTitle, setEditTitle] = useState(habit.title);
    const [editTarget, setEditTarget] = useState(habit.targetDays);

    // Virtual Today Logic (Cutoff 4 AM IST)
    const now = new Date();
    const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    if (istTime.getHours() < 4) istTime.setDate(istTime.getDate() - 1);
    const todayUTC = Date.UTC(istTime.getFullYear(), istTime.getMonth(), istTime.getDate());
    
    // Check if logged using OPTIMISTIC state
    const todayLog = optimisticLogs.find(l => {
        const d = new Date(l.date);
        return d.getTime() === todayUTC;
    });

    const isLogged = !!todayLog;

    const handleOpenLogDrawer = (type: HabitLogType = 'DONE', dateStr?: string) => {
        setLogDrawerData({ isOpen: true, type, dateStr });
        setShowAnomaly(false);
    };

    const handleLog = async (type: HabitLogType = 'DONE', notes?: string, imageUrl?: string, dateStr?: string) => {
        if (isLogging) return;

        let effectiveDateStr = dateStr;
        if (!effectiveDateStr) {
            const d = new Date();
            const ist = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
            if (ist.getHours() < 4) ist.setDate(ist.getDate() - 1);
            effectiveDateStr = `${ist.getFullYear()}-${String(ist.getMonth() + 1).padStart(2, '0')}-${String(ist.getDate()).padStart(2, '0')}`;
        }

        // --- APPLY OPTIMISTIC LOG ---
        const [y, m, d] = effectiveDateStr.split('-').map(Number);
        const targetDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
        
        const tempLog: HabitLog = {
            id: 'temp-' + Date.now(),
            date: targetDate,
            notes: notes || null,
            reflection: null,
            imageUrl: imageUrl || null,
            logType: type,
            habitId: habit.id,
            createdAt: new Date()
        };

        const wasDrawerOpen = !!logDrawerData?.isOpen;

        setOptimisticLogs(prev => {
            // Replace if same date exists, else append
            const filtered = prev.filter(l => new Date(l.date).getTime() !== targetDate.getTime());
            return [tempLog, ...filtered];
        });

        setIsLogging(true);
        try {
            const result = await logHabit(habit.id, notes, type, imageUrl, effectiveDateStr);
            if (result.error) {
                toast.error(result.error);
                setOptimisticLogs(habit.logs); // Rollback on error
            } else {
                if (type === 'DONE') {
                    if (wasDrawerOpen) {
                        toast.success(dateStr ? `Log updated for ${dateStr}` : "Notes saved!");
                    } else {
                        toast.success("Habit logged! Opening reflection...");
                    }
                } else {
                    toast.success("Logged. Rest is progress too.");
                }

                if (wasDrawerOpen) {
                    setLogDrawerData(null);
                } else if (type === 'DONE' && !dateStr) {
                    // It was an immediate click from the card, open drawer for reflection after 1s
                    setTimeout(() => {
                        handleOpenLogDrawer('DONE');
                    }, 1000);
                }

                if (result.progression) setUpgradeData(result.progression);
                router.refresh();
            }
        } catch (error) {
            toast.error("Failed to log.");
            setOptimisticLogs(habit.logs); // Rollback
        } finally {
            setIsLogging(false);
        }
    };

    const handleAdjustHistory = async (dateStr: string, adjustment: number) => {
        if (isLogging) return;

        const [y, m, d] = dateStr.split('-').map(Number);
        const targetDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));

        // --- APPLY OPTIMISTIC ADJUSTMENT ---
        if (adjustment > 0) {
            const tempLog: HabitLog = {
                id: 'temp-' + Date.now(),
                date: targetDate,
                notes: null,
                reflection: null,
                imageUrl: null,
                logType: 'DONE',
                habitId: habit.id,
                createdAt: new Date()
            };
            setOptimisticLogs(prev => [tempLog, ...prev]);
        } else {
            setOptimisticLogs(prev => {
                const index = prev.findIndex(l => new Date(l.date).getTime() === targetDate.getTime());
                if (index !== -1) {
                    const next = [...prev];
                    next.splice(index, 1);
                    return next;
                }
                return prev;
            });
        }

        setIsLogging(true);
        try {
            const res = await adjustHabitLogs(habit.id, dateStr, adjustment);
            if (res.success) {
                toast.success("History adjusted");
                router.refresh();
            } else {
                toast.error(res.error || "Failed to adjust history");
                setOptimisticLogs(habit.logs); // Rollback
            }
        } catch (e) {
            toast.error("Error adjusting history");
            setOptimisticLogs(habit.logs); // Rollback
        } finally {
            setIsLogging(false);
        }
    };

    const handleUpdate = async () => {
        setIsLogging(true);
        try {
            const res = await updateHabit(habit.id, { title: editTitle, targetDays: editTarget });
            if (res.success) {
                toast.success("Habit updated!");
                setIsEditMode(false);
                router.refresh();
            } else {
                toast.error(res.error || "Failed");
            }
        } catch (e) {
            toast.error("Failed to update");
        } finally {
            setIsLogging(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure? This will delete all history for this habit.")) return;
        setIsLogging(true);
        try {
            const res = await deleteHabit(habit.id);
            if (res.success) {
                toast.success("Habit deleted");
                setShowHistory(false);
                router.refresh();
            } else {
                toast.error(res.error || "Failed");
            }
        } catch (e) {
            toast.error("Failed to delete");
        } finally {
            setIsLogging(false);
        }
    };

    const handleResetProgress = async () => {
        if (!confirm("Reset progress? Current streaks and logs will be archived for a fresh start.")) return;
        setIsLogging(true);
        try {
            const res = await resetHabit(habit.id);
            if (res.success) {
                toast.success("Progress reset!");
                setIsEditMode(false);
                router.refresh();
            } else {
                toast.error(res.error || "Failed");
            }
        } catch (e) {
            toast.error("Failed to reset");
        } finally {
            setIsLogging(false);
        }
    };

    const handleUpgrade = async () => {
        setIsLogging(true);
        try {
            await upgradeHabit(habit.id);
            toast.success("Level Up! New habit set.");
            setUpgradeData(null);
            router.refresh();
        } catch(e) {
            toast.error("Failed");
        } finally {
            setIsLogging(false);
        }
    };

    const handleDeclineUpgrade = async () => {
        await declineUpgrade(habit.id);
        setUpgradeData(null);
    };

    const coreHabit = CORE_HABITS.find(h => h.id === habit.focusArea);

    const progress = Math.min(100, (habit.currentStreak / habit.targetDays) * 100);
    const progressInLevel = habit.currentStreak % 7;
    const levelProgressPercent = (progressInLevel === 0 && habit.currentStreak > 0) ? 100 : (progressInLevel / 7 * 100);

    return (
        <>
        <motion.div 
            whileTap={{ scale: 0.98 }}
            className="bg-white/40 backdrop-blur-xl rounded-[40px] p-4 flex flex-col items-center shadow-sm relative overflow-visible aspect-[2/3] group border border-white/50"
        >
            {/* Top Bar Actions */}
            <div className="absolute top-3 left-3 z-20 flex gap-2">
                {!isLogged ? (
                    <button 
                        onClick={(e) => { e.stopPropagation(); setShowAnomaly(true); }}
                        className="w-11 h-11 rounded-full bg-white/60 backdrop-blur-md text-[#556B5A]/40 flex items-center justify-center hover:bg-white/80 shadow-sm active:scale-90 transition-all border border-white/50"
                    >
                        <Pause className="w-4 h-4" />
                    </button>
                ) : (
                    <div className="w-11 h-11 rounded-full bg-[#7C9A86]/10 backdrop-blur-md text-[#7C9A86] flex items-center justify-center shadow-sm border border-[#7C9A86]/20">
                        {todayLog.logType === 'DONE' ? <Check className="w-5 h-5" strokeWidth={3} /> : <Pause className="w-4 h-4" />}
                    </div>
                )}
            </div>

            <div className="absolute top-3 right-3 z-20">
                <button 
                    onClick={(e) => { e.stopPropagation(); setShowHistory(true); }}
                    className="w-11 h-11 rounded-full bg-[#556B5A] text-white flex items-center justify-center hover:bg-[#445849] shadow-md active:scale-90 transition-all"
                >
                    <Pencil className="w-4 h-4" />
                </button>
            </div>

            {/* Centered Content */}
            <div className="flex-1 flex flex-col items-center justify-center w-full pt-12 pb-4">
                
                {/* Large Logging Button */}
                <div className="relative flex items-center justify-center w-full max-w-[140px] aspect-square mb-6">
                    <svg 
                        className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none z-0"
                        viewBox="0 0 100 100"
                    >
                        <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(85, 107, 90, 0.05)" strokeWidth="6" />
                        <motion.circle
                            cx="50" cy="50" r="46" fill="none"
                            stroke={isLogged ? (todayLog?.logType === 'DONE' ? "#7C9A86" : "#EAB308") : "#556B5A"}
                            strokeWidth="6" strokeLinecap="round" pathLength="100"
                            initial={{ strokeDasharray: "0 100" }}
                            animate={{ strokeDasharray: `${progress} 100` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                        />
                    </svg>

                    <button
                        onClick={() => !isLogged && handleLog('DONE')}
                        disabled={isLogging || isLogged}
                        className={`relative w-[80%] h-[80%] rounded-full flex items-center justify-center transition-all shadow-xl active:scale-95 z-10 shrink-0 ${
                            isLogged 
                            ? (todayLog?.logType === 'DONE' ? 'bg-[#7C9A86] text-[#556B5A] shadow-[#7C9A86]/20' : 'bg-[#EAB308] text-white shadow-[#EAB308]/20')
                            : 'bg-white/60 backdrop-blur-md text-[#556B5A] hover:bg-white/80 hover:shadow-2xl border border-white/50'
                        }`}
                    >
                        <div className="flex flex-col items-center justify-center">
                            {isLogged ? (
                                <Check className="w-10 h-10" strokeWidth={3} />
                            ) : (
                                <span className="text-3xl">{coreHabit?.icon || '✨'}</span>
                            )}
                        </div>
                        {isLogging && (
                            <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] rounded-full flex items-center justify-center">
                                <Loader2 className="w-8 h-8 animate-spin text-[#556B5A]" />
                            </div>
                        )}
                    </button>
                </div>

                {/* Info & Progression */}
                <div className="text-center w-full px-4 flex flex-col items-center">
                    <h3 className="font-bold text-[#556B5A] text-sm leading-tight mb-3 line-clamp-2">{habit.title}</h3>
                    
                    {/* Progress Bar Container */}
                    <div className="w-full max-w-[120px] space-y-1.5 bg-white/40 backdrop-blur-md p-2 rounded-2xl border border-white/30 shadow-sm">
                        <div className="h-2 w-full bg-[#556B5A]/10 rounded-full overflow-hidden">
                            <motion.div 
                                key={`${habit.id}-${habit.currentStreak}`}
                                className="h-full bg-[#7C9A86]"
                                animate={{ 
                                    width: habit.focusArea === 'custom' 
                                        ? `${Math.min(100, (habit.currentStreak / habit.targetDays) * 100)}%`
                                        : `${levelProgressPercent}%` 
                                }}
                                transition={{ duration: 1, ease: "easeOut" }}
                            />
                        </div>
                        <div className="flex justify-between items-center text-[8px] font-black text-[#556B5A]/40 uppercase tracking-tighter">
                            <span>{habit.focusArea === 'custom' ? 'Goal' : `Lvl ${habit.level}`}</span>
                            <span className="text-[#7C9A86] font-bold">
                                {habit.focusArea === 'custom' 
                                    ? `${habit.currentStreak}/${habit.targetDays}d`
                                    : `${progressInLevel === 0 && habit.currentStreak > 0 ? 7 : progressInLevel}/7 Days`
                                }
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>

        {/* Log Detail Drawer */}
        <LogHabitDrawer 
            habit={habit}
            isOpen={!!logDrawerData?.isOpen}
            type={logDrawerData?.type || 'DONE'}
            dateStr={logDrawerData?.dateStr}
            onClose={() => setLogDrawerData(null)}
            onLog={handleLog}
            isLogging={isLogging}
        />

        {/* History & Stats Drawer */}
        <Drawer repositionInputs={true} open={showHistory} onOpenChange={(o) => { setShowHistory(o); if(!o) setIsEditMode(false); }}>
            <DrawerContent className="bg-[#F6F2EC]/90 backdrop-blur-xl border-none font-[Outfit] max-h-[95vh]">
                <DrawerHeader className="sr-only">
                    <DrawerTitle>{habit.title} History</DrawerTitle>
                    <DrawerDescription>View and manage your habit history and settings.</DrawerDescription>
                </DrawerHeader>
                <div className="p-6 pb-12 overflow-y-auto no-scrollbar">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8 px-2">
                        <div className="flex flex-col">
                            <h3 className="text-2xl font-black text-[#556B5A] uppercase tracking-tighter leading-none mb-1">{habit.title}</h3>
                            <span className="text-[10px] font-black text-[#556B5A]/40 uppercase tracking-widest">Manage & History</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setIsEditMode(!isEditMode)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isEditMode ? 'bg-[#556B5A] text-white' : 'bg-white text-[#556B5A] shadow-sm'}`}
                            >
                                {isEditMode ? <X className="w-5 h-5" /> : <Pencil className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {isEditMode ? (
                        <div className="space-y-6 bg-white p-6 rounded-[32px] shadow-sm animate-in slide-in-from-bottom-4 duration-300">
                            <div>
                                <label className="block text-[10px] font-black text-[#556B5A]/40 uppercase tracking-widest mb-2 ml-1">Habit Title</label>
                                <input 
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="w-full bg-white border border-[#556B5A]/10 rounded-xl px-4 py-2 text-[#556B5A] font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-[#556B5A]/40 uppercase tracking-widest mb-2 ml-1">Daily Target</label>
                                <select 
                                    value={editTarget}
                                    onChange={(e) => setEditTarget(parseInt(e.target.value))}
                                    className="w-full bg-white border border-[#556B5A]/10 rounded-xl px-4 py-2 text-[#556B5A] font-bold appearance-none"
                                >
                                    <option value={21}>21 Days</option>
                                    <option value={66}>66 Days</option>
                                    <option value={100}>100 Days</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-3 pt-4">
                                <button 
                                    onClick={handleUpdate}
                                    disabled={isLogging}
                                    className="w-full py-4 bg-[#556B5A] text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2"
                                >
                                    {isLogging ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Changes"}
                                </button>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={handleResetProgress}
                                        className="flex-1 py-3 bg-transparent text-[#556B5A]/60 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                                    >
                                        <RotateCcw className="w-4 h-4" /> Reset Streak
                                    </button>
                                    <button 
                                        onClick={handleDelete}
                                        className="flex-1 py-3 bg-red-50 text-red-500 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" /> Delete Habit
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="bg-white p-6 rounded-[32px] shadow-sm mb-6">
                                <h3 className="text-[10px] font-black text-[#556B5A]/40 uppercase tracking-widest mb-4">Past 7 Days</h3>
                                <div className="flex justify-between items-end gap-1">
                                    {[6, 5, 4, 3, 2, 1, 0].map(daysAgo => {
                                        const date = new Date();
                                        date.setDate(date.getDate() - daysAgo);
                                        const dateStr = date.getUTCFullYear() + '-' + 
                                                     String(date.getUTCMonth() + 1).padStart(2, '0') + '-' + 
                                                     String(date.getUTCDate()).padStart(2, '0');
                                        
                                        // Calculate streak for this specific date for color coding
                                        let streakAtDate = 0;
                                        const sortedLogs = [...habit.logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                                        let running = 0;
                                        let lastD: string | null = null;
                                        
                                        sortedLogs.forEach(l => {
                                            const d = new Date(l.date);
                                            const s = d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
                                            if (lastD) {
                                                const prevDate = new Date(lastD);
                                                const currDate = new Date(s);
                                                const diff = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
                                                if (diff === 1) running++;
                                                else if (diff > 1) running = 1;
                                            } else {
                                                running = 1;
                                            }
                                            if (s === dateStr) streakAtDate = running;
                                            lastD = s;
                                        });

                                        const log = habit.logs.find(l => {
                                            const d = new Date(l.date);
                                            const lStr = d.getUTCFullYear() + '-' + 
                                                         String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + 
                                                         String(d.getUTCDate()).padStart(2, '0');
                                            return lStr === dateStr;
                                        });

                                        const getColorClass = (l?: HabitLog, streak?: number) => {
                                            if (!l) return 'bg-[#F6F2EC] text-[#556B5A]/20';
                                            if (l.logType !== 'DONE') return 'bg-[#EAB308] text-white';
                                            if (streak && streak > 9) return 'bg-[#44337A] text-white';
                                            if (streak && streak > 6) return 'bg-[#6B46C1] text-white';
                                            if (streak && streak > 3) return 'bg-[#9F7AEA] text-white';
                                            return 'bg-[#D6BCFA] text-[#556B5A]';
                                        };

                                        const dayName = date.toLocaleDateString('en-US', { weekday: 'narrow' });
                                        
                                        return (
                                            <div key={daysAgo} className="flex flex-col items-center gap-2 flex-1">
                                                <div 
                                                    onClick={() => !log && handleOpenLogDrawer('DONE', dateStr)}
                                                    className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all ${getColorClass(log, streakAtDate)} ${!log ? 'cursor-pointer hover:bg-[#556B5A]/5' : ''}`}
                                                >
                                                    <span className={`text-[10px] font-black ${log ? (streakAtDate > 3 || log.logType !== 'DONE' ? 'text-white' : 'text-[#556B5A]') : 'text-[#556B5A]/20'}`}>
                                                        {date.getUTCDate()}
                                                    </span>
                                                </div>
                                                <span className="text-[9px] font-bold text-[#556B5A]/40 uppercase">{dayName}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Manual Log Adjustment Section */}
                            <div className="bg-white p-6 rounded-[32px] shadow-sm mb-6">
                                <h3 className="text-[10px] font-black text-[#556B5A]/40 uppercase tracking-widest mb-4">Adjust History</h3>
                                <div className="space-y-4">
                                    {[0, 1, 2, 3, 4].map(daysAgo => {
                                        const date = new Date();
                                        date.setDate(date.getDate() - daysAgo);
                                        const dateStr = date.getUTCFullYear() + '-' + 
                                                     String(date.getUTCMonth() + 1).padStart(2, '0') + '-' + 
                                                     String(date.getUTCDate()).padStart(2, '0');
                                        
                                        const logsForDay = habit.logs.filter(l => {
                                            const d = new Date(l.date);
                                            const lStr = d.getUTCFullYear() + '-' + 
                                                         String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + 
                                                         String(d.getUTCDate()).padStart(2, '0');
                                            return lStr === dateStr;
                                        });
                                        
                                        return (
                                            <div key={daysAgo} className="flex items-center justify-between">
                                                <div className="flex flex-col text-left">
                                                    <span className="text-sm font-bold text-[#556B5A]">
                                                        {daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                    </span>
                                                    <span className="text-[10px] text-[#556B5A]/40 font-black uppercase tracking-widest">{logsForDay.length} logs</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => handleAdjustHistory(dateStr, -1)}
                                                        disabled={isLogging}
                                                        className="w-8 h-8 rounded-full bg-transparent flex items-center justify-center text-[#556B5A] active:scale-90 transition-all disabled:opacity-50"
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleOpenLogDrawer('DONE', dateStr)}
                                                        disabled={isLogging}
                                                        className="w-8 h-8 rounded-full bg-[#556B5A] flex items-center justify-center text-white active:scale-90 transition-all disabled:opacity-50"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </DrawerContent>
        </Drawer>

        {/* Anomaly Drawer (Pause) */}
        <Drawer repositionInputs={true} open={showAnomaly} onOpenChange={setShowAnomaly}>
            <DrawerContent className="bg-[#F6F2EC]/90 backdrop-blur-xl border-none font-[Outfit]">
                <DrawerHeader className="sr-only">
                    <DrawerTitle>Pause Habit</DrawerTitle>
                    <DrawerDescription>Select a reason to pause your habit for today.</DrawerDescription>
                </DrawerHeader>
                <div className="p-6 pb-12">
                    <div className="text-center mb-6">
                        <h3 className="text-xl font-bold text-[#556B5A]">Pause for today?</h3>
                        <p className="text-[#556B5A]/60 text-sm mt-1 px-4">Life happens. Select a reason to protect your streak while you rest.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { id: 'SICK', icon: BedDouble, label: "Sick / Rest" },
                            { id: 'TRAVEL', icon: Plane, label: "Traveling" },
                            { id: 'STRESSED', icon: Frown, label: "Stressed" },
                            { id: 'BUSY', icon: Briefcase, label: "Busy" },
                            { id: 'OTHER', icon: HelpCircle, label: "Other" },
                        ].map(opt => (
                            <motion.button
                                key={opt.id}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleOpenLogDrawer(opt.id as HabitLogType)}
                                className="bg-white p-5 rounded-[24px] flex flex-col items-center justify-center gap-2 hover:bg-[#556B5A]/5 transition-colors border border-transparent active:border-[#556B5A]/10"
                            >
                                <opt.icon className="w-6 h-6 text-[#556B5A]/70" />
                                <span className="text-xs font-bold text-[#556B5A]">{opt.label}</span>
                            </motion.button>
                        ))}
                    </div>
                </div>
            </DrawerContent>
        </Drawer>

        {/* Level Up Drawer */}
        <Drawer repositionInputs={true} open={!!upgradeData} onOpenChange={(o) => !o && setUpgradeData(null)}>
            <DrawerContent className="bg-[#556B5A] text-white rounded-t-[32px] border-none font-[Outfit]">
                 <DrawerHeader className="sr-only">
                    <DrawerTitle>Level Up Milestone</DrawerTitle>
                    <DrawerDescription>Congratulations on your streak! You have a new habit level available.</DrawerDescription>
                 </DrawerHeader>
                 <div className="p-8 pb-12 flex flex-col items-center text-center">
                     <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                         <ArrowUpCircle className="w-10 h-10 text-white" />
                     </div>
                     <h3 className="text-2xl font-bold mb-2">Level Up Available!</h3>
                     <p className="text-white/70 mb-8 max-w-xs">{upgradeData?.message}</p>
                     
                     <div className="bg-white/10 rounded-2xl p-6 w-full mb-8 border border-white/10">
                         <div className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">Next Challenge</div>
                         <div className="text-xl font-bold">{upgradeData?.nextTitle}</div>
                         <div className="text-sm text-white/60 mt-1">{upgradeData?.nextDuration}</div>
                     </div>

                     <div className="flex flex-col gap-3 w-full">
                         <button 
                             onClick={handleUpgrade}
                             className="w-full py-4 bg-[#7C9A86] text-[#556B5A] rounded-[20px] font-bold shadow-xl hover:bg-[#556B5A] transition-colors"
                         >
                             Accept Challenge
                         </button>
                         <button 
                            onClick={handleDeclineUpgrade}
                            className="w-full py-3 rounded-xl font-bold text-white/50 hover:bg-white/10 transition-colors"
                         >
                             Maybe later
                         </button>
                     </div>
                 </div>
            </DrawerContent>
        </Drawer>
        </>
    );
}

function LogHabitDrawer({ habit, isOpen, type, dateStr, onClose, onLog, isLogging }: { 
    habit: Habit, 
    isOpen: boolean, 
    type: HabitLogType, 
    dateStr?: string,
    onClose: () => void, 
    onLog: (type: HabitLogType, notes?: string, imageUrl?: string, dateStr?: string) => Promise<void>,
    isLogging: boolean
}) {
    const [notes, setNotes] = useState("");
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset state when drawer opens/closes or date changes
    useEffect(() => {
        if (!isOpen) {
            setNotes("");
            setImageUrl(null);
        }
    }, [isOpen]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setIsUploading(true);
            
            try {
                const { uploadMedia } = await import("@/lib/upload-client");
                const data = await uploadMedia(file);
                setImageUrl(data.secure_url);
                toast.success("Image uploaded!");
            } catch (error) {
                toast.error("Failed to upload image");
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleLogClick = () => {
        onLog(type, notes, imageUrl || undefined, dateStr);
    };

    const coreHabit = CORE_HABITS.find(h => h.id === habit.focusArea);

    const displayDate = dateStr ? new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' }) : new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' });

    return (
        <Drawer repositionInputs={true} open={isOpen} onOpenChange={(o) => !o && onClose()}>
            <DrawerContent className="bg-[#F6F2EC]/90 backdrop-blur-xl rounded-t-[32px] border-none font-[Outfit] max-h-[96dvh]">
                <DrawerHeader className="sr-only">
                    <DrawerTitle>Log Habit Progress</DrawerTitle>
                    <DrawerDescription>Add a comment or photo to your habit track for {displayDate}.</DrawerDescription>
                </DrawerHeader>
                <div className="p-6 pb-12 overflow-y-auto no-scrollbar">
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center text-3xl mb-4">
                            {type === 'DONE' ? (coreHabit?.icon || '✨') : '⏸️'}
                        </div>
                        <h3 className="text-xl font-bold text-[#556B5A]">
                            {type === 'DONE' ? `Log ${habit.title}` : `Pause: ${type}`}
                        </h3>
                        <p className="text-[#556B5A]/40 text-xs font-bold uppercase tracking-widest mt-1">{displayDate}</p>
                    </div>

                    <div className="space-y-6">
                        {/* Comment/Notes */}
                        <div>
                            <label className="block text-[10px] font-black text-[#556B5A]/40 uppercase tracking-widest mb-2 ml-1">Optional Comment</label>
                            <textarea 
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="How did it go? Any reflections?"
                                rows={3}
                                className="w-full bg-white border border-[#556B5A]/10 rounded-[20px] p-4 text-[#556B5A] text-sm outline-none resize-none focus:ring-1 focus:ring-[#556B5A]/20 transition-all"
                            />
                        </div>

                        {/* Image Upload */}
                        <div>
                            <label className="block text-[10px] font-black text-[#556B5A]/40 uppercase tracking-widest mb-2 ml-1">Optional Photo</label>
                            {imageUrl ? (
                                <div className="relative aspect-video w-full rounded-[24px] overflow-hidden group">
                                    <img src={imageUrl} alt="Habit log" className="w-full h-full object-cover" />
                                    <button 
                                        onClick={() => setImageUrl(null)}
                                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="w-full aspect-video bg-white/60 border-2 border-dashed border-[#556B5A]/10 rounded-[24px] flex flex-col items-center justify-center gap-2 hover:bg-white/80 transition-all active:scale-[0.98]"
                                >
                                    {isUploading ? (
                                        <Loader2 className="w-6 h-6 animate-spin text-[#556B5A]/40" />
                                    ) : (
                                        <>
                                            <div className="w-10 h-10 rounded-full bg-[#556B5A]/5 flex items-center justify-center text-[#556B5A]/40">
                                                <Plus className="w-5 h-5" />
                                            </div>
                                            <span className="text-[10px] font-black text-[#556B5A]/40 uppercase tracking-widest">Snap or Upload</span>
                                        </>
                                    )}
                                </button>
                            )}
                            <input 
                                type="file" 
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                className="hidden"
                            />
                        </div>

                        {/* Submit Button */}
                        <button 
                            onClick={handleLogClick}
                            disabled={isLogging || isUploading}
                            className={`w-full py-4 rounded-[24px] font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 ${
                                type === 'DONE' ? 'bg-[#7C9A86] text-[#556B5A]' : 'bg-[#EAB308] text-white'
                            }`}
                        >
                            {isLogging ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                <>
                                    {type === 'DONE' ? 'Confirm Log' : 'Save Pause'}
                                    <ChevronRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
}

function ContributionGraph({ logs, startDate, isWeekly, habitTitle, setViewLogData }: { logs: HabitLog[], startDate: Date, isWeekly?: boolean, habitTitle: string, setViewLogData: any }) {
    const now = new Date();
    // Use IST for "today"
    const todayIST = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const todayUTC = Date.UTC(todayIST.getFullYear(), todayIST.getMonth(), todayIST.getDate());
    
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to end (latest dates)
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
        }
    }, [logs, isWeekly]);

    // IF WEEKLY: Use compact 7-day view
    if (isWeekly) {
        // Generate last 7 days in IST
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(todayIST);
            d.setDate(d.getDate() - i);
            days.push(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())));
        }

        // Streak mapping for coloring (Safe UTC comparison)
        const logMap = useMemo(() => {
            const map = new Map();
            const sortedAllLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            let runningS = 0;
            let lastDStr: string | null = null;

            sortedAllLogs.forEach(l => {
                const d = new Date(l.date);
                const s = d.getUTCFullYear() + '-' + (d.getUTCMonth() + 1) + '-' + d.getUTCDate();
                if (lastDStr) {
                    const parts = lastDStr.split('-').map(Number);
                    const prev = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
                    const diff = Math.round((d.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
                    if (diff === 1) runningS++; else if (diff > 1) runningS = 1;
                } else runningS = 1;
                map.set(s, { log: l, type: l.logType, streak: runningS });
                lastDStr = s;
            });
            return map;
        }, [logs]);

        const getColorClass = (date: Date) => {
            const s = date.getUTCFullYear() + '-' + (date.getUTCMonth() + 1) + '-' + date.getUTCDate();
            const data = logMap.get(s);
            if (!data) return 'bg-transparent border border-[#556B5A]/5 text-[#556B5A]/20';
            if (data.type !== 'DONE') return 'bg-[#EAB308] text-white';
            
            const streak = data.streak;
            if (streak > 9) return 'bg-[#44337A] text-white';
            if (streak > 6) return 'bg-[#6B46C1] text-white';
            if (streak > 3) return 'bg-[#9F7AEA] text-white';
            return 'bg-[#D6BCFA] text-[#556B5A]';
        };

        const handleDayClick = (date: Date) => {
            const dateStr = date.getUTCFullYear() + '-' + (date.getUTCMonth() + 1) + '-' + date.getUTCDate();
            const data = logMap.get(dateStr);
            if (data && data.log && (data.log.reflection || data.log.notes || data.log.imageUrl)) {
                setViewLogData({
                    isOpen: true,
                    date,
                    habitTitle,
                    reflection: data.log.reflection,
                    notes: data.log.notes,
                    imageUrl: data.log.imageUrl,
                    logType: data.log.logType
                });
            }
        };

        return (
            <div className="flex justify-between items-end gap-1 px-2 py-2">
                {days.map((date, i) => {
                    const dateStr = date.getUTCFullYear() + '-' + (date.getUTCMonth() + 1) + '-' + date.getUTCDate();
                    const data = logMap.get(dateStr);
                    const hasLog = !!data;
                    const hasDetails = data && data.log && (data.log.reflection || data.log.notes || data.log.imageUrl);
                    
                    return (
                        <div key={i} className="flex flex-col items-center gap-2 flex-1 max-w-[40px]">
                            <button 
                                onClick={() => handleDayClick(date)}
                                disabled={!hasDetails}
                                className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all ${getColorClass(date)} ${hasDetails ? 'cursor-pointer hover:opacity-80 shadow-md ring-2 ring-white/50 ring-offset-1 ring-offset-[#F6F2EC]' : 'cursor-default'}`}
                            >
                                <span className={`text-[10px] font-black ${hasLog ? (logMap.get(dateStr).streak > 3 || logMap.get(dateStr).type !== 'DONE' ? 'text-white' : 'text-[#556B5A]') : 'text-[#556B5A]/20'}`}>
                                    {date.getUTCDate()}
                                </span>
                            </button>
                            <span className="text-[9px] font-bold text-[#556B5A]/40 uppercase">
                                {date.toLocaleDateString('en-US', { weekday: 'narrow' })}
                            </span>
                        </div>
                    )
                })}
            </div>
        );
    }

    // IF 30D (ORIGINAL STYLE): Use the multi-month grid
    const monthsData: { name: string, dates: (Date|null)[] }[] = [];
    const start = new Date(startDate);
    let current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));

    while (current.getTime() <= todayUTC) {
        const monthName = current.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
        let monthObj = monthsData.find(m => m.name === monthName);
        
        if (!monthObj) {
            monthObj = { name: monthName, dates: [] };
            monthsData.push(monthObj);
        }
        
        monthObj.dates.push(new Date(current));
        current.setUTCDate(current.getUTCDate() + 1);
    }

    const logMap = useMemo(() => {
        const map = new Map();
        const sortedLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        let runningStreak = 0;
        let lastDateStr: string | null = null;

        sortedLogs.forEach(l => {
            const d = new Date(l.date);
            const dateStr = d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
            if (lastDateStr) {
                const prev = new Date(lastDateStr + 'T00:00:00Z');
                const curr = new Date(dateStr + 'T00:00:00Z');
                const diff = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
                if (diff === 1) runningStreak++; else if (diff > 1) runningStreak = 1;
            } else runningStreak = 1;
            map.set(dateStr, { log: l, type: l.logType, streakAtDate: runningStreak });
            lastDateStr = dateStr;
        });
        return map;
    }, [logs]);

    const getColor = (data?: { type: HabitLogType, streakAtDate: number, log?: HabitLog }) => {
        if (!data) return 'bg-transparent border border-[#556B5A]/5';
        if (data.type !== 'DONE') return 'bg-[#EAB308]'; 
        const streak = data.streakAtDate;
        if (streak <= 3) return 'bg-[#D6BCFA]'; 
        if (streak <= 6) return 'bg-[#9F7AEA]'; 
        if (streak <= 9) return 'bg-[#6B46C1]'; 
        return 'bg-[#44337A]'; 
    };

    const handleDayClick = (date: Date, dateStr: string) => {
        const data = logMap.get(dateStr);
        if (data && data.log && (data.log.reflection || data.log.notes || data.log.imageUrl)) {
            setViewLogData({
                isOpen: true,
                date,
                habitTitle,
                reflection: data.log.reflection,
                notes: data.log.notes,
                imageUrl: data.log.imageUrl,
                logType: data.log.logType
            });
        }
    };

    const cellSize = '28px';
    const cellGap = '4px';

    return (
        <div className="flex flex-col gap-2 select-none w-full">
            <div ref={scrollRef} className="overflow-x-auto no-scrollbar scroll-smooth w-full">
                <div className="flex gap-4 min-w-max pb-2">
                    {monthsData.map((month, mIdx) => (
                        <div key={mIdx} className="flex flex-col gap-2">
                            <div className="text-[10px] font-black text-[#556B5A]/40 uppercase tracking-widest px-1">{month.name}</div>
                            <div 
                                className="grid grid-flow-col" 
                                style={{ 
                                    gridTemplateRows: `repeat(3, ${cellSize})`,
                                    gap: cellGap 
                                }}
                            >
                                {month.dates.map((date, dIdx) => {
                                    if (!date) return null;
                                    const dateStr = date.getUTCFullYear() + '-' + String(date.getUTCMonth() + 1).padStart(2, '0') + '-' + String(date.getUTCDate()).padStart(2, '0');
                                    const data = logMap.get(dateStr);
                                    const isFuture = date.getTime() > todayUTC;
                                    const hasDetails = data && data.log && (data.log.reflection || data.log.notes || data.log.imageUrl);
                                    return (
                                        <button 
                                            key={dIdx} 
                                            disabled={isFuture || !hasDetails}
                                            onClick={() => handleDayClick(date, dateStr)}
                                            className={`rounded-[10px] transition-all ${getColor(data)} ${isFuture ? 'opacity-0 cursor-default' : 'flex items-center justify-center shadow-xs'} ${hasDetails && !isFuture ? 'cursor-pointer hover:opacity-80 shadow-md ring-2 ring-white/50 ring-offset-1 ring-offset-[#F6F2EC]' : 'cursor-default'}`} 
                                            style={{ width: cellSize, height: cellSize }}
                                        >
                                            {!isFuture && <span className={`text-[9px] font-black ${data ? 'text-white' : 'text-[#556B5A]/20'}`}>{date.getUTCDate()}</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function RitualContributionGraph({ habits, startDate, isWeekly, ritualTitle, setViewLogData }: { habits: HabitWithLogs[]; startDate: Date; isWeekly?: boolean, ritualTitle: string, setViewLogData: any }) {
    const now = new Date();
    const todayIST = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const todayUTC = Date.UTC(todayIST.getFullYear(), todayIST.getMonth(), todayIST.getDate());
    const scrollRef = useRef<HTMLDivElement>(null);
    const logsByHabitAndDate = useMemo(() => {
        const map = new Map<string, Map<string, HabitLog>>();
        for (const habit of habits) {
            const habitMap = new Map<string, HabitLog>();
            for (const log of habit.logs) {
                const logDate = new Date(log.date);
                const utc = Date.UTC(logDate.getUTCFullYear(), logDate.getUTCMonth(), logDate.getUTCDate());
                const key = getDateStringFromUTC(utc);
                if (!habitMap.has(key)) habitMap.set(key, log);
            }
            map.set(habit.id, habitMap);
        }
        return map;
    }, [habits]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
        }
    }, [habits, isWeekly]);

    const getLogForDay = (habit: HabitWithLogs, utc: number) => {
        return logsByHabitAndDate.get(habit.id)?.get(getDateStringFromUTC(utc));
    };

    const getStatusData = (date: Date): RitualDayStatus => {
        const utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
        if (habits.length === 0) return "missed";

        const dayLogs = habits.map(habit => getLogForDay(habit, utc));
        const allDone = dayLogs.every(log => log?.logType === "DONE");
        const anyDone = dayLogs.some(log => log?.logType === "DONE");
        const allPausedByLogs = dayLogs.every(log => log && log.logType !== "DONE");
        const allPausedByDate = habits.every(habit => habit.pauseUntil && habit.pauseUntil.getTime() > utc);

        if (allPausedByLogs || allPausedByDate) return "paused";
        if (allDone) return "full";
        if (anyDone) return "partial";
        return "missed";
    };

    const getBreakdownData = (date: Date) => {
        const utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
        return habits.map(habit => {
            const log = getLogForDay(habit, utc);
            if (!log) return "missed" as const;
            if (log.logType === "DONE") return "done" as const;
            return "paused" as const;
        });
    };

    const getRitualLogDetails = (date: Date) => {
        const utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
        for (const habit of habits) {
            const log = getLogForDay(habit, utc);
            if (log && (log.reflection || log.notes || log.imageUrl)) {
                return log;
            }
        }
        return null;
    };

    const getColorClass = (status: RitualDayStatus) => {
        if (status === "full") return "bg-[#6B46C1] text-white";
        if (status === "partial") return "bg-[#D6BCFA] text-[#556B5A]";
        if (status === "paused") return "bg-blue-100 text-blue-600";
        return "bg-transparent border border-[#556B5A]/5 text-[#556B5A]/20";
    };

    const getSegmentColor = (state: "done" | "paused" | "missed") => {
        if (state === "done") return "bg-[#7C9A86]";
        if (state === "paused") return "bg-[#EAB308]";
        return "bg-[#556B5A]/10";
    };

    if (isWeekly) {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(todayIST);
            d.setDate(d.getDate() - i);
            days.push(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())));
        }

        const handleDayClick = (date: Date) => {
            const details = getRitualLogDetails(date);
            if (details) {
                setViewLogData({
                    isOpen: true,
                    date,
                    habitTitle: ritualTitle,
                    reflection: details.reflection,
                    notes: details.notes,
                    imageUrl: details.imageUrl,
                    logType: details.logType
                });
            }
        };

        return (
            <div className="flex justify-between items-end gap-1 px-2 py-2">
                {days.map((date, i) => {
                    const status = getStatusData(date);
                    const breakdown = getBreakdownData(date);
                    const details = getRitualLogDetails(date);
                    const hasDetails = !!details;

                    return (
                        <div key={i} className="flex flex-col items-center gap-2 flex-1 max-w-[40px]">
                            <button 
                                onClick={() => handleDayClick(date)}
                                disabled={!hasDetails}
                                className={`w-full aspect-square rounded-xl flex flex-col justify-between p-1.5 transition-all ${getColorClass(status)} ${hasDetails ? 'cursor-pointer hover:opacity-80 shadow-md ring-2 ring-white/50 ring-offset-1 ring-offset-[#F6F2EC]' : 'cursor-default'}`}
                            >
                                <div className="flex items-start justify-between w-full">
                                    <span className={`text-[10px] font-black ${status === "full" || status === "paused" ? "text-current" : status === "partial" ? "text-[#556B5A]" : "text-[#556B5A]/20"}`}>
                                        {date.getUTCDate()}
                                    </span>
                                    {status === "full" && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                                    {status === "paused" && <Pause className="w-3.5 h-3.5" />}
                                </div>
                                <div className="grid grid-cols-3 gap-1 w-full">
                                    {Array.from({ length: Math.max(3, breakdown.length) }, (_, idx) => {
                                        const state = breakdown[idx] || "missed";
                                        return <div key={idx} className={`h-1.5 rounded-full ${getSegmentColor(state)}`} />;
                                    })}
                                </div>
                            </button>
                            <span className="text-[9px] font-bold text-[#556B5A]/40 uppercase">
                                {date.toLocaleDateString('en-US', { weekday: 'narrow' })}
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    }

    const monthsData: { name: string, dates: (Date | null)[] }[] = [];
    const start = new Date(startDate);
    let current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));

    while (current.getTime() <= todayUTC) {
        const monthName = current.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
        let monthObj = monthsData.find(m => m.name === monthName);

        if (!monthObj) {
            monthObj = { name: monthName, dates: [] };
            monthsData.push(monthObj);
        }

        monthObj.dates.push(new Date(current));
        current.setUTCDate(current.getUTCDate() + 1);
    }

    const cellSize = '28px';
    const cellGap = '4px';

    return (
        <div className="flex flex-col gap-2 select-none w-full">
            <div ref={scrollRef} className="overflow-x-auto no-scrollbar scroll-smooth w-full">
                <div className="flex gap-4 min-w-max pb-2">
                    {monthsData.map((month, mIdx) => (
                        <div key={mIdx} className="flex flex-col gap-2">
                            <div className="text-[10px] font-black text-[#556B5A]/40 uppercase tracking-widest px-1">{month.name}</div>
                            <div
                                className="grid grid-flow-col"
                                style={{
                                    gridTemplateRows: `repeat(3, ${cellSize})`,
                                    gap: cellGap
                                }}
                            >
                                {month.dates.map((date, dIdx) => {
                                    if (!date) return <div key={dIdx} style={{ width: cellSize, height: cellSize }} />;
                                    const status = getStatusData(date);
                                    const breakdown = getBreakdownData(date);
                                    const details = getRitualLogDetails(date);
                                    const hasDetails = !!details;
                                    const isFuture = date.getTime() > todayUTC;

                                    return (
                                        <button
                                            key={dIdx}
                                            disabled={isFuture || !hasDetails}
                                            onClick={() => {
                                                if (details) {
                                                    setViewLogData({
                                                        isOpen: true,
                                                        date,
                                                        habitTitle: ritualTitle,
                                                        reflection: details.reflection,
                                                        notes: details.notes,
                                                        imageUrl: details.imageUrl,
                                                        logType: details.logType
                                                    });
                                                }
                                            }}
                                            className={`rounded-md border p-1 flex flex-col justify-between transition-all ${
                                                isFuture ? 'opacity-0 cursor-default' : 
                                                status === "full" ? "bg-[#F3ECFB] border-[#D6BCFA]" :
                                                status === "partial" ? "bg-white border-[#E7D9F6]" :
                                                status === "paused" ? "bg-blue-50 border-blue-100" :
                                                "bg-transparent border-[#556B5A]/5"
                                            } ${hasDetails && !isFuture ? 'cursor-pointer hover:opacity-80 shadow-md ring-2 ring-white/50 ring-offset-1 ring-offset-[#F6F2EC]' : 'cursor-default'}`}
                                            style={{ width: cellSize, height: cellSize }}
                                            title={isFuture ? undefined : `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${status}`}
                                        >
                                            {!isFuture && (
                                                <>
                                                    <span className={`text-[9px] leading-none font-black ${
                                                        status === "missed" ? "text-[#556B5A]/25" :
                                                        status === "paused" ? "text-blue-600" :
                                                        "text-[#556B5A]"
                                                    }`}>
                                                        {date.getUTCDate()}
                                                    </span>
                                                    <div className="grid grid-cols-3 gap-[2px]">
                                                        {Array.from({ length: Math.max(3, breakdown.length) }, (_, idx) => {
                                                            const state = breakdown[idx] || "missed";
                                                            return <div key={idx} className={`h-1 rounded-full ${getSegmentColor(state)}`} />;
                                                        })}
                                                    </div>
                                                </>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function RitualRestartDrawer({ isOpen, onClose, onConfirm, type }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, type: RitualType | null }) {
    return (
        <Drawer repositionInputs={true} open={isOpen} onOpenChange={onClose}>
            <DrawerContent className="bg-[#F6F2EC]/45 backdrop-blur-xl border-t border-white/30 font-[Outfit]">
                <DrawerHeader className="sr-only">
                    <DrawerTitle>Restart Ritual</DrawerTitle>
                    <DrawerDescription>Confirm if you want to perform this ritual again.</DrawerDescription>
                </DrawerHeader>
                <div className="p-8 pb-12 flex flex-col items-center text-center relative overflow-hidden">
                    {/* Background Decorative Shapes */}
                    <div className="absolute top-10 right-0 w-32 h-32 bg-[#7C9A86]/10 rounded-full blur-2xl pointer-events-none" />
                    
                    <div className="w-20 h-20 bg-[#7C9A86]/20 backdrop-blur-md rounded-full flex items-center justify-center mb-6 text-[#7C9A86] shadow-sm border border-[#7C9A86]/20 relative z-10">
                        <RotateCcw className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-bold text-[#556B5A] mb-2 relative z-10">Repeat Ritual?</h3>
                    <p className="text-[#556B5A]/60 mb-8 max-w-xs relative z-10">
                        You&apos;ve already completed your {type?.toLowerCase()} ritual for today. Would you like to perform it again?
                    </p>

                    <div className="flex flex-col gap-3 w-full relative z-10">
                        <button 
                            onClick={onConfirm}
                            className="w-full py-4 bg-[#556B5A] text-white rounded-2xl font-bold shadow-lg shadow-[#556B5A]/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                        >
                            Yes, Start Again
                        </button>
                        <button 
                            onClick={onClose}
                            className="w-full py-3 rounded-xl font-bold text-[#556B5A]/40 hover:bg-white/40 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
}

function ReflectionLogDrawer({
    data,
    onClose
}: {
    data: {
        isOpen: boolean;
        date: Date;
        habitTitle: string;
        reflection?: string | null;
        notes?: string | null;
        imageUrl?: string | null;
        logType: string;
    } | null;
    onClose: () => void;
}) {
    if (!data || !data.isOpen) return null;

    const displayDate = data.date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' });

    return (
        <Drawer repositionInputs={true} open={data.isOpen} onOpenChange={(o) => !o && onClose()}>
            <DrawerContent className="bg-[#F6F2EC]/45 backdrop-blur-xl rounded-t-[32px] border-t border-white/30 font-[Outfit] max-h-[96dvh]">
                <DrawerHeader className="sr-only">
                    <DrawerTitle>Reflection Log</DrawerTitle>
                    <DrawerDescription>View your past reflection for {displayDate}.</DrawerDescription>
                </DrawerHeader>
                <div className="p-6 pb-12 overflow-y-auto no-scrollbar relative">
                    {/* Background Decorative Shapes */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute bottom-20 left-0 w-32 h-32 bg-[#556B5A]/5 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex flex-col items-center text-center mb-8 relative z-10">
                        <div className="w-16 h-16 bg-white/40 backdrop-blur-xl border border-white/50 rounded-full shadow-sm flex items-center justify-center text-3xl mb-4">
                            {data.logType === 'DONE' ? '✨' : '⏸️'}
                        </div>
                        <h3 className="text-xl font-bold text-[#556B5A]">{data.habitTitle}</h3>
                        <p className="text-[#556B5A]/40 text-xs font-bold uppercase tracking-widest mt-1">{displayDate}</p>
                    </div>

                    <div className="space-y-6 relative z-10 w-full max-w-sm mx-auto">
                        {data.reflection && (
                            <div className="bg-white/40 backdrop-blur-md rounded-[24px] p-6 border border-white/50 shadow-sm text-center">
                                <span className="text-[10px] font-black text-[#556B5A]/40 uppercase tracking-widest block mb-2">Energy</span>
                                <p className="text-3xl font-black text-[#556B5A] tracking-tighter leading-none">{data.reflection}</p>
                            </div>
                        )}

                        {data.notes && (
                            <div className="bg-white/40 backdrop-blur-md rounded-[24px] p-6 border border-white/50 shadow-sm">
                                <span className="text-[10px] font-black text-[#556B5A]/40 uppercase tracking-widest block mb-2">Notes</span>
                                <p className="text-sm font-medium text-[#556B5A] whitespace-pre-wrap">{data.notes}</p>
                            </div>
                        )}

                        {data.imageUrl && (
                            <div className="rounded-[24px] overflow-hidden border border-white/50 shadow-sm bg-white/40 backdrop-blur-md p-2">
                                <img src={data.imageUrl} alt="Reflection photo" className="w-full h-auto rounded-[16px] object-cover max-h-[40vh]" />
                            </div>
                        )}
                        
                        <button 
                            onClick={onClose}
                            className="w-full py-4 mt-4 bg-white/60 backdrop-blur-md text-[#556B5A] rounded-2xl font-bold shadow-sm border border-white/50 hover:bg-white/80 active:scale-[0.98] transition-all"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
}

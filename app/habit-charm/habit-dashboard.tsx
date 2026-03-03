"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { logHabit, adjustHabitLogs, upgradeHabit, declineUpgrade, updateHabit, deleteHabit, createHabit, resetHabitCharm, resetHabit } from "@/app/actions/habit";
import { Check, Flame, Trophy, Calendar, Plus, Pencil, ChevronLeft, ChevronRight, AlertTriangle, Minus, Loader2, Plane, BedDouble, Frown, Briefcase, HelpCircle, ArrowUpCircle, Trash2, Target, Save, X, RotateCcw, Pause, Sparkles, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Habit, HabitLog, Product, HabitLogType } from "@prisma/client";
import { CORE_HABITS } from "@/lib/habit-templates";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";

type HabitWithLogs = Habit & { logs: HabitLog[] };

export default function HabitDashboard({ habits, product }: { habits: HabitWithLogs[], product: Product }) {
    const router = useRouter();
    const [viewMode, setViewMode] = useState<'cards' | 'history'>('cards');
    const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
    const [isResetDrawerOpen, setIsResetDrawerOpen] = useState(false);

    return (
        <div className="flex flex-col h-full relative overflow-hidden">
             {/* Local Action Bar */}
             <div className="px-6 py-2 flex items-center justify-end gap-3 z-10">
                <button 
                    onClick={() => setIsResetDrawerOpen(true)}
                    className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-[#5B2D7D] hover:bg-[#EADDDE] transition-colors"
                >
                    <RotateCcw className="w-4 h-4" />
                </button>
                <button 
                    onClick={() => setViewMode(prev => prev === 'cards' ? 'history' : 'cards')}
                    className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-[#5B2D7D] hover:bg-[#EADDDE] transition-colors"
                >
                    {viewMode === 'cards' ? <Calendar className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                </button>
                {habits.length < 10 && (
                    <button 
                        onClick={() => setIsAddDrawerOpen(true)}
                        className="w-10 h-10 rounded-full bg-[#5B2D7D] shadow-sm flex items-center justify-center text-white hover:bg-[#4A246A] transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                )}
             </div>

             {/* Main Content */}
             <main className="flex-1 p-4 pt-2 z-10 overflow-y-auto no-scrollbar pb-32">
                 {viewMode === 'cards' ? (
                     <div className="grid grid-cols-2 gap-3 w-full">
                        {habits.map(habit => (
                            <HabitCard key={habit.id} habit={habit} router={router} />
                        ))}
                        {habits.length < 10 && (
                            <motion.button 
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setIsAddDrawerOpen(true)}
                                className="bg-white/40 border-2 border-dashed border-[#5B2D7D]/10 rounded-[40px] p-4 flex flex-col items-center justify-center aspect-[2/3] group hover:border-[#5B2D7D]/20 transition-all"
                            >
                                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-3 text-[#5B2D7D]/30 group-hover:text-[#5B2D7D]/50 transition-colors">
                                    <Plus className="w-6 h-6" />
                                </div>
                                <span className="text-[10px] font-bold text-[#5B2D7D]/30 group-hover:text-[#5B2D7D]/50 uppercase tracking-widest text-center">Add Habit</span>
                            </motion.button>
                        )}
                     </div>
                 ) : (
                     <div className="flex flex-col gap-4 w-full">
                        {habits.map(habit => (
                            <HabitHistoryCard key={habit.id} habit={habit} />
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
        </div>
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
        <Drawer open={isOpen} onOpenChange={onClose}>
            <DrawerContent className="bg-[#FDF2EC]/90 backdrop-blur-xl font-[Outfit]">
                <DrawerHeader className="sr-only">
                    <DrawerTitle>Reset Habit Charm</DrawerTitle>
                    <DrawerDescription>Clear all progress and start fresh with this charm.</DrawerDescription>
                </DrawerHeader>
                <div className="p-8 pb-12 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-6 text-orange-600">
                        <AlertTriangle className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-bold text-[#5B2D7D] mb-2">Reset This Charm?</h3>
                    <p className="text-[#5B2D7D]/60 mb-8 max-w-xs">
                        This will archive your current streaks and logs for a fresh start. You won&apos;t see previous history, but it will be saved in our system.
                    </p>

                    <div className="flex flex-col gap-3 w-full">
                        <button 
                            onClick={handleReset}
                            disabled={isResetting}
                            className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isResetting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Yes, Reset Everything"}
                        </button>
                        <button 
                            onClick={onClose}
                            className="w-full py-3 rounded-xl font-bold text-[#5B2D7D]/40 hover:bg-[#5B2D7D]/5 transition-colors"
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
        <Drawer open={isOpen} onOpenChange={onClose}>
            <DrawerContent className="bg-[#FDF2EC]/90 backdrop-blur-xl font-[Outfit] max-h-[90vh]">
                <div className="p-6 pb-12 overflow-y-auto no-scrollbar">
                    <DrawerHeader className="px-0 text-left mb-4">
                        <DrawerTitle className="text-2xl font-bold text-[#5B2D7D]">Add New Habit</DrawerTitle>
                        <DrawerDescription>Pick a specific ritual to add to your medallion.</DrawerDescription>
                    </DrawerHeader>

                    {/* Accordion List */}
                    <div className="space-y-3">
                        {CORE_HABITS.map((category) => {
                            const isExpanded = expandedCategoryId === category.id;
                            const isSelected = selectedHabit?.id === category.id;

                            return (
                                <div key={category.id} className="overflow-hidden">
                                    <button
                                        onClick={() => toggleCategory(category.id)}
                                        className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
                                            isExpanded ? "bg-[#5B2D7D] text-white shadow-md" : "bg-white"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{category.icon}</span>
                                            <div className="text-left">
                                                <h3 className="font-bold">{category.title}</h3>
                                                {isSelected && !isExpanded && (
                                                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#A4C538] text-[#5B2D7D]">
                                                        Selected
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5 text-[#5B2D7D]/40" />}
                                    </button>

                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="mt-2 bg-white/50 rounded-2xl p-2 space-y-1 overflow-hidden"
                                            >
                                                {category.levels.map((lvl) => {
                                                    const isThisSelected = selectedHabit?.id === category.id && selectedHabit?.level === lvl.level;
                                                    return (
                                                        <button
                                                            key={lvl.level}
                                                            onClick={() => { handleSelectHabit(category.id, lvl.level); setMode('template'); }}
                                                            className={`w-full text-left p-3 rounded-xl flex flex-col gap-1 transition-colors ${
                                                                isThisSelected ? "bg-[#5B2D7D]/10" : "hover:bg-[#EADDDE]/30"
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className={`text-sm font-bold ${isThisSelected ? "text-[#5B2D7D]" : "text-[#5B2D7D]/80"}`}>
                                                                    {lvl.description}
                                                                </span>
                                                                <div className={`w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-all ${
                                                                    isThisSelected ? "bg-[#5B2D7D] border-[#5B2D7D]" : "border-[#5B2D7D]/20"
                                                                }`}>
                                                                    {isThisSelected && <Check className="w-3 h-3 text-white" />}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[10px] font-bold text-[#5B2D7D]/40 uppercase tracking-tight">
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
                                className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed transition-all ${
                                    expandedCategoryId === 'custom' ? "border-[#5B2D7D] bg-[#5B2D7D]/5" : "border-[#5B2D7D]/20 bg-white/40"
                                }`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                    expandedCategoryId === 'custom' ? "bg-[#5B2D7D]" : "bg-[#EADDDE]"
                                }`}>
                                    <Plus className={`w-5 h-5 ${expandedCategoryId === 'custom' ? "text-white" : "text-[#5B2D7D]"}`} />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold text-[#5B2D7D]">Add custom goal</h3>
                                </div>
                            </button>

                            <AnimatePresence>
                                {expandedCategoryId === 'custom' && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="mt-2 bg-white rounded-2xl p-4 shadow-sm space-y-4 overflow-hidden"
                                    >
                                        <div className="space-y-4">
                                            <label className="block text-[10px] font-black text-[#5B2D7D]/40 uppercase tracking-widest ml-1">Habit Title</label>
                                            <input
                                                type="text"
                                                value={customTitle}
                                                onChange={(e) => setCustomName(e.target.value)}
                                                placeholder="What is the ritual?"
                                                className="w-full px-4 py-3 rounded-xl bg-[#FDF2EC]/50 border border-[#5B2D7D]/10 text-[#5B2D7D] outline-none"
                                            />
                                            <div>
                                                <label className="block text-[10px] font-black text-[#5B2D7D]/40 uppercase tracking-widest mb-2 ml-1">Daily Target</label>
                                                <select 
                                                    value={customTarget}
                                                    onChange={(e) => setCustomTarget(parseInt(e.target.value))}
                                                    className="w-full px-4 py-3 rounded-xl bg-[#FDF2EC]/50 border border-[#5B2D7D]/10 text-[#5B2D7D] text-sm outline-none appearance-none"
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
                    <div className="mt-8">
                        <button 
                            onClick={handleAdd}
                            disabled={isSaving || (mode === 'template' && !selectedHabit) || (mode === 'custom' && !customTitle.trim())}
                            className="w-full py-4 bg-[#A4C538] text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
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

function HabitHistoryCard({ habit }: { habit: HabitWithLogs }) {
    const [range, setRange] = useState<7 | 30>(30);
    const today = new Date();
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - (range - 1));
    
    return (
        <div className="bg-white rounded-[32px] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div className="max-w-[60%]">
                    <h3 className="text-lg font-bold text-[#5B2D7D] truncate">{habit.title}</h3>
                    <div className="text-[10px] font-black text-[#5B2D7D]/40 uppercase tracking-widest">Level {habit.level}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-1.5 bg-transparent px-3 py-1 rounded-full">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-bold text-[#5B2D7D]">{habit.currentStreak}</span>
                    </div>
                    <div className="flex bg-[#FDF2EC] rounded-lg p-1">
                        <button 
                            onClick={() => setRange(7)}
                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${range === 7 ? 'bg-[#5B2D7D] text-white' : 'text-[#5B2D7D]/40'}`}
                        >7D</button>
                        <button 
                            onClick={() => setRange(30)}
                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${range === 30 ? 'bg-[#5B2D7D] text-white' : 'text-[#5B2D7D]/40'}`}
                        >30D</button>
                    </div>
                </div>
            </div>
            <div className="overflow-x-auto no-scrollbar -mx-2 px-2">
                <ContributionGraph 
                    logs={habit.logs} 
                    startDate={pastDate}
                    isWeekly={range === 7}
                />
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
    
    // Edit State
    const [isEditMode, setIsEditMode] = useState(false);
    const [editTitle, setEditTitle] = useState(habit.title);
    const [editTarget, setEditTarget] = useState(habit.targetDays);

    // Virtual Today Logic (Cutoff 4 AM)
    const now = new Date();
    if (now.getHours() < 4) {
        now.setDate(now.getDate() - 1);
    }
    const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Count logs for today
    const todayLog = habit.logs.find(l => {
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

        // If no dateStr is provided (standard tap), generate one based on client's "Virtual Today"
        let effectiveDateStr = dateStr;
        if (!effectiveDateStr) {
            const d = new Date();
            if (d.getHours() < 4) d.setDate(d.getDate() - 1);
            effectiveDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }

        setIsLogging(true);
        try {
            const result = await logHabit(habit.id, notes, type, imageUrl, effectiveDateStr);
            if (result.error) {
                toast.error(result.error);
            } else {
                if (type === 'DONE') {
                    toast.success(dateStr ? `Log saved for ${dateStr}` : "Habit logged! Keep it up.");
                } else {
                    toast.success("Logged. Rest is progress too.");
                }
                setLogDrawerData(null);

                // Check for progression suggestion
                if (result.progression) {
                    setUpgradeData(result.progression);
                }
                router.refresh();
            }
        } catch (error) {
            toast.error("Failed to log.");
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

    const handleAdjustHistory = async (dateStr: string, adjustment: number) => {
        setIsLogging(true);
        try {
            const res = await adjustHabitLogs(habit.id, dateStr, adjustment);
            if (res.success) {
                toast.success("History adjusted");
                router.refresh();
            } else {
                toast.error(res.error || "Failed to adjust history");
            }
        } catch (e) {
            toast.error("Error adjusting history");
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
            className="bg-white rounded-[40px] p-4 flex flex-col items-center shadow-sm relative overflow-visible aspect-[2/3] group"
        >
            {/* Top Bar Actions */}
            <div className="absolute top-3 left-3 z-20 flex gap-2">
                {!isLogged ? (
                    <button 
                        onClick={(e) => { e.stopPropagation(); setShowAnomaly(true); }}
                        className="w-11 h-11 rounded-full bg-[#FDF2EC] text-[#5B2D7D]/40 flex items-center justify-center hover:bg-[#EADDDE] shadow-sm active:scale-90 transition-all"
                    >
                        <Pause className="w-4 h-4" />
                    </button>
                ) : (
                    <div className="w-11 h-11 rounded-full bg-[#A4C538]/10 text-[#A4C538] flex items-center justify-center shadow-sm">
                        {todayLog.logType === 'DONE' ? <Check className="w-5 h-5" strokeWidth={3} /> : <Pause className="w-4 h-4" />}
                    </div>
                )}
            </div>

            <div className="absolute top-3 right-3 z-20">
                <button 
                    onClick={(e) => { e.stopPropagation(); setShowHistory(true); }}
                    className="w-11 h-11 rounded-full bg-[#5B2D7D] text-white flex items-center justify-center hover:bg-[#4A246A] shadow-md active:scale-90 transition-all"
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
                        <circle cx="50" cy="50" r="46" fill="none" stroke="#FDF2EC" strokeWidth="6" />
                        <motion.circle
                            cx="50" cy="50" r="46" fill="none"
                            stroke={isLogged ? (todayLog?.logType === 'DONE' ? "#A4C538" : "#EAB308") : "#5B2D7D"}
                            strokeWidth="6" strokeLinecap="round" pathLength="100"
                            initial={{ strokeDasharray: "0 100" }}
                            animate={{ strokeDasharray: `${progress} 100` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                        />
                    </svg>

                    <button
                        onClick={() => !isLogged && handleOpenLogDrawer('DONE')}
                        disabled={isLogging || isLogged}
                        className={`relative w-[80%] h-[80%] rounded-full flex items-center justify-center transition-all shadow-xl active:scale-95 z-10 shrink-0 ${
                            isLogged 
                            ? (todayLog?.logType === 'DONE' ? 'bg-[#A4C538] text-[#5B2D7D] shadow-[#A4C538]/20' : 'bg-[#EAB308] text-white shadow-[#EAB308]/20')
                            : 'bg-[#FDF2EC] text-[#5B2D7D] hover:bg-[#EADDDE] hover:shadow-2xl'
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
                                <Loader2 className="w-8 h-8 animate-spin text-[#5B2D7D]" />
                            </div>
                        )}
                    </button>
                </div>

                {/* Info & Progression */}
                <div className="text-center w-full px-4 flex flex-col items-center">
                    <h3 className="font-bold text-[#5B2D7D] text-sm leading-tight mb-3 line-clamp-2">{habit.title}</h3>
                    
                    {/* Progress Bar Container */}
                    <div className="w-full max-w-[120px] space-y-1.5 bg-[#5B2D7D]/5 p-2 rounded-2xl border border-[#5B2D7D]/5">
                        <div className="h-2 w-full bg-[#5B2D7D]/10 rounded-full overflow-hidden">
                            <motion.div 
                                key={`${habit.id}-${habit.currentStreak}`}
                                className="h-full bg-[#A4C538]"
                                animate={{ 
                                    width: habit.focusArea === 'custom' 
                                        ? `${Math.min(100, (habit.currentStreak / habit.targetDays) * 100)}%`
                                        : `${levelProgressPercent}%` 
                                }}
                                transition={{ duration: 1, ease: "easeOut" }}
                            />
                        </div>
                        <div className="flex justify-between items-center text-[8px] font-black text-[#5B2D7D]/40 uppercase tracking-tighter">
                            <span>{habit.focusArea === 'custom' ? 'Goal' : `Lvl ${habit.level}`}</span>
                            <span className="text-[#A4C538] font-bold">
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
        <Drawer open={showHistory} onOpenChange={(o) => { setShowHistory(o); if(!o) setIsEditMode(false); }}>
            <DrawerContent className="bg-[#FDF2EC]/90 backdrop-blur-xl border-none font-[Outfit] max-h-[95vh]">
                <DrawerHeader className="sr-only">
                    <DrawerTitle>{habit.title} History</DrawerTitle>
                    <DrawerDescription>View and manage your habit history and settings.</DrawerDescription>
                </DrawerHeader>
                <div className="p-6 pb-12 overflow-y-auto no-scrollbar">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8 px-2">
                        <div className="flex flex-col">
                            <h3 className="text-2xl font-black text-[#5B2D7D] uppercase tracking-tighter leading-none mb-1">{habit.title}</h3>
                            <span className="text-[10px] font-black text-[#5B2D7D]/40 uppercase tracking-widest">Manage & History</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setIsEditMode(!isEditMode)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isEditMode ? 'bg-[#5B2D7D] text-white' : 'bg-white text-[#5B2D7D] shadow-sm'}`}
                            >
                                {isEditMode ? <X className="w-5 h-5" /> : <Pencil className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {isEditMode ? (
                        <div className="space-y-6 bg-white p-6 rounded-[32px] shadow-sm animate-in slide-in-from-bottom-4 duration-300">
                            <div>
                                <label className="block text-[10px] font-black text-[#5B2D7D]/40 uppercase tracking-widest mb-2 ml-1">Habit Title</label>
                                <input 
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="w-full bg-white border border-[#5B2D7D]/10 rounded-xl px-4 py-2 text-[#5B2D7D] font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-[#5B2D7D]/40 uppercase tracking-widest mb-2 ml-1">Daily Target</label>
                                <select 
                                    value={editTarget}
                                    onChange={(e) => setEditTarget(parseInt(e.target.value))}
                                    className="w-full bg-white border border-[#5B2D7D]/10 rounded-xl px-4 py-2 text-[#5B2D7D] font-bold appearance-none"
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
                                    className="w-full py-4 bg-[#5B2D7D] text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2"
                                >
                                    {isLogging ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Changes"}
                                </button>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={handleResetProgress}
                                        className="flex-1 py-3 bg-transparent text-[#5B2D7D]/60 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
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
                                <h3 className="text-[10px] font-black text-[#5B2D7D]/40 uppercase tracking-widest mb-4">Past 7 Days</h3>
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
                                            if (!l) return 'bg-[#FDF2EC] text-[#5B2D7D]/20';
                                            if (l.logType !== 'DONE') return 'bg-[#EAB308] text-white';
                                            if (streak && streak > 9) return 'bg-[#44337A] text-white';
                                            if (streak && streak > 6) return 'bg-[#6B46C1] text-white';
                                            if (streak && streak > 3) return 'bg-[#9F7AEA] text-white';
                                            return 'bg-[#D6BCFA] text-[#5B2D7D]';
                                        };

                                        const dayName = date.toLocaleDateString('en-US', { weekday: 'narrow' });
                                        
                                        return (
                                            <div key={daysAgo} className="flex flex-col items-center gap-2 flex-1">
                                                <div 
                                                    onClick={() => !log && handleOpenLogDrawer('DONE', dateStr)}
                                                    className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all ${getColorClass(log, streakAtDate)} ${!log ? 'cursor-pointer hover:bg-[#5B2D7D]/5' : ''}`}
                                                >
                                                    {log ? (
                                                        <Check className="w-4 h-4" strokeWidth={3} />
                                                    ) : (
                                                        <span className="text-[10px] font-black">{date.getUTCDate()}</span>
                                                    )}
                                                </div>
                                                <span className="text-[9px] font-bold text-[#5B2D7D]/40 uppercase">{dayName}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Manual Log Adjustment Section */}
                            <div className="bg-white p-6 rounded-[32px] shadow-sm mb-6">
                                <h3 className="text-[10px] font-black text-[#5B2D7D]/40 uppercase tracking-widest mb-4">Adjust History</h3>
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
                                                    <span className="text-sm font-bold text-[#5B2D7D]">
                                                        {daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                    </span>
                                                    <span className="text-[10px] text-[#5B2D7D]/40 font-black uppercase tracking-widest">{logsForDay.length} logs</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => handleAdjustHistory(dateStr, -1)}
                                                        disabled={isLogging}
                                                        className="w-8 h-8 rounded-full bg-transparent flex items-center justify-center text-[#5B2D7D] active:scale-90 transition-all disabled:opacity-50"
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleOpenLogDrawer('DONE', dateStr)}
                                                        disabled={isLogging}
                                                        className="w-8 h-8 rounded-full bg-[#5B2D7D] flex items-center justify-center text-white active:scale-90 transition-all disabled:opacity-50"
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
        <Drawer open={showAnomaly} onOpenChange={setShowAnomaly}>
            <DrawerContent className="bg-[#FDF2EC]/90 backdrop-blur-xl border-none font-[Outfit]">
                <DrawerHeader className="sr-only">
                    <DrawerTitle>Pause Habit</DrawerTitle>
                    <DrawerDescription>Select a reason to pause your habit for today.</DrawerDescription>
                </DrawerHeader>
                <div className="p-6 pb-12">
                    <div className="text-center mb-6">
                        <h3 className="text-xl font-bold text-[#5B2D7D]">Pause for today?</h3>
                        <p className="text-[#5B2D7D]/60 text-sm mt-1 px-4">Life happens. Select a reason to protect your streak while you rest.</p>
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
                                className="bg-white p-5 rounded-[24px] flex flex-col items-center justify-center gap-2 hover:bg-[#5B2D7D]/5 transition-colors border border-transparent active:border-[#5B2D7D]/10"
                            >
                                <opt.icon className="w-6 h-6 text-[#5B2D7D]/70" />
                                <span className="text-xs font-bold text-[#5B2D7D]">{opt.label}</span>
                            </motion.button>
                        ))}
                    </div>
                </div>
            </DrawerContent>
        </Drawer>

        {/* Level Up Drawer */}
        <Drawer open={!!upgradeData} onOpenChange={(o) => !o && setUpgradeData(null)}>
            <DrawerContent className="bg-[#5B2D7D] text-white rounded-t-[32px] border-none font-[Outfit]">
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
                             className="w-full py-4 bg-[#A4C538] text-[#5B2D7D] rounded-[20px] font-bold shadow-xl hover:bg-[#93B132] transition-colors"
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
                // Get Cloudinary Signature
                const { getCloudinarySignature } = await import("@/app/actions/upload");
                const signatureData = await getCloudinarySignature();
                const { signature, timestamp, folder, cloudName, apiKey } = signatureData;

                const formData = new FormData();
                formData.append("file", file);
                formData.append("api_key", apiKey!);
                formData.append("timestamp", timestamp.toString());
                formData.append("signature", signature);
                formData.append("folder", folder);

                const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
                    method: "POST",
                    body: formData,
                });

                if (!response.ok) throw new Error("Upload failed");

                const data = await response.json();
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
        <Drawer open={isOpen} onOpenChange={(o) => !o && onClose()}>
            <DrawerContent className="bg-[#FDF2EC]/90 backdrop-blur-xl rounded-t-[32px] border-none font-[Outfit] max-h-[90vh]">
                <DrawerHeader className="sr-only">
                    <DrawerTitle>Log Habit Progress</DrawerTitle>
                    <DrawerDescription>Add a comment or photo to your habit track for {displayDate}.</DrawerDescription>
                </DrawerHeader>
                <div className="p-6 pb-12 overflow-y-auto no-scrollbar">
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center text-3xl mb-4">
                            {type === 'DONE' ? (coreHabit?.icon || '✨') : '⏸️'}
                        </div>
                        <h3 className="text-xl font-bold text-[#5B2D7D]">
                            {type === 'DONE' ? `Log ${habit.title}` : `Pause: ${type}`}
                        </h3>
                        <p className="text-[#5B2D7D]/40 text-xs font-bold uppercase tracking-widest mt-1">{displayDate}</p>
                    </div>

                    <div className="space-y-6">
                        {/* Comment/Notes */}
                        <div>
                            <label className="block text-[10px] font-black text-[#5B2D7D]/40 uppercase tracking-widest mb-2 ml-1">Optional Comment</label>
                            <textarea 
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="How did it go? Any reflections?"
                                rows={3}
                                className="w-full bg-white border border-[#5B2D7D]/10 rounded-[20px] p-4 text-[#5B2D7D] text-sm outline-none resize-none focus:ring-1 focus:ring-[#5B2D7D]/20 transition-all"
                            />
                        </div>

                        {/* Image Upload */}
                        <div>
                            <label className="block text-[10px] font-black text-[#5B2D7D]/40 uppercase tracking-widest mb-2 ml-1">Optional Photo</label>
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
                                    className="w-full aspect-video bg-white/60 border-2 border-dashed border-[#5B2D7D]/10 rounded-[24px] flex flex-col items-center justify-center gap-2 hover:bg-white/80 transition-all active:scale-[0.98]"
                                >
                                    {isUploading ? (
                                        <Loader2 className="w-6 h-6 animate-spin text-[#5B2D7D]/40" />
                                    ) : (
                                        <>
                                            <div className="w-10 h-10 rounded-full bg-[#5B2D7D]/5 flex items-center justify-center text-[#5B2D7D]/40">
                                                <Plus className="w-5 h-5" />
                                            </div>
                                            <span className="text-[10px] font-black text-[#5B2D7D]/40 uppercase tracking-widest">Snap or Upload</span>
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
                                type === 'DONE' ? 'bg-[#A4C538] text-[#5B2D7D]' : 'bg-[#EAB308] text-white'
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

function ContributionGraph({ logs, startDate, isWeekly }: { logs: HabitLog[], startDate: Date, isWeekly?: boolean }) {
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
        const logMap = new Map();
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
            logMap.set(s, { type: l.logType, streak: runningS });
            lastDStr = s;
        });

        const getColorClass = (date: Date) => {
            const s = date.getUTCFullYear() + '-' + (date.getUTCMonth() + 1) + '-' + date.getUTCDate();
            const data = logMap.get(s);
            if (!data) return 'bg-transparent border border-[#5B2D7D]/5 text-[#5B2D7D]/20';
            if (data.type !== 'DONE') return 'bg-[#EAB308] text-white';
            
            const streak = data.streak;
            if (streak > 9) return 'bg-[#44337A] text-white';
            if (streak > 6) return 'bg-[#6B46C1] text-white';
            if (streak > 3) return 'bg-[#9F7AEA] text-white';
            return 'bg-[#D6BCFA] text-[#5B2D7D]';
        };

        return (
            <div className="flex justify-between items-end gap-1 px-2 py-2">
                {days.map((date, i) => {
                    const dateStr = date.getUTCFullYear() + '-' + (date.getUTCMonth() + 1) + '-' + date.getUTCDate();
                    const hasLog = logMap.has(dateStr);
                    
                    return (
                        <div key={i} className="flex flex-col items-center gap-2 flex-1 max-w-[40px]">
                            <div className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all ${getColorClass(date)}`}>
                                {hasLog ? (
                                    <Check className="w-4 h-4" strokeWidth={3} />
                                ) : (
                                    <span className="text-[10px] font-black">{date.getUTCDate()}</span>
                                )}
                            </div>
                            <span className="text-[9px] font-bold text-[#5B2D7D]/40 uppercase">
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

    const logMap = new Map();
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
        logMap.set(dateStr, { type: l.logType, streakAtDate: runningStreak });
        lastDateStr = dateStr;
    });

    const getColor = (data?: { type: HabitLogType, streakAtDate: number }) => {
        if (!data) return 'bg-transparent border border-[#5B2D7D]/5';
        if (data.type !== 'DONE') return 'bg-[#EAB308]'; 
        const streak = data.streakAtDate;
        if (streak <= 3) return 'bg-[#D6BCFA]'; 
        if (streak <= 6) return 'bg-[#9F7AEA]'; 
        if (streak <= 9) return 'bg-[#6B46C1]'; 
        return 'bg-[#44337A]'; 
    };

    const cellSize = '28px';
    const cellGap = '4px';

    return (
        <div className="flex flex-col gap-2 select-none w-full">
            <div ref={scrollRef} className="overflow-x-auto no-scrollbar scroll-smooth w-full">
                <div className="flex gap-4 min-w-max pb-2">
                    {monthsData.map((month, mIdx) => (
                        <div key={mIdx} className="flex flex-col gap-2">
                            <div className="text-[10px] font-black text-[#5B2D7D]/40 uppercase tracking-widest px-1">{month.name}</div>
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
                                    return (
                                        <div key={dIdx} className={`rounded-[10px] transition-all ${getColor(data)} ${isFuture ? 'opacity-0' : 'flex items-center justify-center shadow-xs'}`} style={{ width: cellSize, height: cellSize }}>
                                            {!isFuture && <span className={`text-[9px] font-black ${data ? 'text-white' : 'text-[#5B2D7D]/20'}`}>{date.getUTCDate()}</span>}
                                        </div>
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

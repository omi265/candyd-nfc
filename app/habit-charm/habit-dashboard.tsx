"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { logHabit, toggleHabitDate, adjustHabitLogs, upgradeHabit, declineUpgrade, updateHabit, deleteHabit, createHabit } from "@/app/actions/habit";
import { Check, Flame, Trophy, Calendar, Plus, Pencil, ChevronLeft, ChevronRight, AlertTriangle, Minus, Loader2, Plane, BedDouble, Frown, Briefcase, HelpCircle, ArrowUpCircle, Trash2, Target, Save, X } from "lucide-react";
import { toast } from "sonner";
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
    const [viewMode, setViewMode] = useState<'cards' | 'history'>('cards');
    const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[#FDF2EC] flex flex-col font-[Outfit] relative overflow-hidden">
             {/* Background Decoration */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-[#A4C538]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
             <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#5B2D7D]/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

             {/* Header */}
             <header className="p-6 flex items-center justify-between z-10 shrink-0">
                 <div className="flex flex-col">
                     <span className="text-sm font-bold text-[#5B2D7D]/50 uppercase tracking-widest">Habit Charm</span>
                     <h1 className="text-2xl font-bold text-[#5B2D7D]">{product.name}</h1>
                 </div>
                 <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setViewMode(prev => prev === 'cards' ? 'history' : 'cards')}
                        className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-[#5B2D7D] hover:bg-[#EADDDE] transition-colors"
                    >
                        {viewMode === 'cards' ? <Calendar className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
                    </button>
                    {habits.length < 10 && (
                        <button 
                            onClick={() => setIsAddDrawerOpen(true)}
                            className="w-12 h-12 rounded-full bg-[#5B2D7D] shadow-sm flex items-center justify-center text-white hover:bg-[#4A246A] transition-colors"
                        >
                            <Plus className="w-6 h-6" />
                        </button>
                    )}
                 </div>
             </header>

             {/* Main Content */}
             <main className="flex-1 p-4 pt-0 z-10 overflow-y-auto no-scrollbar pb-32">
                 {viewMode === 'cards' ? (
                     <div className="grid grid-cols-2 gap-3 w-full">
                        {habits.map(habit => (
                            <HabitCard key={habit.id} habit={habit} />
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
             />
        </div>
    );
}

function AddHabitDrawer({ productId, isOpen, onClose }: { productId: string, isOpen: boolean, onClose: () => void }) {
    const [title, setTitle] = useState("");
    const [targetDays, setTargetDays] = useState(66);
    const [isSaving, setIsSaving] = useState(false);

    const handleAdd = async () => {
        if (!title.trim()) return;
        setIsSaving(true);
        try {
            const res = await createHabit(productId, {
                title: title.trim(),
                focusArea: "custom",
                targetDays,
                frequency: "daily"
            });
            if (res.success) {
                toast.success("Habit started!");
                onClose();
                setTitle("");
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
            <DrawerContent className="bg-[#FDF2EC] font-[Outfit]">
                <div className="p-6 pb-12">
                    <DrawerHeader className="px-0 text-left">
                        <DrawerTitle className="text-2xl font-bold text-[#5B2D7D]">New Habit</DrawerTitle>
                        <DrawerDescription>Consistency is the key to transformation.</DrawerDescription>
                    </DrawerHeader>

                    <div className="space-y-6 mt-4">
                        <div>
                            <label className="block text-xs font-bold text-[#5B2D7D]/40 uppercase mb-2">What is the habit?</label>
                            <input 
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Morning Meditation"
                                className="w-full px-4 py-3 rounded-xl bg-white border border-[#5B2D7D]/10 text-[#5B2D7D] outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-[#5B2D7D]/40 uppercase mb-2 flex items-center gap-1">
                                <Target className="w-3 h-3" /> Goal (Days)
                            </label>
                            <select 
                                value={targetDays}
                                onChange={(e) => setTargetDays(parseInt(e.target.value))}
                                className="w-full px-4 py-3 rounded-xl bg-white border border-[#5B2D7D]/10 text-[#5B2D7D] outline-none appearance-none"
                            >
                                <option value={21}>21 Days (Initiation)</option>
                                <option value={66}>66 Days (Habit forming)</option>
                                <option value={100}>100 Days (Mastery)</option>
                            </select>
                        </div>

                        <button 
                            onClick={handleAdd}
                            disabled={isSaving || !title.trim()}
                            className="w-full py-4 bg-[#5B2D7D] text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Start Journey"}
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
                    <div className="flex items-center gap-1.5 bg-[#FDF2EC] px-3 py-1 rounded-full">
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
                    viewRange={range}
                />
            </div>
        </div>
    );
}

function HabitCard({ habit }: { habit: HabitWithLogs }) {
    const [isLogging, setIsLogging] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showAnomaly, setShowAnomaly] = useState(false);
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
    now.setHours(0, 0, 0, 0);
    const today = now;
    
    // Count logs for today
    const todayLog = habit.logs.find(l => {
        const d = new Date(l.date);
        d.setHours(0,0,0,0);
        return d.getTime() === today.getTime();
    });

    const isLogged = !!todayLog;

    const handleLog = async (type: HabitLogType = 'DONE') => {
        if (isLogging) return;

        setIsLogging(true);
        try {
            const result = await logHabit(habit.id, undefined, type);
            if (result.error) {
                toast.error(result.error);
            } else {
                if (type === 'DONE') {
                    toast.success("Habit logged! Keep it up.");
                } else {
                    toast.success("Logged. Rest is progress too.");
                }
                setShowAnomaly(false);

                // Check for progression suggestion
                if (result.progression) {
                    setUpgradeData(result.progression);
                }
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
            await updateHabit(habit.id, { title: editTitle, targetDays: editTarget });
            toast.success("Habit updated!");
            setIsEditMode(false);
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
            await deleteHabit(habit.id);
            toast.success("Habit deleted");
            setShowHistory(false);
        } catch (e) {
            toast.error("Failed to delete");
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

    return (
        <>
        <motion.div 
            whileTap={{ scale: 0.98 }}
            className="bg-white rounded-[40px] p-4 flex flex-col items-center shadow-sm relative overflow-visible aspect-[2/3] group"
        >
            {/* Top Bar Actions */}
            <div className="absolute top-3 right-3 z-20">
                <button 
                    onClick={(e) => { e.stopPropagation(); setShowHistory(true); }}
                    className="w-11 h-11 rounded-full bg-[#5B2D7D] text-white flex items-center justify-center hover:bg-[#4A246A] shadow-md active:scale-90 transition-all"
                >
                    <Pencil className="w-4 h-4" />
                </button>
            </div>

            {/* Centered Content */}
            <div className="flex-1 flex flex-col items-center justify-end w-full pt-8 pb-4">
                
                {/* Level Badge */}
                <div className="flex flex-col items-center gap-1 mb-4">
                    <div className="bg-[#5B2D7D]/5 px-3 py-1 rounded-full text-[10px] font-black text-[#5B2D7D] uppercase tracking-widest">
                        {habit.focusArea === 'custom' ? 'Custom' : `Level ${habit.level}`}
                    </div>
                    {habit.frequency !== 'daily' && (
                        <div className="text-[9px] font-bold text-[#5B2D7D]/40 uppercase tracking-tighter">
                            {habit.frequency}
                        </div>
                    )}
                </div>

                {/* Large Logging Button */}
                <div className="relative flex items-center justify-center w-full max-w-[140px] aspect-square mb-4">
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
                        onClick={() => !isLogged && handleLog('DONE')}
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

                {/* Info */}
                <div className="text-center w-full px-1 mb-2">
                    <h3 className="font-bold text-[#5B2D7D] text-sm leading-tight mb-1 line-clamp-2">{habit.title}</h3>
                </div>

                {/* Anomaly Trigger */}
                {!isLogged && (
                    <button 
                        onClick={() => setShowAnomaly(true)}
                        className="text-[10px] font-bold text-[#5B2D7D]/40 uppercase tracking-widest hover:text-[#5B2D7D] transition-colors py-2"
                    >
                        Pause for today?
                    </button>
                )}
                 {isLogged && (
                    <div className="text-[10px] font-bold text-[#5B2D7D]/40 uppercase tracking-widest py-2">
                        {todayLog?.logType === 'DONE' ? 'Done for today' : `Paused: ${todayLog?.logType}`}
                    </div>
                )}
            </div>
        </motion.div>

        {/* History & Stats Drawer */}
        <Drawer open={showHistory} onOpenChange={(o) => { setShowHistory(o); if(!o) setIsEditMode(false); }}>
            <DrawerContent className="bg-[#FDF2EC] rounded-t-[32px] border-none font-[Outfit] max-h-[95vh]">
                <div className="p-6 pb-12 overflow-y-auto no-scrollbar">
                    {/* Header */}
                    <div className="flex flex-col items-center text-center mb-8 relative">
                        <button 
                            onClick={() => setIsEditMode(!isEditMode)}
                            className="absolute top-0 right-0 p-2 text-[#5B2D7D]/40 hover:text-[#5B2D7D]"
                        >
                            {isEditMode ? <X className="w-5 h-5" /> : <Pencil className="w-5 h-5" />}
                        </button>
                        
                        <div className="w-16 h-16 bg-[#E8DCF0] rounded-full flex items-center justify-center mb-4 text-[#5B2D7D]">
                            <Calendar className="w-8 h-8" />
                        </div>

                        {isEditMode ? (
                            <div className="w-full space-y-4 text-left">
                                <div>
                                    <label className="text-[10px] font-black text-[#5B2D7D]/40 uppercase tracking-widest mb-1 block">Title</label>
                                    <input 
                                        type="text" 
                                        value={editTitle} 
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        className="w-full bg-white border border-[#5B2D7D]/10 rounded-xl px-4 py-2 text-[#5B2D7D] font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-[#5B2D7D]/40 uppercase tracking-widest mb-1 block">Goal (Days)</label>
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
                                <div className="flex gap-3 pt-2">
                                    <button 
                                        onClick={handleDelete}
                                        className="flex-1 bg-red-50 text-red-500 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" /> Delete
                                    </button>
                                    <button 
                                        onClick={handleUpdate}
                                        className="flex-[2] bg-[#5B2D7D] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                                    >
                                        <Save className="w-4 h-4" /> Save Changes
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-xl font-bold text-[#5B2D7D]">{habit.title}</h2>
                                <p className="text-[#5B2D7D]/60 text-sm mt-1">
                                    {habit.focusArea === 'custom' ? 'Custom Habit' : `Level ${habit.level}`} • {habit.phase}
                                </p>
                            </>
                        )}
                    </div>

                    {!isEditMode && (
                        <>
                            <div className="bg-white p-5 rounded-[32px] shadow-sm mb-6 overflow-x-auto no-scrollbar">
                                <ContributionGraph 
                                    logs={habit.logs} 
                                    startDate={new Date(new Date().setDate(new Date().getDate() - 21))} 
                                    viewRange={21}
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded-2xl text-center">
                                    <div className="text-[10px] text-[#5B2D7D]/40 font-black uppercase mb-1 tracking-widest">Total Logs</div>
                                    <div className="text-3xl font-black text-[#5B2D7D]">{habit.totalCompletions}</div>
                                </div>
                                <div className="bg-white p-4 rounded-2xl text-center">
                                    <div className="text-[10px] text-[#5B2D7D]/40 font-black uppercase mb-1 tracking-widest">Max Streak</div>
                                    <div className="text-3xl font-black text-[#5B2D7D]">{habit.longestStreak}</div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </DrawerContent>
        </Drawer>

        {/* Anomaly Drawer (Pause) */}
        <Drawer open={showAnomaly} onOpenChange={setShowAnomaly}>
            <DrawerContent className="bg-[#FDF2EC] rounded-t-[32px] border-none font-[Outfit]">
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
                                onClick={() => handleLog(opt.id as HabitLogType)}
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

function ContributionGraph({ logs, startDate, viewRange = 30 }: { logs: HabitLog[], startDate: Date, viewRange?: number }) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const start = new Date(startDate);
    start.setHours(0,0,0,0);
    
    // For weekly/monthly view, we want to show exactly the range
    const dates: Date[] = [];
    const current = new Date(start);
    while (current <= today) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }

    // Map logs by date and calculate streaks per date for shading
    const logMap = new Map<string, { type: HabitLogType, streakAtDate: number }>();
    
    // Sort logs ascending to calculate historical streaks
    const sortedLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let runningStreak = 0;
    let lastDate: string | null = null;

    sortedLogs.forEach(l => {
        const d = new Date(l.date);
        d.setHours(0,0,0,0);
        const dateStr = d.toDateString();

        if (lastDate) {
            const prev = new Date(lastDate);
            const curr = new Date(dateStr);
            const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
            if (diff === 1) runningStreak++;
            else if (diff > 1) runningStreak = 1;
        } else {
            runningStreak = 1;
        }
        
        logMap.set(dateStr, { type: l.logType, streakAtDate: runningStreak });
        lastDate = dateStr;
    });

    const getColor = (data?: { type: HabitLogType, streakAtDate: number }) => {
        if (!data) return 'bg-[#EADDDE]/50';
        if (data.type !== 'DONE') return 'bg-[#EAB308]'; 
        
        const streak = data.streakAtDate;
        if (streak <= 3) return 'bg-[#D6BCFA]'; 
        if (streak <= 6) return 'bg-[#9F7AEA]'; 
        if (streak <= 9) return 'bg-[#6B46C1]'; 
        return 'bg-[#44337A]'; 
    };

    const cellSizeClass = viewRange <= 7 ? 'w-11 h-11 rounded-xl' : 'w-9 h-9 rounded-lg';
    const gapClass = 'gap-2';

    return (
        <div className="flex items-center">
            <div className={`flex flex-nowrap ${gapClass} pb-2`}>
                {dates.map((date) => {
                    const data = logMap.get(date.toDateString());
                    const colorClass = getColor(data);
                    
                    return (
                        <div 
                            key={date.toISOString()} 
                            className={`${cellSizeClass} ${colorClass} transition-all flex flex-col items-center justify-center relative shrink-0`}
                        >
                            <span className={`text-[10px] font-black ${data ? 'text-white' : 'text-[#5B2D7D]/30'}`}>
                                {date.getDate()}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

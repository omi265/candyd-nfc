"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { logHabit, toggleHabitDate, adjustHabitLogs, upgradeHabit, declineUpgrade } from "@/app/actions/habit";
import { Check, Flame, Trophy, Calendar, Plus, Pencil, ChevronLeft, ChevronRight, AlertTriangle, Minus, Loader2, Plane, BedDouble, Frown, Briefcase, HelpCircle, ArrowUpCircle } from "lucide-react";
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
                 <button 
                    onClick={() => setViewMode(prev => prev === 'cards' ? 'history' : 'cards')}
                    className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-[#5B2D7D] hover:bg-[#EADDDE] transition-colors"
                 >
                     {viewMode === 'cards' ? <Calendar className="w-6 h-6" /> : <Plus className="w-6 h-6 rotate-45" />}
                 </button>
             </header>

             {/* Main Content */}
             <main className="flex-1 p-6 pt-0 z-10 overflow-y-auto no-scrollbar pb-24">
                 {viewMode === 'cards' ? (
                     <div className="grid grid-cols-2 gap-4 w-full">
                        {habits.map(habit => (
                            <HabitCard key={habit.id} habit={habit} />
                        ))}
                     </div>
                 ) : (
                     <div className="flex flex-col gap-4 w-full">
                        {habits.map(habit => (
                            <HabitHistoryCard key={habit.id} habit={habit} />
                        ))}
                     </div>
                 )}
             </main>
        </div>
    );
}

function HabitHistoryCard({ habit }: { habit: HabitWithLogs }) {
    const today = new Date();
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - 120);
    
    const created = new Date(habit.createdAt);
    const startDate = created < pastDate ? created : pastDate;

    return (
        <div className="bg-white rounded-[32px] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-[#5B2D7D]">{habit.title}</h3>
                    <div className="text-xs font-bold text-[#5B2D7D]/40 uppercase tracking-wider">Level {habit.level}</div>
                </div>
                <div className="flex items-center gap-1.5 bg-[#FDF2EC] px-3 py-1 rounded-full">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-bold text-[#5B2D7D]">{habit.currentStreak}</span>
                </div>
            </div>
            <ContributionGraph 
                logs={habit.logs} 
                startDate={startDate} 
            />
        </div>
    );
}

function HabitCard({ habit }: { habit: HabitWithLogs }) {
    const [isLogging, setIsLogging] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showAnomaly, setShowAnomaly] = useState(false);
    const [upgradeData, setUpgradeData] = useState<any>(null); // { nextLevel, message }
    
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
        <div className="bg-white rounded-[40px] p-4 flex flex-col items-center shadow-sm relative overflow-visible aspect-[2/3] group">
            {/* Top Bar Actions */}
            <div className="absolute top-4 right-4 z-20">
                <button 
                    onClick={(e) => { e.stopPropagation(); setShowHistory(true); }}
                    className="w-10 h-10 rounded-full bg-[#5B2D7D] text-white flex items-center justify-center hover:bg-[#4A246A] shadow-md transition-colors"
                >
                    <Pencil className="w-4 h-4" />
                </button>
            </div>

            {/* Centered Content */}
            <div className="flex-1 flex flex-col items-center justify-end w-full pt-8 pb-4">
                
                {/* Level Badge */}
                <div className="mb-4 bg-[#5B2D7D]/5 px-3 py-1 rounded-full text-[10px] font-black text-[#5B2D7D] uppercase tracking-widest">
                    Level {habit.level}
                </div>

                {/* Large Logging Button */}
                <div className="relative flex items-center justify-center w-36 h-36 mb-4">
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
                        className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all shadow-xl active:scale-95 z-10 shrink-0 ${
                            isLogged 
                            ? (todayLog?.logType === 'DONE' ? 'bg-[#A4C538] text-[#5B2D7D] shadow-[#A4C538]/20' : 'bg-[#EAB308] text-white shadow-[#EAB308]/20')
                            : 'bg-[#FDF2EC] text-[#5B2D7D] hover:bg-[#EADDDE] hover:shadow-2xl'
                        }`}
                    >
                        <div className="flex flex-col items-center justify-center">
                            {isLogged ? (
                                <Check className="w-12 h-12" strokeWidth={3} />
                            ) : (
                                <span className="text-4xl">{coreHabit?.icon || '✨'}</span>
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
                    <h3 className="font-bold text-[#5B2D7D] text-base leading-tight mb-1 line-clamp-2">{habit.title}</h3>
                </div>

                {/* Anomaly Trigger */}
                {!isLogged && (
                    <button 
                        onClick={() => setShowAnomaly(true)}
                        className="text-[10px] font-bold text-[#5B2D7D]/40 uppercase tracking-widest hover:text-[#5B2D7D] transition-colors py-2"
                    >
                        Life happened?
                    </button>
                )}
                 {isLogged && (
                    <div className="text-[10px] font-bold text-[#5B2D7D]/40 uppercase tracking-widest py-2">
                        {todayLog?.logType === 'DONE' ? 'Done for today' : `Logged: ${todayLog?.logType}`}
                    </div>
                )}
            </div>
        </div>

        {/* History & Stats Drawer */}
        <Drawer open={showHistory} onOpenChange={setShowHistory}>
            <DrawerContent className="bg-[#FDF2EC] rounded-t-[32px] border-none font-[Outfit] max-h-[95vh]">
                <div className="p-6 pb-12 overflow-y-auto no-scrollbar">
                    {/* Header */}
                    <div className="flex flex-col items-center text-center mb-8">
                        <div className="w-16 h-16 bg-[#E8DCF0] rounded-full flex items-center justify-center mb-4 text-[#5B2D7D]">
                            <Calendar className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-bold text-[#5B2D7D]">{habit.title}</h2>
                        <p className="text-[#5B2D7D]/60 text-sm mt-1">Level {habit.level} • {habit.phase}</p>
                    </div>

                    <div className="bg-white p-6 rounded-[32px] shadow-sm mb-6">
                        <ContributionGraph 
                            logs={habit.logs} 
                            startDate={new Date(new Date().setDate(new Date().getDate() - 28))} 
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-2xl text-center">
                            <div className="text-xs text-[#5B2D7D]/40 font-bold uppercase mb-1">Total Logs</div>
                            <div className="text-3xl font-black text-[#5B2D7D]">{habit.totalCompletions}</div>
                        </div>
                        <div className="bg-white p-4 rounded-2xl text-center">
                            <div className="text-xs text-[#5B2D7D]/40 font-bold uppercase mb-1">Max Streak</div>
                            <div className="text-3xl font-black text-[#5B2D7D]">{habit.longestStreak}</div>
                        </div>
                    </div>
                </div>
            </DrawerContent>
        </Drawer>

        {/* Anomaly Drawer */}
        <Drawer open={showAnomaly} onOpenChange={setShowAnomaly}>
            <DrawerContent className="bg-[#FDF2EC] rounded-t-[32px] border-none font-[Outfit]">
                <div className="p-6 pb-12">
                    <div className="text-center mb-6">
                        <h3 className="text-xl font-bold text-[#5B2D7D]">Life happened?</h3>
                        <p className="text-[#5B2D7D]/60 text-sm mt-1">Consistency is about coming back. Log what&apos;s real.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { id: 'SICK', icon: BedDouble, label: "Sick / Rest" },
                            { id: 'TRAVEL', icon: Plane, label: "Traveling" },
                            { id: 'STRESSED', icon: Frown, label: "Stressed" },
                            { id: 'BUSY', icon: Briefcase, label: "Busy" },
                            { id: 'OTHER', icon: HelpCircle, label: "Other" },
                        ].map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => handleLog(opt.id as HabitLogType)}
                                className="bg-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-[#5B2D7D]/5 transition-colors"
                            >
                                <opt.icon className="w-6 h-6 text-[#5B2D7D]/70" />
                                <span className="text-sm font-bold text-[#5B2D7D]">{opt.label}</span>
                            </button>
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

                     <div className="flex gap-4 w-full">
                         <button 
                            onClick={handleDeclineUpgrade}
                            className="flex-1 py-4 rounded-2xl font-bold text-white/50 hover:bg-white/10 transition-colors"
                         >
                             Not Now
                         </button>
                         <button 
                             onClick={handleUpgrade}
                             className="flex-1 py-4 bg-[#A4C538] text-[#5B2D7D] rounded-2xl font-bold shadow-xl hover:bg-[#93B132] transition-colors"
                         >
                             Accept Challenge
                         </button>
                     </div>
                 </div>
            </DrawerContent>
        </Drawer>
        </>
    );
}

function ContributionGraph({ logs, startDate }: { logs: HabitLog[], startDate: Date }) {
    // Reuse previous logic but handle LogType colors
    const today = new Date();
    today.setHours(0,0,0,0);
    const start = new Date(startDate);
    start.setHours(0,0,0,0);
    const dayOfWeek = start.getDay();
    start.setDate(start.getDate() - dayOfWeek);
    
    const dates: Date[] = [];
    const current = new Date(start);
    const end = new Date(today);
    end.setDate(end.getDate() + (6 - end.getDay()));
    while (current <= end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }

    // Map logs by date
    const logMap = new Map<string, HabitLogType[]>();
    logs.forEach(l => {
        const d = new Date(l.date).toDateString();
        const existing = logMap.get(d) || [];
        existing.push(l.logType);
        logMap.set(d, existing);
    });

    const weeksCount = Math.ceil(dates.length / 7);
    let cellSizeClass = 'w-3.5 h-3.5';
    let gapClass = 'gap-1';
    
    // Auto-responsive logic
    if (weeksCount <= 5) {
        cellSizeClass = 'w-10 h-10 rounded-lg';
        gapClass = 'gap-2';
    } else if (weeksCount <= 13) {
        cellSizeClass = 'w-6 h-6 rounded-md';
        gapClass = 'gap-1.5';
    }

    const getColor = (types: HabitLogType[]) => {
        if (!types || types.length === 0) return 'bg-[#EADDDE]/50';
        if (types.includes('DONE')) return 'bg-[#5B2D7D]';
        // Priority: DONE > SICK/TRAVEL/etc.
        return 'bg-[#EAB308]'; // Yellow for protected days
    };

    return (
        <div className="flex items-start gap-3">
             <div className="overflow-x-auto pb-2 custom-scrollbar flex-1">
                <div className={`grid grid-rows-7 grid-flow-col ${gapClass}`} style={{ gridTemplateColumns: `repeat(${weeksCount}, min-content)` }}>
                    {dates.map((date) => {
                        const types = logMap.get(date.toDateString());
                        const colorClass = getColor(types || []);
                        const isFuture = date > today;
                        
                        return (
                            <div 
                                key={date.toISOString()} 
                                className={`${cellSizeClass} transition-all flex items-center justify-center rounded-[3px] ${colorClass} ${isFuture ? 'opacity-0' : ''}`} 
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

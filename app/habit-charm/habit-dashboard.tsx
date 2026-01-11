"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { logHabit, toggleHabitDate } from "@/app/actions/habit";
import { Check, Flame, Trophy, Calendar, Plus, Pencil, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Habit, HabitLog, Product } from "@prisma/client";
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
                        
                        {habits.length < 6 && (
                            <div className="aspect-[3/4] flex flex-col items-center justify-center border-2 border-dashed border-[#5B2D7D]/10 rounded-[40px] text-[#5B2D7D]/20">
                                 <Plus className="w-8 h-8 opacity-20" />
                            </div>
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
        </div>
    );
}

function HabitHistoryCard({ habit }: { habit: HabitWithLogs }) {
    const handleToggleDate = async (date: Date) => {
        try {
            const result = await toggleHabitDate(habit.id, date);
            if (result.error) toast.error(result.error);
            else toast.success("Updated history");
        } catch (e) {
            toast.error("Failed to update");
        }
    };

    const today = new Date();
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - 120);
    
    const created = new Date(habit.createdAt);
    const startDate = created < pastDate ? created : pastDate;

    return (
        <div className="bg-white rounded-[32px] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-[#5B2D7D]">{habit.title}</h3>
                <div className="flex items-center gap-1.5 bg-[#FDF2EC] px-3 py-1 rounded-full">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-bold text-[#5B2D7D]">{habit.currentStreak}</span>
                </div>
            </div>
            <ContributionGraph 
                logs={habit.logs} 
                startDate={startDate} 
                onToggle={handleToggleDate}
            />
        </div>
    );
}

function HabitCard({ habit }: { habit: HabitWithLogs }) {
    const [isLogging, setIsLogging] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastLog = habit.logs[0];
    const lastLogDate = lastLog ? new Date(lastLog.date) : null;
    if (lastLogDate) lastLogDate.setHours(0,0,0,0);
    
    const isLoggedToday = !!(lastLogDate && lastLogDate.getTime() === today.getTime());

    const handleLog = async () => {
        if (isLoggedToday || isLogging) return;

        setIsLogging(true);
        try {
            const result = await logHabit(habit.id);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(`${habit.title} logged!`);
            }
        } catch (error) {
            toast.error("Failed to log.");
        } finally {
            setIsLogging(false);
        }
    };

    const handleToggleDate = async (date: Date) => {
        try {
            const result = await toggleHabitDate(habit.id, date);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Updated history");
            }
        } catch (e) {
            toast.error("Failed to update");
        }
    };

    const getIcon = (area: string) => {
        switch(area) {
            case 'energy': return '⚡';
            case 'movement': return '🏃';
            case 'rest': return '🌙';
            case 'mind': return '🧠';
            case 'connection': return '❤️';
            default: return '✨';
        }
    };

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
            <div className="flex-1 flex flex-col items-center justify-end w-full pt-8">
                
                {/* Large Logging Button with Circular Progress */}
                <div className="relative flex items-center justify-center w-40 h-40">
                    <svg 
                        className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none z-0"
                        viewBox="0 0 100 100"
                    >
                        <circle cx="50" cy="50" r="46" fill="none" stroke="#FDF2EC" strokeWidth="5" />
                        <motion.circle
                            cx="50" cy="50" r="46" fill="none"
                            stroke={isLoggedToday ? "#A4C538" : "#5B2D7D"}
                            strokeWidth="5" strokeLinecap="round" pathLength="100"
                            initial={{ strokeDasharray: "0 100" }}
                            animate={{ strokeDasharray: `${progress} 100` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                        />
                    </svg>

                    <button
                        onClick={handleLog}
                        disabled={isLogging || isLoggedToday}
                        className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all shadow-xl active:scale-95 z-10 shrink-0 ${
                            isLoggedToday ? 'bg-[#A4C538] text-[#5B2D7D] shadow-[#A4C538]/20' : 'bg-[#FDF2EC] text-[#5B2D7D] hover:bg-[#EADDDE] hover:shadow-2xl'
                        }`}
                    >
                        <div className={`text-5xl transition-transform ${isLoggedToday ? 'scale-110' : ''}`}>
                            {isLoggedToday ? <Check className="w-14 h-14" strokeWidth={4} /> : getIcon(habit.focusArea)}
                        </div>
                        {isLogging && (
                            <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] rounded-full flex items-center justify-center">
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-10 h-10 border-4 border-[#5B2D7D]/20 border-t-[#5B2D7D] rounded-full" />
                            </div>
                        )}
                    </button>
                </div>

                {/* Info */}
                <div className="text-center w-full px-1">
                    <h3 className="font-bold text-[#5B2D7D] text-lg leading-tight mb-2 line-clamp-2">{habit.title}</h3>
                    <div className="flex items-center justify-center gap-1.5 bg-[#FDF2EC]/50 py-1.5 px-4 rounded-full mx-auto w-fit">
                        <Flame className={`w-4 h-4 ${isLoggedToday ? 'text-orange-600' : 'text-[#5B2D7D]/40'}`} />
                        <span className="text-sm font-black text-[#5B2D7D]/70">{habit.currentStreak} / {habit.targetDays}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* History & Stats Drawer */}
        <Drawer open={showHistory} onOpenChange={setShowHistory}>
            <DrawerContent className="bg-[#FDF2EC] rounded-t-[32px] border-none font-[Outfit] max-h-[95vh]">
                <DrawerTitle className="sr-only">Habit History</DrawerTitle>
                <DrawerDescription className="sr-only">View and edit your habit history.</DrawerDescription>
                <div className="p-6 pb-12 overflow-y-auto no-scrollbar">
                    <div className="flex flex-col items-center text-center mb-8">
                        <div className="w-16 h-16 bg-[#E8DCF0] rounded-full flex items-center justify-center mb-4 text-[#5B2D7D]">
                            <Calendar className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-bold text-[#5B2D7D]">{habit.title}</h2>
                        <p className="text-[#5B2D7D]/60 text-sm mt-1">Consistency Overview</p>
                    </div>

                    <div className="bg-white p-6 rounded-[32px] shadow-sm mb-6">
                        <ContributionGraph 
                            logs={habit.logs} 
                            startDate={new Date(new Date().setDate(new Date().getDate() - 120))} 
                            onToggle={handleToggleDate}
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
        </>
    );
}

function ContributionGraph({ logs, startDate, onToggle }: { logs: HabitLog[], startDate: Date, onToggle?: (date: Date) => void }) {
    const [confirmingDate, setConfirmingDate] = useState<Date | null>(null);
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
    const logSet = new Set(logs.map(l => new Date(l.date).toDateString()));
    const weeksCount = Math.ceil(dates.length / 7);
    let cellSizeClass = 'w-3.5 h-3.5';
    let gapClass = 'gap-1';
    let containerClass = 'w-fit';
    if (weeksCount <= 5) {
        cellSizeClass = 'w-10 h-10 rounded-lg';
        gapClass = 'gap-2';
        containerClass = 'w-full justify-start'; 
    } else if (weeksCount <= 13) {
        cellSizeClass = 'w-6 h-6 rounded-md';
        gapClass = 'gap-1.5';
    }

    const handleDayClick = (date: Date) => {
        if (!onToggle) return;
        if (date.getTime() === today.getTime()) {
            onToggle(date);
        } else {
            setConfirmingDate(date);
        }
    };

    const confirmToggle = () => {
        if (confirmingDate && onToggle) {
            onToggle(confirmingDate);
            setConfirmingDate(null);
        }
    };

    return (
        <div className="relative">
            <AnimatePresence>
                {confirmingDate && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute inset-0 z-20 bg-[#FDF2EC]/95 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-4 text-center border border-[#5B2D7D]/10"
                    >
                        <h3 className="text-sm font-bold text-[#5B2D7D] mb-1">Update {confirmingDate.toLocaleDateString()}?</h3>
                        <div className="flex gap-2 w-full mt-2">
                            <button onClick={() => setConfirmingDate(null)} className="flex-1 py-2 rounded-lg bg-white border text-xs font-bold">Cancel</button>
                            <button onClick={confirmToggle} className="flex-1 py-2 rounded-lg bg-[#5B2D7D] text-white text-xs font-bold">Confirm</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="overflow-x-auto pb-2 custom-scrollbar">
                <div className={`grid grid-rows-7 grid-flow-col ${gapClass} ${containerClass}`} style={{ gridTemplateColumns: weeksCount <= 5 ? `repeat(${weeksCount}, 1fr)` : `repeat(${weeksCount}, min-content)` }}>
                    {dates.map((date) => {
                        const isDone = logSet.has(date.toDateString());
                        const isToday = date.getTime() === today.getTime();
                        const isFuture = date > today;
                        return (
                            <button 
                                key={date.toISOString()} 
                                disabled={isFuture || !onToggle}
                                onClick={() => handleDayClick(date)}
                                className={`${cellSizeClass} transition-all flex items-center justify-center rounded-[3px] ${isDone ? 'bg-[#5B2D7D]' : 'bg-[#EADDDE]/50'} ${isToday ? 'ring-1 ring-[#5B2D7D] ring-offset-1 z-10' : ''} ${isFuture ? 'opacity-0' : ''}`} 
                            />
                        );
                    })}
                </div>
            </div>
            <div className="flex justify-between text-[10px] text-[#5B2D7D]/40 mt-2 px-1 font-bold uppercase tracking-tighter">
                <span>{start.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}</span>
                <span>History Summary</span>
                <span>Today</span>
            </div>
        </div>
    );
}
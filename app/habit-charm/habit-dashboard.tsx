"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { logHabit } from "@/app/actions/habit";
import { Check, Flame, Trophy, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Habit, HabitLog, Product } from "@prisma/client";

type HabitWithLogs = Habit & { logs: HabitLog[] };

export default function HabitDashboard({ habit, product }: { habit: HabitWithLogs, product: Product }) {
    const [isLogging, setIsLogging] = useState(false);
    
    // Check if logged today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastLog = habit.logs[0];
    const lastLogDate = lastLog ? new Date(lastLog.date) : null;
    if (lastLogDate) lastLogDate.setHours(0,0,0,0);
    
    const isLoggedToday = lastLogDate && lastLogDate.getTime() === today.getTime();

    const handleLog = async () => {
        setIsLogging(true);
        try {
            const result = await logHabit(habit.id);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Marked as done!");
                // Trigger visual celebration?
            }
        } catch (error) {
            toast.error("Failed to log.");
        } finally {
            setIsLogging(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDF2EC] flex flex-col font-[Outfit] relative overflow-hidden">
             {/* Background Decoration */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-[#A4C538]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
             <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#5B2D7D]/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

             {/* Header */}
             <header className="p-6 flex items-center justify-between z-10">
                 <div className="flex flex-col">
                     <span className="text-sm font-bold text-[#5B2D7D]/50 uppercase tracking-widest">Habit Charm</span>
                     <h1 className="text-2xl font-bold text-[#5B2D7D]">{habit.title}</h1>
                 </div>
                 <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                     <div className="text-lg">
                        {habit.focusArea === 'energy' && '⚡'}
                        {habit.focusArea === 'movement' && '🏃'}
                        {habit.focusArea === 'rest' && '🌙'}
                        {habit.focusArea === 'mind' && '🧠'}
                        {habit.focusArea === 'connection' && '❤️'}
                     </div>
                 </div>
             </header>

             {/* Main Content */}
             <main className="flex-1 flex flex-col items-center justify-center p-6 z-10">
                 
                 {/* Streak Display */}
                 <div className="mb-12 flex flex-col items-center">
                     <div className="flex items-center gap-2 mb-2">
                         <Flame className={`w-6 h-6 ${isLoggedToday ? 'text-orange-500' : 'text-[#5B2D7D]/30'}`} />
                         <span className="text-6xl font-black text-[#5B2D7D]">{habit.currentStreak}</span>
                     </div>
                     <span className="text-[#5B2D7D]/60 font-medium">day streak</span>
                 </div>

                 {/* Interaction Circle */}
                 <div className="relative">
                     {isLoggedToday ? (
                         <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-48 h-48 rounded-full bg-[#A4C538] flex flex-col items-center justify-center shadow-lg shadow-[#A4C538]/30"
                         >
                             <Check className="w-16 h-16 text-[#5B2D7D] mb-2" strokeWidth={3} />
                             <span className="text-[#5B2D7D] font-bold text-lg">Done</span>
                         </motion.div>
                     ) : (
                         <button
                            onClick={handleLog}
                            disabled={isLogging}
                            className="group relative w-48 h-48 rounded-full bg-white flex flex-col items-center justify-center shadow-xl transition-all active:scale-95 hover:shadow-2xl"
                         >
                             {/* Pulse Effect */}
                             <span className="absolute inset-0 rounded-full border-2 border-[#5B2D7D]/10 animate-ping"></span>
                             
                             {isLogging ? (
                                 <motion.div 
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 1 }}
                                    className="w-12 h-12 border-4 border-[#5B2D7D]/20 border-t-[#5B2D7D] rounded-full"
                                 />
                             ) : (
                                 <>
                                     <div className="w-16 h-16 rounded-full bg-[#FDF2EC] flex items-center justify-center mb-3 group-hover:bg-[#EADDDE] transition-colors">
                                        <div className="w-8 h-8 rounded-full bg-[#5B2D7D]" />
                                     </div>
                                     <span className="text-[#5B2D7D] font-bold text-lg">Tap to Log</span>
                                 </>
                             )}
                         </button>
                     )}
                 </div>

                 {/* Progress to Graduation */}
                 <div className="mt-16 w-full max-w-xs">
                     <div className="flex justify-between text-xs text-[#5B2D7D]/50 mb-2 font-bold uppercase tracking-wider">
                         <span>Progress</span>
                         <span>{habit.currentStreak} / {habit.targetDays}</span>
                     </div>
                     <div className="h-3 w-full bg-[#5B2D7D]/5 rounded-full overflow-hidden">
                         <motion.div 
                            className="h-full bg-[#5B2D7D]"
                            initial={{ width: 0 }}
                            animate={{ width: `${(habit.currentStreak / habit.targetDays) * 100}%` }}
                         />
                     </div>
                 </div>

             </main>
        </div>
    );
}

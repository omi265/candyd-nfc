"use client";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HABIT_FOCUS_AREAS } from "@/lib/habit-templates";
import { createHabit, logHabit } from "@/app/actions/habit";
import { Loader2, ArrowRight, Check, Flame, Zap } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface HabitCharmDrawerProps {
  product: any | null; // Product with habits included
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HabitCharmDrawer({ product, open, onOpenChange }: HabitCharmDrawerProps) {
  const activeHabit = product?.habits?.find((h: any) => h.isActive);

  if (!product) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-[#FDF2EC]/95 backdrop-blur-xl border-t border-white/30 max-h-[96vh] h-full rounded-t-[32px] font-[Outfit]">
        <DrawerHeader className="sr-only">
            <DrawerTitle>Habit Charm</DrawerTitle>
            <DrawerDescription>{activeHabit ? "Track your habit" : "Setup your habit"}</DrawerDescription>
        </DrawerHeader>
        
        <div className="flex-1 overflow-y-auto no-scrollbar relative">
            {activeHabit ? (
                <HabitDashboardContent habit={activeHabit} />
            ) : (
                <HabitSetupContent product={product} />
            )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// --- Setup Content ---

function HabitSetupContent({ product }: { product: any }) {
    const [step, setStep] = useState(1);
    const [selectedArea, setSelectedArea] = useState<typeof HABIT_FOCUS_AREAS[0] | null>(null);
    const [selectedHabit, setSelectedHabit] = useState<string | null>(null);
    const [customHabit, setCustomHabit] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    const handleNext = () => setStep(step + 1);
    const handleBack = () => setStep(step - 1);

    const handleSubmit = async () => {
        if (!selectedArea || (!selectedHabit && !customHabit)) return;

        setIsSubmitting(true);
        const title = customHabit || selectedHabit || "";
        
        try {
            const result = await createHabit(product.id, {
                title,
                description: `A ${selectedArea.title.toLowerCase()} habit.`,
                focusArea: selectedArea.id,
            });

            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Habit charm activated!");
                router.refresh();
            }
        } catch (error) {
            toast.error("Something went wrong.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-6 min-h-[50vh]">
            <div className="w-full max-w-md">
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div 
                            key="step1"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex flex-col gap-6"
                        >
                            <div className="text-center">
                                <h1 className="text-3xl font-bold text-[#5B2D7D]">What season are you in?</h1>
                                <p className="text-[#5B2D7D]/60 mt-2">Choose an area to focus on gently.</p>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {HABIT_FOCUS_AREAS.map((area) => (
                                    <button
                                        key={area.id}
                                        onClick={() => {
                                            setSelectedArea(area);
                                            handleNext();
                                        }}
                                        className="bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-4 text-left group border border-transparent hover:border-[#5B2D7D]/20"
                                    >
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${area.color}`}>
                                            {area.icon}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-[#5B2D7D]">{area.title}</h3>
                                            <p className="text-sm text-[#5B2D7D]/50">{area.description}</p>
                                        </div>
                                        <ArrowRight className="w-5 h-5 ml-auto text-[#5B2D7D]/30 group-hover:text-[#5B2D7D] transition-colors" />
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && selectedArea && (
                        <motion.div 
                            key="step2"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex flex-col gap-6"
                        >
                             <div className="text-center">
                                <button onClick={handleBack} className="text-sm text-[#5B2D7D]/40 hover:text-[#5B2D7D] mb-4">
                                    ← Back to Areas
                                </button>
                                <h1 className="text-3xl font-bold text-[#5B2D7D]">Start Small</h1>
                                <p className="text-[#5B2D7D]/60 mt-2">Pick a micro-habit for {selectedArea.title}.</p>
                            </div>

                            <div className="flex flex-col gap-3">
                                {selectedArea.microHabits.map((habit) => (
                                    <button
                                        key={habit}
                                        onClick={() => setSelectedHabit(habit)}
                                        className={`p-4 rounded-2xl border transition-all text-left font-medium ${
                                            selectedHabit === habit 
                                            ? 'bg-[#5B2D7D] text-white border-[#5B2D7D]' 
                                            : 'bg-white text-[#5B2D7D] border-transparent hover:border-[#5B2D7D]/20 shadow-sm'
                                        }`}
                                    >
                                        {habit}
                                    </button>
                                ))}
                                
                                <div className="relative mt-2">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5B2D7D]/40 text-sm">Or:</span>
                                    <input 
                                        type="text"
                                        placeholder="Write your own..."
                                        value={customHabit}
                                        onChange={(e) => {
                                            setCustomHabit(e.target.value);
                                            setSelectedHabit(null);
                                        }}
                                        className={`w-full p-4 pl-12 rounded-2xl border outline-none transition-all ${
                                            customHabit 
                                            ? 'border-[#5B2D7D] bg-white text-[#5B2D7D]' 
                                            : 'border-transparent bg-white/50 text-[#5B2D7D] focus:bg-white focus:border-[#5B2D7D]/30'
                                        }`}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={(!selectedHabit && !customHabit) || isSubmitting}
                                className="mt-4 w-full py-4 rounded-full bg-[#A4C538] text-[#5B2D7D] font-bold text-lg shadow-lg hover:bg-[#95b330] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Setting up...
                                    </>
                                ) : (
                                    <>
                                        Start Journey
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// --- Dashboard Content ---

function HabitDashboardContent({ habit }: { habit: any }) {
    const [isLogging, setIsLogging] = useState(false);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Safety check for logs array
    const logs = habit.logs || [];
    const lastLog = logs[0];
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
            }
        } catch (error) {
            toast.error("Failed to log.");
        } finally {
            setIsLogging(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
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
             <main className="flex-1 flex flex-col items-center justify-center p-6 z-10 pb-20">
                 
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

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HABIT_FOCUS_AREAS } from "@/lib/habit-templates";
import { createHabit } from "@/app/actions/habit";
import { Loader2, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Product } from "@prisma/client";

export default function HabitSetup({ product }: { product: Product }) {
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
                router.refresh(); // Refresh to show dashboard
            }
        } catch (error) {
            toast.error("Something went wrong.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDF2EC] flex flex-col items-center justify-center p-6 font-[Outfit]">
            <div className="w-full max-w-md">
                <AnimatePresence mode="wait">
                    {/* STEP 1: CHOOSE AREA */}
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

                    {/* STEP 2: CHOOSE HABIT */}
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

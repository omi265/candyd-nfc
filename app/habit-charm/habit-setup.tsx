"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CORE_HABITS } from "@/lib/habit-templates";
import { createHabits } from "@/app/actions/habit";
import { Loader2, ArrowRight, Check, Sparkles, X, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Product } from "@prisma/client";

export default function HabitSetup({ product }: { product: Product }) {
    const [selectedHabitIds, setSelectedHabitIds] = useState<string[]>([]);
    const [charmName, setCharmName] = useState(product.name || "");
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const router = useRouter();

    const toggleHabit = (id: string) => {
        if (selectedHabitIds.includes(id)) {
            setSelectedHabitIds(prev => prev.filter(hid => hid !== id));
        } else {
            if (selectedHabitIds.length >= 3) {
                toast.error("Start small. Choose up to 3 core habits.");
                return;
            }
            setSelectedHabitIds(prev => [...prev, id]);
        }
    };

    const handleSubmit = async () => {
        if (selectedHabitIds.length === 0) return;

        setIsSubmitting(true);
        
        try {
            const habitsData = selectedHabitIds.map(id => {
                const core = CORE_HABITS.find(h => h.id === id);
                const level1 = core?.levels.find(l => l.level === 1);
                
                return {
                    title: level1?.description || "Level 1 Habit",
                    description: `Level 1: ${level1?.duration} • ${level1?.trigger}`,
                    focusArea: id, // Core ID
                    targetDays: 66, // Default to 66 for now
                };
            });

            const result = await createHabits(product.id, habitsData, charmName.trim() || "My Habit Charm");

            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Journey started!");
                router.refresh(); 
            }
        } catch (error) {
            toast.error("Something went wrong.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-dvh bg-[#FDF2EC] flex flex-col font-[Outfit]">
            {/* Header */}
            <header className="px-6 pt-8 pb-6 text-center shrink-0">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-16 h-16 bg-[#E8DCF0] rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm"
                >
                    <Sparkles className="w-8 h-8 text-[#5B2D7D]" />
                </motion.div>
                <h1 className="text-2xl font-bold text-[#5B2D7D] mb-2">Build Your Foundation</h1>
                <p className="text-[#5B2D7D]/60 max-w-xs mx-auto">Select 1-3 core habits to start your journey. We&apos;ll start small.</p>
            </header>

            {/* Main Content */}
            <div className="flex-1 px-6 overflow-y-auto pb-40 no-scrollbar">
                
                {/* Charm Name Input */}
                <div className="mb-8">
                    <label className="block text-sm font-medium text-[#5B2D7D]/60 mb-2 ml-1">
                        Name your medallion
                    </label>
                    <input
                        type="text"
                        value={charmName}
                        onChange={(e) => setCharmName(e.target.value)}
                        placeholder="e.g. My Daily Rituals"
                        className="w-full px-4 py-3 rounded-xl bg-white border border-[#5B2D7D]/10 text-[#5B2D7D] placeholder-[#5B2D7D]/20 outline-none focus:border-[#5B2D7D]/30 transition-colors"
                    />
                </div>

                {/* Grid of Core Habits */}
                <div className="space-y-3">
                    {CORE_HABITS.map((habit) => {
                        const isSelected = selectedHabitIds.includes(habit.id);
                        const isExpanded = expandedId === habit.id;
                        const level1 = habit.levels.find(l => l.level === 1);

                        return (
                            <div key={habit.id} className="overflow-hidden">
                                <button
                                    onClick={() => toggleHabit(habit.id)}
                                    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all shadow-sm border-2 ${
                                        isSelected 
                                        ? "bg-white border-[#5B2D7D] ring-1 ring-[#5B2D7D]/20" 
                                        : "bg-white border-transparent hover:border-[#5B2D7D]/10"
                                    }`}
                                >
                                    <div className="flex items-center gap-4 text-left">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0 ${habit.color}`}>
                                            {habit.icon}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-[#5B2D7D]">{habit.title}</h3>
                                            <p className="text-xs text-[#5B2D7D]/50">{habit.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {isSelected && (
                                            <div className="w-6 h-6 bg-[#5B2D7D] rounded-full flex items-center justify-center">
                                                <Check className="w-4 h-4 text-white" />
                                            </div>
                                        )}
                                    </div>
                                </button>
                                
                                {/* Preview of Level 1 */}
                                <div className={`px-4 transition-all duration-300 ${isSelected ? "max-h-20 opacity-100 pt-2 pb-2" : "max-h-0 opacity-0"}`}>
                                    <div className="bg-[#5B2D7D]/5 rounded-xl p-3 flex items-start gap-3">
                                        <div className="w-5 h-5 rounded-full bg-[#5B2D7D]/10 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-[#5B2D7D]">1</div>
                                        <div className="text-sm text-[#5B2D7D]">
                                            <span className="font-bold">Start here:</span> {level1?.description}
                                            <div className="text-xs opacity-60 mt-0.5">{level1?.duration} • {level1?.trigger}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Sticky Footer */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-linear-to-t from-[#FDF2EC] via-[#FDF2EC] to-transparent pt-12 z-40 pointer-events-none">
                <div className="max-w-md mx-auto pointer-events-auto">
                    <button
                        onClick={handleSubmit}
                        disabled={selectedHabitIds.length === 0 || isSubmitting}
                        className="w-full py-4 bg-[#A4C538] text-white rounded-[24px] font-bold text-lg flex items-center justify-center gap-2 shadow-xl hover:bg-[#93B132] transition-colors disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                Begin with {selectedHabitIds.length} Habit{selectedHabitIds.length !== 1 ? 's' : ''}
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

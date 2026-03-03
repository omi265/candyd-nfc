"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CORE_HABITS } from "@/lib/habit-templates";
import { createHabits } from "@/app/actions/habit";
import { Sparkles, Plus, ArrowRight, Check, ChevronDown, ChevronUp, X, Target, Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Product } from "@prisma/client";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";

interface SelectedHabit {
    id: string; // template id
    level: number;
    title: string;
    description: string;
}

export default function HabitSetup({ product }: { product: Product }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    
    const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
    const [selectedHabits, setSelectedHabits] = useState<SelectedHabit[]>([]);
    const [charmName, setCharmName] = useState(product.name || "");
    
    const [showCustom, setShowCustom] = useState(false);
    const [customName, setCustomName] = useState("");
    const [customTarget, setCustomTarget] = useState(66);

    const toggleCategory = (id: string) => {
        setExpandedCategoryId(expandedCategoryId === id ? null : id);
    };

    const toggleHabit = (categoryId: string, levelNum: number) => {
        const core = CORE_HABITS.find(h => h.id === categoryId);
        const level = core?.levels.find(l => l.level === levelNum);
        if (!core || !level) return;

        const habitId = `${categoryId}-${levelNum}`;
        
        setSelectedHabits(prev => {
            const isSelected = prev.some(h => h.id === categoryId && h.level === levelNum);
            if (isSelected) {
                return prev.filter(h => !(h.id === categoryId && h.level === levelNum));
            }
            if (prev.length >= 10) {
                toast.error("Maximum 10 habits allowed.");
                return prev;
            }
            return [...prev, {
                id: categoryId,
                level: levelNum,
                title: level.description,
                description: `Level ${levelNum}: ${level.duration} • ${level.trigger}`
            }];
        });
    };

    const addCustomHabit = () => {
        if (!customName.trim()) return;
        if (selectedHabits.length >= 10) {
            toast.error("Maximum 10 habits allowed.");
            return;
        }

        setSelectedHabits(prev => [...prev, {
            id: "custom",
            level: 1,
            title: customName.trim(),
            description: `Custom goal • ${customTarget} days`
        }]);
        setCustomName("");
        toast.success("Custom habit added!");
    };

    const removeHabit = (title: string) => {
        setSelectedHabits(prev => prev.filter(h => h.title !== title));
    };

    const handleSubmit = async () => {
        if (selectedHabits.length === 0) {
            toast.error("Select at least one habit to start.");
            return;
        }

        startTransition(async () => {
            const habitsData = selectedHabits.map(h => ({
                title: h.title,
                description: h.description,
                focusArea: h.id,
                frequency: "daily",
                targetDays: h.id === 'custom' ? 66 : 66, // Standard 66 for now
            }));

            const result = await createHabits(product.id, habitsData, charmName.trim() || "My Habit Charm");

            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Ritual activated!");
                router.refresh(); 
            }
        });
    };

    return (
        <div className="min-h-dvh bg-transparent flex flex-col font-[Outfit] relative">
            <AnimatePresence>
                {isPending && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-[#FDF2EC]/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
                    >
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl">
                            <Loader2 className="w-10 h-10 text-[#5B2D7D] animate-spin" />
                        </div>
                        <h2 className="text-2xl font-bold text-[#5B2D7D] mb-2 font-serif">Building Your Rituals</h2>
                        <p className="text-[#5B2D7D]/60 max-w-[240px]">We&apos;re setting up your new habits. This will only take a moment.</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <header className="px-6 pt-8 pb-6 text-center shrink-0">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-16 h-16 bg-[#E8DCF0] rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm"
                >
                    <Sparkles className="w-8 h-8 text-[#5B2D7D]" />
                </motion.div>
                <h1 className="text-2xl font-bold text-[#5B2D7D] mb-2 font-serif">Build Your Ritual</h1>
                <p className="text-[#5B2D7D]/60 max-w-xs mx-auto text-sm">Select up to 10 habits. Mix core foundations with your own goals.</p>
            </header>

            {/* Main Content */}
            <div className="flex-1 px-6 overflow-y-auto pb-40 no-scrollbar">
                
                {/* Medallion Name */}
                <div className="mb-6">
                    <label className="block text-xs font-bold text-[#5B2D7D]/40 uppercase tracking-widest mb-2 ml-1">
                        Name your medallion
                    </label>
                    <input
                        type="text"
                        value={charmName}
                        onChange={(e) => setCharmName(e.target.value)}
                        placeholder="e.g. My Daily Rituals"
                        className="w-full px-4 py-3 rounded-xl bg-white border border-[#5B2D7D]/10 text-[#5B2D7D] outline-none focus:border-[#5B2D7D]/30 transition-colors"
                    />
                </div>

                {/* Categories */}
                <div className="space-y-3">
                    {CORE_HABITS.map((category) => {
                        const isExpanded = expandedCategoryId === category.id;
                        const selectedInCategory = selectedHabits.filter(h => h.id === category.id).length;

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
                                            {selectedInCategory > 0 && (
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                                                    isExpanded ? "bg-white/20 text-white" : "bg-[#5B2D7D]/10 text-[#5B2D7D]"
                                                }`}>
                                                    {selectedInCategory} selected
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
                                                const isSelected = selectedHabits.some(h => h.id === category.id && h.level === lvl.level);
                                                return (
                                                    <button
                                                        key={lvl.level}
                                                        onClick={() => toggleHabit(category.id, lvl.level)}
                                                        className={`w-full text-left p-3 rounded-xl flex flex-col gap-1 transition-colors ${
                                                            isSelected ? "bg-[#5B2D7D]/10" : "hover:bg-[#EADDDE]/30"
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span className={`text-sm font-bold ${isSelected ? "text-[#5B2D7D]" : "text-[#5B2D7D]/80"}`}>
                                                                {lvl.description}
                                                            </span>
                                                            <div className={`w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-all ${
                                                                isSelected ? "bg-[#5B2D7D] border-[#5B2D7D]" : "border-[#5B2D7D]/20"
                                                            }`}>
                                                                {isSelected && <Check className="w-3 h-3 text-white" />}
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
                            onClick={() => setShowCustom(!showCustom)}
                            className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed transition-all ${
                                showCustom ? "border-[#5B2D7D] bg-[#5B2D7D]/5" : "border-[#5B2D7D]/20"
                            }`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                showCustom ? "bg-[#5B2D7D]" : "bg-[#EADDDE]"
                            }`}>
                                <Plus className={`w-5 h-5 ${showCustom ? "text-white" : "text-[#5B2D7D]"}`} />
                            </div>
                            <div className="text-left">
                                <h3 className="font-bold text-[#5B2D7D]">Add custom goal</h3>
                                <p className="text-xs text-[#5B2D7D]/60">Start with your own idea</p>
                            </div>
                        </button>

                        <AnimatePresence>
                            {showCustom && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="mt-2 bg-white rounded-2xl p-4 shadow-sm space-y-4 overflow-hidden"
                                >
                                    <div className="space-y-4">
                                        <input
                                            type="text"
                                            value={customName}
                                            onChange={(e) => setCustomName(e.target.value)}
                                            placeholder="What is the habit?"
                                            className="w-full px-4 py-3 rounded-xl bg-[#FDF2EC]/50 border border-[#5B2D7D]/10 text-[#5B2D7D] outline-none"
                                        />
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1">
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
                                            <button 
                                                onClick={addCustomHabit}
                                                disabled={!customName.trim()}
                                                className="px-6 py-3 bg-[#5B2D7D] text-white rounded-xl font-bold text-sm disabled:opacity-50"
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>

                                    {/* Custom List */}
                                    <div className="space-y-2">
                                        {selectedHabits.filter(h => h.id === 'custom').map((habit) => (
                                            <div key={habit.title} className="flex items-center justify-between p-3 bg-[#FDF2EC]/50 rounded-xl">
                                                <span className="text-[#5B2D7D] font-medium text-sm">{habit.title}</span>
                                                <button onClick={() => removeHabit(habit.title)} className="text-[#5B2D7D]/40 hover:text-red-500">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Sticky Footer */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#FDF2EC] via-[#FDF2EC] to-transparent pt-12 z-40 pointer-events-none text-center">
                <div className="max-w-md mx-auto pointer-events-auto">
                    <button
                        onClick={handleSubmit}
                        disabled={isPending || selectedHabits.length === 0}
                        className="w-full py-4 bg-[#A4C538] text-white rounded-[24px] font-bold text-lg flex items-center justify-center gap-2 shadow-xl hover:bg-[#93B132] transition-colors disabled:opacity-50"
                    >
                        {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                            <>
                                Activate {selectedHabits.length} Habits
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

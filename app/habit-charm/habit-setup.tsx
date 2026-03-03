"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CORE_HABITS } from "@/lib/habit-templates";
import { createHabits } from "@/app/actions/habit";
import { Loader2, ArrowRight, Check, Sparkles, X, Plus, Trash2, Calendar, Target, Clock } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Product } from "@prisma/client";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";

interface CustomHabit {
    tempId: string;
    title: string;
    description: string;
    frequency: string;
    targetDays: number;
}

export default function HabitSetup({ product }: { product: Product }) {
    const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
    const [customHabits, setCustomHabits] = useState<CustomHabit[]>([]);
    const [charmName, setCharmName] = useState(product.name || "");
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [isCustomDrawerOpen, setIsCustomDrawerOpen] = useState(false);
    const [newCustom, setNewCustom] = useState({
        title: "",
        description: "",
        frequency: "daily",
        targetDays: 66
    });

    const router = useRouter();

    const totalSelected = selectedTemplateIds.length + customHabits.length;

    const toggleTemplate = (id: string) => {
        if (selectedTemplateIds.includes(id)) {
            setSelectedTemplateIds(prev => prev.filter(hid => hid !== id));
        } else {
            if (totalSelected >= 10) {
                toast.error("Maximum 10 habits allowed.");
                return;
            }
            setSelectedTemplateIds(prev => [...prev, id]);
        }
    };

    const addCustomHabit = () => {
        if (!newCustom.title.trim()) {
            toast.error("Habit name is required");
            return;
        }
        if (totalSelected >= 10) {
            toast.error("Maximum 10 habits allowed.");
            return;
        }

        const habit: CustomHabit = {
            tempId: Math.random().toString(36).substring(7),
            ...newCustom
        };

        setCustomHabits(prev => [...prev, habit]);
        setNewCustom({ title: "", description: "", frequency: "daily", targetDays: 66 });
        setIsCustomDrawerOpen(false);
        toast.success("Custom habit added!");
    };

    const removeCustomHabit = (tempId: string) => {
        setCustomHabits(prev => prev.filter(h => h.tempId !== tempId));
    };

    const handleSubmit = async () => {
        if (totalSelected === 0) return;

        setIsSubmitting(true);
        
        try {
            const habitsData = [
                ...selectedTemplateIds.map(id => {
                    const core = CORE_HABITS.find(h => h.id === id);
                    const level1 = core?.levels.find(l => l.level === 1);
                    return {
                        title: level1?.description || core?.title || "Level 1 Habit",
                        description: `Level 1: ${level1?.duration} • ${level1?.trigger}`,
                        focusArea: id,
                        frequency: "daily",
                        targetDays: 66,
                    };
                }),
                ...customHabits.map(h => ({
                    title: h.title,
                    description: h.description,
                    focusArea: "custom",
                    frequency: h.frequency,
                    targetDays: h.targetDays
                }))
            ];

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
        <div className="min-h-dvh bg-transparent flex flex-col font-[Outfit]">
            {/* Header */}
            <header className="px-6 pt-8 pb-6 text-center shrink-0">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-16 h-16 bg-[#E8DCF0] rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm"
                >
                    <Sparkles className="w-8 h-8 text-[#5B2D7D]" />
                </motion.div>
                <h1 className="text-2xl font-bold text-[#5B2D7D] mb-2">Build Your Ritual</h1>
                <p className="text-[#5B2D7D]/60 max-w-xs mx-auto">Select up to 10 habits. Mix core foundations with your own custom goals.</p>
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

                {/* Selected Summary */}
                {totalSelected > 0 && (
                    <div className="mb-8 bg-white/50 rounded-2xl p-4 border border-[#5B2D7D]/5">
                        <div className="flex items-center justify-between mb-3 px-1">
                            <span className="text-xs font-bold text-[#5B2D7D]/40 uppercase tracking-widest">Selected Habits ({totalSelected}/10)</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {selectedTemplateIds.map(id => (
                                <div key={id} className="bg-[#5B2D7D] text-white px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-2">
                                    {CORE_HABITS.find(h => h.id === id)?.icon} {CORE_HABITS.find(h => h.id === id)?.title}
                                    <button onClick={() => toggleTemplate(id)}><X className="w-3 h-3" /></button>
                                </div>
                            ))}
                            {customHabits.map(h => (
                                <div key={h.tempId} className="bg-[#A4C538] text-[#5B2D7D] px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-2">
                                    ✨ {h.title}
                                    <button onClick={() => removeCustomHabit(h.tempId)}><X className="w-3 h-3" /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Grid of Core Habits */}
                <div className="mb-6">
                    <h3 className="text-sm font-bold text-[#5B2D7D]/40 uppercase tracking-widest mb-4 ml-1">Core Foundations</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {CORE_HABITS.map((habit) => {
                            const isSelected = selectedTemplateIds.includes(habit.id);
                            return (
                                <button
                                    key={habit.id}
                                    onClick={() => toggleTemplate(habit.id)}
                                    className={`flex flex-col items-center justify-center p-4 rounded-3xl transition-all border-2 aspect-square ${
                                        isSelected 
                                        ? "bg-white border-[#5B2D7D] shadow-md" 
                                        : "bg-white/40 border-transparent hover:border-[#5B2D7D]/10"
                                    }`}
                                >
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-2 ${habit.color}`}>
                                        {habit.icon}
                                    </div>
                                    <span className="font-bold text-[#5B2D7D] text-sm">{habit.title}</span>
                                    {isSelected && <Check className="w-4 h-4 text-[#5B2D7D] mt-1" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Custom Habits Section */}
                <div className="mb-12">
                    <h3 className="text-sm font-bold text-[#5B2D7D]/40 uppercase tracking-widest mb-4 ml-1">Your Own Goals</h3>
                    <button 
                        onClick={() => setIsCustomDrawerOpen(true)}
                        className="w-full py-4 bg-white border-2 border-dashed border-[#5B2D7D]/20 rounded-2xl flex items-center justify-center gap-2 text-[#5B2D7D]/60 font-bold hover:border-[#5B2D7D]/40 hover:text-[#5B2D7D] transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        Add Custom Habit
                    </button>
                </div>
            </div>

            {/* Sticky Footer */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-linear-to-t from-[#FDF2EC] via-[#FDF2EC] to-transparent pt-12 z-40 pointer-events-none">
                <div className="max-w-md mx-auto pointer-events-auto">
                    <button
                        onClick={handleSubmit}
                        disabled={totalSelected === 0 || isSubmitting}
                        className="w-full py-4 bg-[#A4C538] text-white rounded-[24px] font-bold text-lg flex items-center justify-center gap-2 shadow-xl hover:bg-[#93B132] transition-colors disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                Activate {totalSelected} Habit{totalSelected !== 1 ? 's' : ''}
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Custom Habit Drawer */}
            <Drawer open={isCustomDrawerOpen} onOpenChange={setIsCustomDrawerOpen}>
                <DrawerContent className="bg-[#FDF2EC] font-[Outfit]">
                    <div className="p-6 pb-12">
                        <DrawerHeader className="px-0">
                            <DrawerTitle className="text-2xl font-bold text-[#5B2D7D]">Create Custom Habit</DrawerTitle>
                            <DrawerDescription>Define your own ritual and target.</DrawerDescription>
                        </DrawerHeader>

                        <div className="space-y-6 mt-4">
                            <div>
                                <label className="block text-xs font-bold text-[#5B2D7D]/40 uppercase mb-2">What is the habit?</label>
                                <input 
                                    type="text"
                                    value={newCustom.title}
                                    onChange={(e) => setNewCustom({...newCustom, title: e.target.value})}
                                    placeholder="e.g. Read for 20 minutes"
                                    className="w-full px-4 py-3 rounded-xl bg-white border border-[#5B2D7D]/10 text-[#5B2D7D] outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[#5B2D7D]/40 uppercase mb-2">Brief details (optional)</label>
                                <input 
                                    type="text"
                                    value={newCustom.description}
                                    onChange={(e) => setNewCustom({...newCustom, description: e.target.value})}
                                    placeholder="e.g. No screens, just paper"
                                    className="w-full px-4 py-3 rounded-xl bg-white border border-[#5B2D7D]/10 text-[#5B2D7D] outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-[#5B2D7D]/40 uppercase mb-2 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> Frequency
                                    </label>
                                    <select 
                                        value={newCustom.frequency}
                                        onChange={(e) => setNewCustom({...newCustom, frequency: e.target.value})}
                                        className="w-full px-4 py-3 rounded-xl bg-white border border-[#5B2D7D]/10 text-[#5B2D7D] outline-none appearance-none"
                                    >
                                        <option value="daily">Every day</option>
                                        <option value="weekday">Weekdays</option>
                                        <option value="weekend">Weekends</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[#5B2D7D]/40 uppercase mb-2 flex items-center gap-1">
                                        <Target className="w-3 h-3" /> Goal (Days)
                                    </label>
                                    <select 
                                        value={newCustom.targetDays}
                                        onChange={(e) => setNewCustom({...newCustom, targetDays: parseInt(e.target.value)})}
                                        className="w-full px-4 py-3 rounded-xl bg-white border border-[#5B2D7D]/10 text-[#5B2D7D] outline-none appearance-none"
                                    >
                                        <option value={21}>21 Days (Initiation)</option>
                                        <option value={66}>66 Days (Habit forming)</option>
                                        <option value={100}>100 Days (Mastery)</option>
                                    </select>
                                </div>
                            </div>

                            <button 
                                onClick={addCustomHabit}
                                className="w-full py-4 bg-[#5B2D7D] text-white rounded-2xl font-bold shadow-lg hover:bg-[#4A246A] transition-colors"
                            >
                                Add to Rituals
                            </button>
                        </div>
                    </div>
                </DrawerContent>
            </Drawer>
        </div>
    );
}

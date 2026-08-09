"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CORE_HABITS, RITUAL_TEMPLATES, RitualTemplate } from "@/lib/habit-templates";
import { createHabits } from "@/app/actions/habit";
import { Sparkles, Plus, ArrowRight, Check, ChevronDown, ChevronUp, X, Target, Calendar, Loader2, Sun, Moon, Zap, Clock, Info, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Product } from "@prisma/client";

interface SelectedHabit {
    id: string; // category id or 'custom'
    ritualType: "MORNING" | "NIGHT" | "OTHER";
    title: string;
    description: string;
    duration: number; // seconds
    orderIndex: number;
}

export default function HabitSetup({ product }: { product: Product }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    
    const [step, setStep] = useState(1);
    const [charmName, setCharmName] = useState(product.name || "My Day-Night Medallion");
    const [selectedHabits, setSelectedHabits] = useState<SelectedHabit[]>([]);
    
    // UI State
    const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
    const [customHabit, setCustomHabit] = useState({ title: "", duration: 60 });

    const morningHabits = selectedHabits.filter(h => h.ritualType === "MORNING").sort((a, b) => a.orderIndex - b.orderIndex);
    const nightHabits = selectedHabits.filter(h => h.ritualType === "NIGHT").sort((a, b) => a.orderIndex - b.orderIndex);
    const otherHabits = selectedHabits.filter(h => h.ritualType === "OTHER");

    const addHabit = (habit: Omit<SelectedHabit, "orderIndex">) => {
        const ritualCount = selectedHabits.filter(h => h.ritualType === habit.ritualType).length;
        if ((habit.ritualType === "MORNING" || habit.ritualType === "NIGHT") && ritualCount >= 3) {
            toast.error(`Maximum 3 habits allowed for ${habit.ritualType.toLowerCase()} ritual.`);
            return;
        }
        if (selectedHabits.length >= 10) {
            toast.error("Maximum 10 habits total allowed.");
            return;
        }

        setSelectedHabits(prev => [...prev, { ...habit, orderIndex: ritualCount }]);
        toast.success("Habit added!");
    };

    const removeHabit = (title: string, ritualType: string) => {
        setSelectedHabits(prev => {
            const filtered = prev.filter(h => !(h.title === title && h.ritualType === ritualType));
            // Re-order remaining habits in that ritual
            return filtered.map(h => {
                if (h.ritualType === ritualType) {
                    const idx = filtered.filter(fh => fh.ritualType === ritualType).indexOf(h);
                    return { ...h, orderIndex: idx };
                }
                return h;
            });
        });
    };

    const applyTemplate = (template: RitualTemplate) => {
        setSelectedHabits(prev => {
            const otherRituals = prev.filter(h => h.ritualType !== template.type);
            const templateHabits: SelectedHabit[] = template.habits.map((h, idx) => ({
                id: h.focusArea,
                ritualType: template.type,
                title: h.title,
                description: h.description,
                duration: h.duration,
                orderIndex: idx
            }));
            return [...otherRituals, ...templateHabits];
        });
        toast.success(`${template.title} template applied!`);
    };

    const handleSubmit = async () => {
        if (selectedHabits.length === 0) {
            toast.error("Add at least one habit to your medallion.");
            return;
        }

        startTransition(async () => {
            try {
                const habitsData = selectedHabits.map(h => ({
                    title: h.title,
                    description: h.description,
                    focusArea: h.id,
                    ritualType: h.ritualType,
                    duration: h.duration,
                    orderIndex: h.orderIndex,
                    targetDays: 66
                }));

                const result = await createHabits(product.id, habitsData, charmName.trim());

                if (result.error) {
                    toast.error(result.error);
                } else {
                    toast.success("Medallion activated!");
                    router.refresh();
                    // Fallback to home if refresh doesn't redirect
                    setTimeout(() => router.push('/'), 500);
                }
            } catch (err) {
                console.error("Setup error:", err);
                toast.error("An unexpected error occurred during setup.");
            }
        });
    };

    return (
        <div className="min-h-dvh bg-[#F6F2EC] flex flex-col font-[Outfit] relative overflow-hidden">
            {/* Background Decorative Shapes */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl transform translate-x-20 -translate-y-20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl transform -translate-x-10 translate-y-10 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#556B5A]/5 rounded-full blur-3xl pointer-events-none" />

            <AnimatePresence>
                {isPending && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-[#F6F2EC]/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
                    >
                        <div className="w-20 h-20 bg-white/40 backdrop-blur-xl border border-white/50 rounded-full flex items-center justify-center mb-6 shadow-xl">
                            <Loader2 className="w-10 h-10 text-[#556B5A] animate-spin" />
                        </div>
                        <h2 className="text-2xl font-bold text-[#556B5A] mb-2">Building Your Medallion</h2>
                        <p className="text-[#556B5A]/60 max-w-[240px]">We&apos;re setting up your rituals. This will only take a moment.</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <header className="px-6 pt-10 pb-6 text-center shrink-0 relative z-10">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-16 h-16 bg-white/40 backdrop-blur-xl border border-white/50 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm"
                >
                    <Sparkles className="w-8 h-8 text-[#556B5A]" />
                </motion.div>
                <h1 className="text-2xl font-bold text-[#556B5A] mb-1">Day-Night Medallion</h1>
                <p className="text-[#556B5A]/60 text-sm">Step {step} of 5</p>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 px-6 overflow-y-auto pb-40 no-scrollbar relative z-10">
                
                <AnimatePresence mode="wait">
                    {/* STEP 1: NAME */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="bg-white/40 backdrop-blur-xl rounded-[32px] p-6 shadow-sm border border-white/50">
                                <label className="block text-[10px] font-black text-[#556B5A]/30 uppercase tracking-widest mb-4">
                                    Name your charm
                                </label>
                                <input
                                    type="text"
                                    value={charmName}
                                    onChange={(e) => setCharmName(e.target.value)}
                                    placeholder="e.g. My Daily Rituals"
                                    className="w-full px-0 py-2 text-xl font-bold text-[#556B5A] bg-transparent border-b-2 border-[#556B5A]/10 outline-none focus:border-[#556B5A]/30 transition-colors"
                                />
                                <p className="mt-4 text-xs text-[#556B5A]/50 leading-relaxed">
                                    This name will appear on your dashboard when you tap your physical medallion.
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 2: MORNING RITUAL */}
                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shadow-sm">
                                    <Sun className="w-5 h-5 text-orange-600" />
                                </div>
                                <h2 className="text-xl font-bold text-[#556B5A]">Morning Ritual</h2>
                            </div>

                            <p className="text-sm text-[#556B5A]/60 mb-6">Choose a template or build your own custom stack (max 3 habits).</p>

                            <div className="grid grid-cols-1 gap-3">
                                {RITUAL_TEMPLATES.filter(t => t.type === "MORNING").map(template => (
                                    <button
                                        key={template.id}
                                        onClick={() => applyTemplate(template)}
                                        className="bg-white/40 backdrop-blur-md p-5 rounded-3xl text-left border border-white/30 shadow-sm active:scale-[0.98] transition-all"
                                    >
                                        <h3 className="font-bold text-[#556B5A] mb-1">{template.title}</h3>
                                        <p className="text-xs text-[#556B5A]/50 mb-3">{template.description}</p>
                                        <div className="flex gap-2">
                                            {template.habits.map((h, i) => (
                                                <div key={i} className="px-2 py-1 bg-[#556B5A]/5 rounded-lg text-[10px] text-[#556B5A]/60 border border-[#556B5A]/5">
                                                    {h.title}
                                                </div>
                                            ))}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div className="mt-8">
                                <h3 className="text-xs font-black text-[#556B5A]/30 uppercase tracking-widest mb-4 ml-1">Custom Stack</h3>
                                <div className="space-y-3">
                                    {morningHabits.map((h, i) => (
                                        <div key={i} className="bg-white/40 backdrop-blur-md p-4 rounded-2xl flex items-center justify-between border border-white/30 shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-[#556B5A]/10 flex items-center justify-center text-[10px] font-bold text-[#556B5A]">
                                                    {i + 1}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm text-[#556B5A]">{h.title}</h4>
                                                    <p className="text-[10px] text-[#556B5A]/40">{h.duration}s • {h.description}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => removeHabit(h.title, "MORNING")} className="text-[#556B5A]/20 hover:text-red-400">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    
                                    {morningHabits.length < 3 && (
                                        <HabitSelector 
                                            ritualType="MORNING" 
                                            onSelect={(h) => addHabit(h)}
                                        />
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 3: NIGHT RITUAL */}
                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shadow-sm">
                                    <Moon className="w-5 h-5 text-indigo-600" />
                                </div>
                                <h2 className="text-xl font-bold text-[#556B5A]">Night Ritual</h2>
                            </div>

                            <p className="text-sm text-[#556B5A]/60 mb-6">Set your evening wind-down routine (max 3 habits).</p>

                            <div className="grid grid-cols-1 gap-3">
                                {RITUAL_TEMPLATES.filter(t => t.type === "NIGHT").map(template => (
                                    <button
                                        key={template.id}
                                        onClick={() => applyTemplate(template)}
                                        className="bg-white/40 backdrop-blur-md p-5 rounded-3xl text-left border border-white/30 shadow-sm active:scale-[0.98] transition-all"
                                    >
                                        <h3 className="font-bold text-[#556B5A] mb-1">{template.title}</h3>
                                        <p className="text-xs text-[#556B5A]/50 mb-3">{template.description}</p>
                                        <div className="flex gap-2">
                                            {template.habits.map((h, i) => (
                                                <div key={i} className="px-2 py-1 bg-[#556B5A]/5 rounded-lg text-[10px] text-[#556B5A]/60 border border-[#556B5A]/5">
                                                    {h.title}
                                                </div>
                                            ))}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div className="mt-8">
                                <h3 className="text-xs font-black text-[#556B5A]/30 uppercase tracking-widest mb-4 ml-1">Custom Stack</h3>
                                <div className="space-y-3">
                                    {nightHabits.map((h, i) => (
                                        <div key={i} className="bg-white/40 backdrop-blur-md p-4 rounded-2xl flex items-center justify-between border border-white/30 shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-[#556B5A]/10 flex items-center justify-center text-[10px] font-bold text-[#556B5A]">
                                                    {i + 1}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm text-[#556B5A]">{h.title}</h4>
                                                    <p className="text-[10px] text-[#556B5A]/40">{h.duration}s • {h.description}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => removeHabit(h.title, "NIGHT")} className="text-[#556B5A]/20 hover:text-red-400">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    
                                    {nightHabits.length < 3 && (
                                        <HabitSelector 
                                            ritualType="NIGHT" 
                                            onSelect={(h) => addHabit(h)}
                                        />
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 4: OTHER HABITS */}
                    {step === 4 && (
                        <motion.div
                            key="step4"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center shadow-sm">
                                    <Zap className="w-5 h-5 text-pink-600" />
                                </div>
                                <h2 className="text-xl font-bold text-[#556B5A]">Other Habits</h2>
                            </div>

                            <p className="text-sm text-[#556B5A]/60 mb-6">Add any other habits you want to track throughout the day.</p>

                            <div className="space-y-3">
                                {otherHabits.map((h, i) => (
                                    <div key={i} className="bg-white/40 backdrop-blur-md p-4 rounded-2xl flex items-center justify-between border border-white/30 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-[#556B5A]/10 flex items-center justify-center">
                                                <Zap className="w-4 h-4 text-[#556B5A]" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm text-[#556B5A]">{h.title}</h4>
                                                <p className="text-[10px] text-[#556B5A]/40">{h.description}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => removeHabit(h.title, "OTHER")} className="text-[#556B5A]/20 hover:text-red-400">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                
                                {selectedHabits.length < 10 && (
                                    <HabitSelector 
                                        ritualType="OTHER" 
                                        onSelect={(h) => addHabit(h)}
                                    />
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 5: REVIEW */}
                    {step === 5 && (
                        <motion.div
                            key="step5"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="bg-white/40 backdrop-blur-xl rounded-[40px] p-8 shadow-sm border border-white/50 text-center">
                                <div className="w-20 h-20 bg-[#556B5A]/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                                    <Check className="w-10 h-10 text-[#556B5A]" />
                                </div>
                                <h2 className="text-2xl font-bold text-[#556B5A] mb-2">Ready to Start?</h2>
                                <p className="text-sm text-[#556B5A]/60 mb-8">Your medallion is configured with {selectedHabits.length} habits across your rituals.</p>
                                
                                <div className="space-y-4 text-left">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-[#556B5A]/40 font-bold uppercase tracking-widest">Morning Ritual</span>
                                        <span className="font-bold text-[#556B5A]">{morningHabits.length} habits</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-[#556B5A]/40 font-bold uppercase tracking-widest">Night Ritual</span>
                                        <span className="font-bold text-[#556B5A]">{nightHabits.length} habits</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-[#556B5A]/40 font-bold uppercase tracking-widest">Other Habits</span>
                                        <span className="font-bold text-[#556B5A]">{otherHabits.length} habits</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Navigation Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#F6F2EC] via-[#F6F2EC] to-transparent z-40">
                <div className="flex gap-3 max-w-md mx-auto">
                    {step > 1 && (
                        <button
                            onClick={() => setStep(s => s - 1)}
                            className="h-14 px-6 rounded-2xl bg-white/40 backdrop-blur-md text-[#556B5A] font-bold shadow-sm border border-white/30 active:scale-95 transition-all"
                        >
                            Back
                        </button>
                    )}
                    
                    {step < 5 ? (
                        <button
                            onClick={() => setStep(s => s + 1)}
                            className="flex-1 h-14 rounded-2xl bg-[#556B5A] text-white font-bold shadow-lg shadow-[#556B5A]/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                        >
                            Next <ArrowRight className="w-5 h-5" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={isPending}
                            className="flex-1 h-14 rounded-2xl bg-[#556B5A] text-white font-bold shadow-lg shadow-[#556B5A]/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Activate Medallion"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function HabitSelector({ ritualType, onSelect }: { ritualType: "MORNING" | "NIGHT" | "OTHER", onSelect: (habit: Omit<SelectedHabit, "orderIndex">) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [expandedCat, setExpandedCat] = useState<string | null>(null);
    const [isCustom, setIsCustom] = useState(false);
    const [customTitle, setCustomTitle] = useState("");
    const [customDuration, setCustomDuration] = useState(60);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full h-14 rounded-2xl border-2 border-dashed border-[#556B5A]/20 bg-white/20 backdrop-blur-sm flex items-center justify-center gap-2 text-[#556B5A]/30 hover:border-[#556B5A]/40 hover:text-[#556B5A]/40 transition-all"
            >
                <Plus className="w-5 h-5" />
                <span className="text-sm font-bold">Add {ritualType === "OTHER" ? "Habit" : "to Ritual"}</span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[110]"
                        />
                        
                        {/* Dialog */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20, x: "-50%" }}
                            animate={{ opacity: 1, scale: 1, y: 0, x: "-50%" }}
                            exit={{ opacity: 0, scale: 0.9, y: 20, x: "-50%" }}
                            style={{ left: "50%", top: "15%" }}
                            className="fixed w-[calc(100%-48px)] max-w-md bg-[#F6F2EC]/90 backdrop-blur-xl rounded-[40px] shadow-2xl border border-white/30 p-6 z-[120] max-h-[75vh] overflow-y-auto no-scrollbar"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-[#556B5A]">Choose Habit</h3>
                                <button onClick={() => setIsOpen(false)} className="w-10 h-10 rounded-full bg-white/40 flex items-center justify-center text-[#556B5A]/40 border border-white/50">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {!isCustom ? (
                                <div className="space-y-3">
                                    {CORE_HABITS.map(cat => (
                                        <div key={cat.id} className="bg-white/40 backdrop-blur-md rounded-3xl overflow-hidden border border-white/30 shadow-sm">
                                            <button 
                                                onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
                                                className="w-full p-4 flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl">{cat.icon}</span>
                                                    <span className="font-bold text-[#556B5A]">{cat.title}</span>
                                                </div>
                                                {expandedCat === cat.id ? <ChevronUp className="w-4 h-4 text-[#556B5A]/30" /> : <ChevronDown className="w-4 h-4 text-[#556B5A]/30" />}
                                            </button>
                                            
                                            <AnimatePresence>
                                                {expandedCat === cat.id && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="overflow-hidden px-3 pb-3 space-y-1"
                                                    >
                                                        {cat.levels.map(l => (
                                                            <button
                                                                key={l.level}
                                                                onClick={() => {
                                                                    onSelect({
                                                                        id: cat.id,
                                                                        ritualType,
                                                                        title: l.description,
                                                                        description: `Level ${l.level}: ${l.duration}`,
                                                                        duration: l.duration.includes('min') ? parseInt(l.duration) * 60 : (l.duration.includes('sec') ? parseInt(l.duration) : 60)
                                                                    });
                                                                    setIsOpen(false);
                                                                }}
                                                                className="w-full text-left p-4 rounded-2xl bg-white/60 hover:bg-[#556B5A] hover:text-white transition-all group shadow-sm"
                                                            >
                                                                <p className="text-sm font-bold leading-tight mb-1">{l.description}</p>
                                                                <p className="text-[10px] opacity-40 group-hover:opacity-60 font-bold uppercase tracking-widest">{l.duration} • {l.trigger}</p>
                                                            </button>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => setIsCustom(true)}
                                        className="w-full p-5 rounded-[24px] bg-white/20 backdrop-blur-md text-[#556B5A] font-bold text-sm flex items-center justify-center gap-2 border-2 border-dashed border-[#556B5A]/10"
                                    >
                                        <Plus className="w-5 h-5" /> Create Custom Habit
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-black text-[#556B5A]/30 uppercase tracking-widest block mb-2 ml-1">Habit Name</label>
                                            <input 
                                                type="text" 
                                                value={customTitle}
                                                onChange={(e) => setCustomTitle(e.target.value)}
                                                placeholder="e.g. Read 1 page"
                                                className="w-full p-4 rounded-2xl bg-white/40 border border-white/50 text-[#556B5A] font-bold outline-none focus:ring-2 ring-[#556B5A]/10"
                                                autoFocus
                                            />
                                        </div>
                                        {ritualType !== "OTHER" && (
                                            <div>
                                                <label className="text-[10px] font-black text-[#556B5A]/30 uppercase tracking-widest block mb-2 ml-1">Duration (Seconds)</label>
                                                <input 
                                                    type="number" 
                                                    value={customDuration}
                                                    onChange={(e) => setCustomDuration(parseInt(e.target.value))}
                                                    className="w-full p-4 rounded-2xl bg-white/40 border border-white/50 text-[#556B5A] font-bold outline-none focus:ring-2 ring-[#556B5A]/10"
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => setIsCustom(false)} className="flex-1 h-14 rounded-2xl bg-white/20 text-[#556B5A] font-bold text-sm">Back</button>
                                        <button 
                                            onClick={() => {
                                                if (!customTitle) return;
                                                onSelect({
                                                    id: "custom",
                                                    ritualType,
                                                    title: customTitle,
                                                    description: "Custom habit",
                                                    duration: customDuration
                                                });
                                                setIsOpen(false);
                                                setIsCustom(false);
                                                setCustomTitle("");
                                            }}
                                            className="flex-[2] h-14 rounded-2xl bg-[#556B5A] text-white font-bold text-sm shadow-lg shadow-[#556B5A]/20"
                                        >
                                            Add Custom
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
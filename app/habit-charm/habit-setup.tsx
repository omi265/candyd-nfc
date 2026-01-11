"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HABIT_FOCUS_AREAS } from "@/lib/habit-templates";
import { createHabits } from "@/app/actions/habit";
import { Loader2, ArrowRight, Check, Plus, X, ChevronDown, ChevronUp, Sparkles, Clock, Calendar, Pencil } from "lucide-react";
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

interface SelectedHabit {
    title: string;
    areaId: string;
    targetDays: number;
}

const DURATION_OPTIONS = [
    { days: 21, label: "Kickstarter", desc: "Short burst" },
    { days: 30, label: "Monthly", desc: "Standard month" },
    { days: 66, label: "Habit Form", desc: "Scientific sweet spot" },
    { days: 90, label: "Lifestyle", desc: "Solid change" },
];

export default function HabitSetup({ product }: { product: Product }) {
    const [expandedAreaId, setExpandedAreaId] = useState<string | null>(null);
    const [selectedHabits, setSelectedHabits] = useState<SelectedHabit[]>([]);
    const [charmName, setCharmName] = useState(product.name || "");
    const [customHabit, setCustomHabit] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Config Drawer State
    const [editingHabit, setEditingHabit] = useState<SelectedHabit | null>(null);
    const [customDuration, setCustomDuration] = useState("");

    const router = useRouter();

    const toggleArea = (areaId: string) => {
        setExpandedAreaId(expandedAreaId === areaId ? null : areaId);
    };

    const toggleHabit = (title: string, areaId: string) => {
        const exists = selectedHabits.find(h => h.title === title);
        if (exists) {
            setSelectedHabits(prev => prev.filter(h => h.title !== title));
        } else {
            if (selectedHabits.length >= 6) {
                toast.error("Max 6 habits allowed");
                return;
            }
            // Default 66 days
            setSelectedHabits(prev => [...prev, { title, areaId, targetDays: 66 }]);
        }
    };

    const addCustomHabit = (areaId: string) => {
        if (!customHabit.trim()) return;
        const exists = selectedHabits.find(h => h.title === customHabit.trim());
        if (exists) {
             toast.error("Habit already added");
             return;
        }
        if (selectedHabits.length >= 6) {
            toast.error("Max 6 habits allowed");
            return;
        }
        setSelectedHabits(prev => [...prev, { title: customHabit.trim(), areaId, targetDays: 66 }]);
        setCustomHabit("");
    };

    const handleUpdateHabit = (days: number) => {
        if (!editingHabit) return;
        setSelectedHabits(prev => prev.map(h => 
            h.title === editingHabit.title ? { ...h, targetDays: days } : h
        ));
        setEditingHabit(null);
        setCustomDuration(""); // Reset custom input
    };

    const handleSubmit = async () => {
        if (selectedHabits.length === 0) return;

        setIsSubmitting(true);
        
        try {
            const habitsData = selectedHabits.map(h => ({
                title: h.title,
                description: `A habit focused on ${h.areaId}.`,
                focusArea: h.areaId,
                targetDays: h.targetDays,
            }));

            const result = await createHabits(product.id, habitsData, charmName.trim() || "My Habit Charm");

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
                <h1 className="text-2xl font-bold text-[#5B2D7D] mb-2">Build Your Stack</h1>
                <p className="text-[#5B2D7D]/60">Pick up to 6 gentle focus areas</p>
            </header>

            {/* Main Content */}
            <div className="flex-1 px-6 overflow-y-auto pb-40 no-scrollbar">
                
                {/* Charm Name Input */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-[#5B2D7D]/60 mb-2 ml-1">
                        Name your charm
                    </label>
                    <input
                        type="text"
                        value={charmName}
                        onChange={(e) => setCharmName(e.target.value)}
                        placeholder="e.g. My Daily Rituals"
                        className="w-full px-4 py-3 rounded-xl bg-white border border-[#5B2D7D]/10 text-[#5B2D7D] placeholder-[#5B2D7D]/20 outline-none focus:border-[#5B2D7D]/30 transition-colors"
                    />
                    <p className="text-[10px] text-[#5B2D7D]/40 mt-2 ml-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Tip: Tap a selected habit to customize its duration
                    </p>
                </div>

                {/* Selected Counter */}
                {selectedHabits.length > 0 && (
                    <div className="mb-6 flex flex-col gap-3 p-5 bg-white/40 rounded-[32px] border border-white/60">
                         {selectedHabits.map(h => (
                             <div 
                                key={h.title} 
                                className="bg-[#E5B8F4] text-[#5B2D7D] p-1.5 rounded-2xl flex items-center justify-between shadow-sm animate-in fade-in zoom-in duration-200"
                             >
                                 {/* Edit / Main Action */}
                                 <button
                                    onClick={() => setEditingHabit(h)}
                                    className="flex-1 flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-black/5 active:bg-black/10 transition-colors text-left"
                                 >
                                     <div className="w-10 h-10 rounded-full bg-white/40 flex items-center justify-center shrink-0">
                                         <Pencil className="w-5 h-5 opacity-70" />
                                     </div>
                                     <div className="flex flex-col">
                                         <span className="font-bold text-base leading-tight">{h.title}</span>
                                         <div className="flex items-center gap-1.5 text-xs opacity-70 font-medium mt-0.5">
                                             <Clock className="w-3.5 h-3.5" />
                                             <span>{h.targetDays} days</span>
                                         </div>
                                     </div>
                                 </button>

                                 {/* Divider */}
                                 <div className="w-px h-8 bg-[#5B2D7D]/10 mx-1" />

                                 {/* Remove Action */}
                                 <button 
                                    onClick={() => toggleHabit(h.title, h.areaId)}
                                    className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-red-500/10 active:bg-red-500/20 text-[#5B2D7D] transition-colors"
                                 >
                                     <X className="w-6 h-6" />
                                 </button>
                             </div>
                         ))}
                    </div>
                )}

                <div className="space-y-3">
                    {HABIT_FOCUS_AREAS.map((area) => {
                        const isExpanded = expandedAreaId === area.id;
                        const selectedInArea = selectedHabits.filter(h => h.areaId === area.id).length;

                        return (
                            <div key={area.id} className="overflow-hidden">
                                <button
                                    onClick={() => toggleArea(area.id)}
                                    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all shadow-sm ${
                                        isExpanded ? "bg-[#5B2D7D] text-white" : "bg-white"
                                    }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                                            isExpanded ? "bg-white/20" : area.color
                                        }`}>
                                            {area.icon}
                                        </div>
                                        <div className="text-left">
                                            <h3 className="font-bold">{area.title}</h3>
                                            <p className={`text-xs ${isExpanded ? "text-white/60" : "text-[#5B2D7D]/40"}`}>
                                                {area.description}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {selectedInArea > 0 && (
                                            <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${
                                                isExpanded ? "bg-white/20 text-white" : "bg-[#5B2D7D]/10 text-[#5B2D7D]"
                                            }`}>
                                                {selectedInArea} Selected
                                            </span>
                                        )}
                                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5 opacity-30" />}
                                    </div>
                                </button>

                                {/* Expanded Items */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="mt-2 bg-white/50 rounded-2xl p-3 space-y-2 border border-white/60">
                                                {area.microHabits.map((habit) => {
                                                    const isSelected = !!selectedHabits.find(h => h.title === habit);
                                                    return (
                                                        <button
                                                            key={habit}
                                                            onClick={() => toggleHabit(habit, area.id)}
                                                            className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition-all ${
                                                                isSelected ? "bg-[#5B2D7D]/10 border border-[#5B2D7D]/10" : "hover:bg-white"
                                                            }`}
                                                        >
                                                            <span className={`text-sm ${isSelected ? "text-[#5B2D7D] font-bold" : "text-[#5B2D7D]/70"}`}>
                                                                {habit}
                                                            </span>
                                                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                                                                isSelected ? "bg-[#5B2D7D] border-[#5B2D7D]" : "border-[#5B2D7D]/20"
                                                            }`}>
                                                                {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={4} />}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                                
                                                {/* Custom for this area */}
                                                <div className="flex gap-2 pt-2 border-t border-[#5B2D7D]/5">
                                                    <input 
                                                        type="text"
                                                        placeholder="Add custom..."
                                                        value={customHabit}
                                                        onChange={(e) => setCustomHabit(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && addCustomHabit(area.id)}
                                                        className="flex-1 bg-white border border-[#5B2D7D]/10 rounded-xl px-3 py-2 text-sm text-[#5B2D7D] placeholder-[#5B2D7D]/30 focus:outline-none"
                                                    />
                                                    <button 
                                                        onClick={() => addCustomHabit(area.id)}
                                                        disabled={!customHabit.trim() || selectedHabits.length >= 6}
                                                        className="w-10 h-10 bg-[#5B2D7D] text-white rounded-xl flex items-center justify-center disabled:opacity-30"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
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
                        disabled={selectedHabits.length === 0 || isSubmitting}
                        className="w-full py-4 bg-[#A4C538] text-white rounded-[24px] font-bold text-lg flex items-center justify-center gap-2 shadow-xl hover:bg-[#93B132] transition-colors disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                Start Journey
                                {selectedHabits.length > 0 && (
                                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">
                                        {selectedHabits.length}
                                    </span>
                                )}
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Config Drawer */}
            <Drawer open={!!editingHabit} onOpenChange={(open) => !open && setEditingHabit(null)}>
                <DrawerContent className="bg-[#FDF2EC] rounded-t-[32px] border-none">
                    <div className="p-6 pb-12">
                         <div className="flex flex-col items-center text-center mb-8">
                             <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm text-2xl">
                                 {editingHabit && HABIT_FOCUS_AREAS.find(a => a.id === editingHabit.areaId)?.icon}
                             </div>
                             <h2 className="text-2xl font-bold text-[#5B2D7D]">{editingHabit?.title}</h2>
                             <p className="text-[#5B2D7D]/60 mt-1">Set your commitment goal</p>
                         </div>

                         <div className="space-y-3">
                             {DURATION_OPTIONS.map((opt) => (
                                 <button
                                    key={opt.days}
                                    onClick={() => handleUpdateHabit(opt.days)}
                                    className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all ${
                                        editingHabit?.targetDays === opt.days
                                        ? "bg-[#5B2D7D] text-white shadow-lg shadow-[#5B2D7D]/20"
                                        : "bg-white text-[#5B2D7D] hover:bg-white/80"
                                    }`}
                                 >
                                     <div className="text-left">
                                         <div className="font-bold text-lg">{opt.days} Days</div>
                                         <div className={`text-xs ${editingHabit?.targetDays === opt.days ? "text-white/60" : "text-[#5B2D7D]/40"}`}>
                                             {opt.label}
                                         </div>
                                     </div>
                                     {editingHabit?.targetDays === opt.days && <Check className="w-6 h-6" />}
                                 </button>
                             ))}

                             {/* Custom Duration Input */}
                             <div className="pt-4 mt-4 border-t border-[#5B2D7D]/10">
                                 <label className="text-xs font-bold text-[#5B2D7D]/40 uppercase tracking-wider mb-2 block">Or set custom duration</label>
                                 <div className="flex gap-2">
                                     <div className="relative flex-1">
                                         <input 
                                            type="number" 
                                            placeholder="e.g. 100"
                                            className="w-full bg-white border border-[#5B2D7D]/10 rounded-xl px-4 py-3 pl-4 pr-12 text-[#5B2D7D] font-bold outline-none focus:ring-2 focus:ring-[#5B2D7D]/20"
                                            onChange={(e) => setCustomDuration(e.target.value)}
                                            value={customDuration}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    const val = parseInt(customDuration);
                                                    if (!isNaN(val) && val > 0) handleUpdateHabit(val);
                                                }
                                            }}
                                         />
                                         <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5B2D7D]/40 text-sm font-medium">Days</span>
                                     </div>
                                     <button 
                                        onClick={() => {
                                            const val = parseInt(customDuration);
                                            if (!isNaN(val) && val > 0) handleUpdateHabit(val);
                                        }}
                                        disabled={!customDuration}
                                        className="w-12 bg-[#5B2D7D] text-white rounded-xl flex items-center justify-center disabled:opacity-50 hover:bg-[#4A246A] active:scale-95 transition-all"
                                     >
                                         <Check className="w-6 h-6" />
                                     </button>
                                 </div>
                             </div>
                         </div>
                    </div>
                </DrawerContent>
            </Drawer>
        </div>
    );
}
"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { logHabit } from "@/app/actions/habit";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChevronDown, Loader2, Moon, Pause, Play, Plus, Sparkles, Sun } from "lucide-react";

export type RitualType = "MORNING" | "NIGHT";

type RitualStep = "active" | "summary" | "reflection";

export interface RitualHabitSnapshot {
  id: string;
  title: string;
  description?: string | null;
  duration?: number | null;
}

interface RitualRuntimeState {
  productId: string;
  type: RitualType;
  habits: RitualHabitSnapshot[];
  currentIndex: number;
  timeLeft: number;
  isPaused: boolean;
  skippedIds: string[];
  step: RitualStep;
  reflection: string;
}

interface RitualTimerContextValue {
  ritual: RitualRuntimeState | null;
  isPlayerOpen: boolean;
  startRitual: (config: { productId: string; type: RitualType; habits: RitualHabitSnapshot[] }) => void;
  openPlayer: () => void;
  closePlayer: () => void;
  togglePause: () => void;
  extendTimer: () => void;
  nextHabit: () => void;
  skipHabit: () => void;
  goToReflection: () => void;
  setReflection: (value: string) => void;
  finishRitual: () => Promise<void>;
  clearRitual: () => void;
}

const RitualTimerContext = createContext<RitualTimerContextValue | undefined>(undefined);

function formatSeconds(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function getDurationSeconds(habit?: RitualHabitSnapshot) {
  return habit?.duration || 60;
}

function RitualTimerOverlay() {
  const {
    ritual,
    isPlayerOpen,
    openPlayer,
    closePlayer,
    togglePause,
    extendTimer,
    nextHabit,
    skipHabit,
    goToReflection,
    setReflection,
    finishRitual,
  } = useRitualTimer();
  const [isSaving, setIsSaving] = useState(false);

  if (!ritual) return null;

  const currentHabit = ritual.habits[ritual.currentIndex];

  return (
    <>
      <Drawer open={isPlayerOpen} onOpenChange={(open) => !open && closePlayer()}>
        <DrawerContent className="bg-[#FDF2EC]/60 backdrop-blur-3xl border-none font-[Outfit] h-[100dvh] max-h-[100dvh] rounded-none z-[100] overflow-hidden">
          {/* Background Decorative Shapes */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/20 rounded-full blur-3xl transform translate-x-20 -translate-y-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/10 rounded-full blur-3xl transform -translate-x-10 translate-y-10 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[#5B2D7D]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col h-full p-6 pb-12 overflow-hidden relative z-10">
            <button onClick={closePlayer} className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/40 backdrop-blur-xl flex items-center justify-center text-[#5B2D7D] shadow-sm border border-white/50 active:scale-90 z-20">
              <ChevronDown className="w-6 h-6" />
            </button>

            <AnimatePresence mode="wait">
              {ritual.step === "active" && currentHabit && (
                <motion.div
                  key="active"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex-1 flex flex-col items-center justify-between py-12"
                >
                  <div className="text-center w-full">
                    <div className="text-[10px] font-black text-[#5B2D7D]/30 uppercase tracking-[0.2em] mb-4">
                      Habit {ritual.currentIndex + 1} of {ritual.habits.length}
                    </div>
                    <h2 className="text-3xl font-bold text-[#5B2D7D] px-6 leading-tight">{currentHabit.title}</h2>
                    <p className="text-[#5B2D7D]/40 text-sm mt-2 font-medium">{currentHabit.description}</p>
                  </div>

                  <div className="relative w-64 h-64 flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="4" />
                      <motion.circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke={ritual.type === "MORNING" ? "#F97316" : "#4F46E5"}
                        strokeWidth="4"
                        strokeLinecap="round"
                        initial={{ pathLength: 1 }}
                        animate={{ pathLength: ritual.timeLeft / getDurationSeconds(currentHabit) }}
                        transition={{ duration: 1, ease: "linear" }}
                      />
                    </svg>
                    <div className="text-6xl font-black text-[#5B2D7D] tracking-tighter">{ritual.timeLeft}s</div>
                  </div>

                  <div className="w-full space-y-8 px-6">
                    <div className="flex items-center justify-center gap-6">
                      <button onClick={extendTimer} className="w-14 h-14 rounded-full bg-white/40 backdrop-blur-md flex items-center justify-center text-[#5B2D7D] shadow-sm border border-white/50 active:scale-90">
                        <Plus className="w-6 h-6" />
                      </button>
                      <button onClick={togglePause} className="w-20 h-20 rounded-full bg-white/60 backdrop-blur-xl shadow-xl border border-white/50 flex items-center justify-center text-[#5B2D7D] active:scale-95">
                        {ritual.isPaused ? <Play className="w-8 h-8 fill-[#5B2D7D]" /> : <Pause className="w-8 h-8 fill-[#5B2D7D]" />}
                      </button>
                      <button onClick={nextHabit} className="w-14 h-14 rounded-full bg-white/40 backdrop-blur-md flex items-center justify-center text-[#5B2D7D] shadow-sm border border-white/50 active:scale-90">
                        <ArrowRight className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="flex gap-3">
                      <button onClick={skipHabit} className="flex-1 h-14 rounded-2xl bg-white/30 backdrop-blur-md text-[#5B2D7D] font-bold border border-white/30 active:scale-[0.98] transition-all">
                        Skip Habit
                      </button>
                      <button onClick={nextHabit} className="flex-1 h-14 rounded-2xl bg-[#5B2D7D] text-white font-bold shadow-lg active:scale-[0.98] transition-all">
                        Next Habit
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {ritual.step === "summary" && (
                <motion.div
                  key="summary"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex-1 flex flex-col items-center justify-center text-center p-4"
                >
                  <div className="w-20 h-20 bg-white/40 backdrop-blur-xl border border-white/50 rounded-full flex items-center justify-center mb-6 text-[#A4C538] shadow-sm">
                    <Check className="w-10 h-10" strokeWidth={3} />
                  </div>
                  <h2 className="text-3xl font-black text-[#5B2D7D] uppercase tracking-tighter mb-8">Ritual Complete</h2>

                  <div className="w-full space-y-3 mb-12 overflow-y-auto no-scrollbar max-h-[40vh]">
                    {ritual.habits.map((habit) => (
                      <div key={habit.id} className="flex items-center justify-between p-5 bg-white/40 backdrop-blur-md border border-white/50 rounded-3xl shadow-sm">
                        <span className="font-bold text-[#5B2D7D] text-sm">{habit.title}</span>
                        {ritual.skippedIds.includes(habit.id) ? (
                          <span className="text-[10px] font-black text-red-500/60 uppercase tracking-widest bg-red-50/50 px-2 py-1 rounded-lg">Skipped</span>
                        ) : (
                          <div className="w-8 h-8 bg-[#A4C538]/20 rounded-full flex items-center justify-center">
                            <Check className="w-5 h-5 text-[#A4C538]" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <button onClick={goToReflection} className="w-full h-16 rounded-full bg-[#5B2D7D] text-white font-bold text-lg shadow-xl shadow-[#5B2D7D]/20 active:scale-95">
                    Continue
                  </button>
                </motion.div>
              )}

              {ritual.step === "reflection" && (
                <motion.div
                  key="reflection"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex-1 flex flex-col items-center justify-center text-center px-4"
                >
                  <div className="w-16 h-16 bg-white/40 backdrop-blur-xl border border-white/50 rounded-full flex items-center justify-center mb-6 shadow-sm">
                    <Sparkles className="w-8 h-8 text-[#5B2D7D]" />
                  </div>
                  <h2 className="text-3xl font-black text-[#5B2D7D] uppercase tracking-tighter mb-2 leading-none">How do you feel?</h2>
                  <p className="text-sm font-medium text-[#5B2D7D]/40 mb-12">Capture your current energy in one word.</p>

                  <input
                    type="text"
                    value={ritual.reflection}
                    onChange={(event) => setReflection(event.target.value)}
                    placeholder="Grateful, Calm, Ready..."
                    className="w-full p-4 text-3xl text-center bg-transparent border-b-2 border-[#5B2D7D]/10 text-[#5B2D7D] font-black placeholder:text-[#5B2D7D]/20 outline-none focus:border-[#5B2D7D]/30 mb-16 transition-colors"
                    autoFocus
                  />

                  <button
                    onClick={() => {
                      setIsSaving(true);
                      finishRitual().finally(() => setIsSaving(false));
                    }}
                    disabled={isSaving}
                    className="w-full h-16 rounded-full bg-[#5B2D7D] text-white font-bold text-lg shadow-xl shadow-[#5B2D7D]/20 active:scale-95 disabled:opacity-50 flex items-center justify-center"
                  >
                    {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : "Save & Complete Ritual"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </DrawerContent>
      </Drawer>

      <AnimatePresence>
        {!isPlayerOpen && ritual.step === "active" && currentHabit && (
          <motion.button
            initial={{ y: 40, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.96 }}
            onClick={openPlayer}
            className="fixed bottom-24 left-4 right-4 z-[60] max-w-sm mx-auto active:scale-[0.98] transition-transform"
          >
            <div className={`relative overflow-hidden rounded-full p-[2px] shadow-2xl backdrop-blur-md ${ritual.type === "MORNING" ? "bg-orange-200/70" : "bg-indigo-200/70"}`}>
              <div className="relative overflow-hidden rounded-full bg-white/95">
                <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-1.5 ${ritual.type === "MORNING" ? "bg-orange-100" : "bg-indigo-100"}`}>
                  <motion.div
                    className={`h-full rounded-full ${ritual.type === "MORNING" ? "bg-orange-500" : "bg-indigo-600"}`}
                    initial={false}
                    animate={{ width: `${Math.max(0, Math.min(100, (ritual.timeLeft / getDurationSeconds(currentHabit)) * 100))}%` }}
                    transition={{ duration: 1, ease: "linear" }}
                  />
                </div>

                <div className="relative flex items-center gap-3 px-4 py-3">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border ${ritual.type === "MORNING" ? "border-orange-100 bg-orange-50 text-orange-600" : "border-indigo-100 bg-indigo-50 text-indigo-600"}`}>
                    {ritual.type === "MORNING" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </div>

                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-[#41205B]">{formatSeconds(ritual.timeLeft)}</span>
                      <span className="rounded-full border border-[#5B2D7D]/8 bg-[#F7F1FA] px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#5B2D7D]/65">
                        {ritual.currentIndex + 1}/{ritual.habits.length}
                      </span>
                    </div>
                    <p className="truncate text-xs font-bold text-[#5B2D7D]/55">{currentHabit.title}</p>
                  </div>

                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      togglePause();
                    }}
                    className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#5B2D7D] text-white shadow-lg shadow-[#5B2D7D]/20 active:scale-95"
                    aria-label={ritual.isPaused ? "Resume timer" : "Pause timer"}
                  >
                    {ritual.isPaused ? <Play className="w-5 h-5 fill-white" /> : <Pause className="w-5 h-5 fill-white" />}
                  </button>
                </div>
              </div>
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}

export function RitualTimerProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ritual, setRitual] = useState<RitualRuntimeState | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  useEffect(() => {
    if (!ritual || ritual.step !== "active" || ritual.isPaused) return;
    if (ritual.timeLeft <= 0) {
      setRitual((prev) => {
        if (!prev) return null;
        if (prev.currentIndex < prev.habits.length - 1) {
          const nextIndex = prev.currentIndex + 1;
          return {
            ...prev,
            currentIndex: nextIndex,
            timeLeft: getDurationSeconds(prev.habits[nextIndex]),
          };
        }
        return { ...prev, step: "summary", timeLeft: 0 };
      });
      return;
    }

    const timer = window.setInterval(() => {
      setRitual((prev) => prev ? { ...prev, timeLeft: Math.max(0, prev.timeLeft - 1) } : null);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [ritual]);

  const value = useMemo<RitualTimerContextValue>(() => ({
    ritual,
    isPlayerOpen,
    startRitual: ({ productId, type, habits }) => {
      if (habits.length === 0) return;
      setRitual({
        productId,
        type,
        habits,
        currentIndex: 0,
        timeLeft: getDurationSeconds(habits[0]),
        isPaused: false,
        skippedIds: [],
        step: "active",
        reflection: "",
      });
      setIsPlayerOpen(true);
    },
    openPlayer: () => setIsPlayerOpen(true),
    closePlayer: () => setIsPlayerOpen(false),
    togglePause: () => setRitual((prev) => prev ? { ...prev, isPaused: !prev.isPaused } : null),
    extendTimer: () => setRitual((prev) => prev ? { ...prev, timeLeft: prev.timeLeft + 30 } : null),
    nextHabit: () => setRitual((prev) => {
      if (!prev) return null;
      if (prev.currentIndex < prev.habits.length - 1) {
        const nextIndex = prev.currentIndex + 1;
        return {
          ...prev,
          currentIndex: nextIndex,
          timeLeft: getDurationSeconds(prev.habits[nextIndex]),
        };
      }
      return { ...prev, step: "summary", timeLeft: 0 };
    }),
    skipHabit: () => setRitual((prev) => {
      if (!prev) return null;
      const currentHabit = prev.habits[prev.currentIndex];
      const skippedIds = prev.skippedIds.includes(currentHabit.id) ? prev.skippedIds : [...prev.skippedIds, currentHabit.id];
      if (prev.currentIndex < prev.habits.length - 1) {
        const nextIndex = prev.currentIndex + 1;
        return {
          ...prev,
          skippedIds,
          currentIndex: nextIndex,
          timeLeft: getDurationSeconds(prev.habits[nextIndex]),
        };
      }
      return { ...prev, skippedIds, step: "summary", timeLeft: 0 };
    }),
    goToReflection: () => setRitual((prev) => prev ? { ...prev, step: "reflection" } : null),
    setReflection: (value) => setRitual((prev) => prev ? { ...prev, reflection: value } : null),
    finishRitual: async () => {
      if (!ritual) return;

      const savingToast = toast.loading("Saving your ritual...");
      try {
        for (let index = 0; index < ritual.habits.length; index++) {
          const habit = ritual.habits[index];
          if (!ritual.skippedIds.includes(habit.id)) {
            const isLast = index === ritual.habits.length - 1 ||
              (index < ritual.habits.length - 1 && ritual.habits.slice(index + 1).every(next => ritual.skippedIds.includes(next.id)));

            await logHabit(habit.id, undefined, "DONE", undefined, undefined, isLast ? ritual.reflection : undefined);
          }
        }

        toast.dismiss(savingToast);
        toast.success("Ritual complete!");
        setRitual(null);
        setIsPlayerOpen(false);
        router.refresh();
      } catch (error) {
        toast.dismiss(savingToast);
        toast.error("Failed to save ritual");
      }
    },
    clearRitual: () => {
      setRitual(null);
      setIsPlayerOpen(false);
    },
  }), [isPlayerOpen, ritual, router]);

  return (
    <RitualTimerContext.Provider value={value}>
      {children}
      <RitualTimerOverlay />
    </RitualTimerContext.Provider>
  );
}

export function useRitualTimer() {
  const context = useContext(RitualTimerContext);
  if (!context) {
    throw new Error("useRitualTimer must be used within a RitualTimerProvider");
  }
  return context;
}

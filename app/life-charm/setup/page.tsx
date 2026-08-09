"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence, useMotionValue, useTransform } from "motion/react";
import { Sparkles, ArrowRight, X, Heart, Plus, ListTodo } from "lucide-react";
import { CURATED_TEMPLATES } from "@/lib/life-list-templates";
import { createLifeList } from "@/app/actions/life-charm";
import { toast } from "sonner";

interface CardData {
  id: string;
  title: string;
  category: string;
  emoji: string;
}

function getShuffledDeck(): CardData[] {
  const all = CURATED_TEMPLATES.flatMap((t) =>
    t.items.map((item) => ({
      id: item,
      title: item,
      category: t.name,
      emoji: t.emoji,
    }))
  );
  // Fisher-Yates shuffle for a fun, randomized deck
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

const Card = ({ card, isFront, onSwipe, direction }: { card: CardData, isFront: boolean, onSwipe: (dir: "left" | "right") => void, direction: string | null }) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const skipOpacity = useTransform(x, [-100, -20], [1, 0]);
  const addOpacity = useTransform(x, [20, 100], [0, 1]);

  const handleDragEnd = (e: any, info: any) => {
    if (info.offset.x > 100) {
      onSwipe("right");
    } else if (info.offset.x < -100) {
      onSwipe("left");
    }
  };

  return (
    <motion.div
      className="absolute w-full h-full max-h-[420px] flex items-center justify-center origin-bottom pointer-events-none"
      variants={{
        exit: (dir: string) => ({
          x: dir === "right" ? 500 : -500,
          opacity: 0,
          rotate: dir === "right" ? 15 : -15,
          transition: { duration: 0.3 }
        })
      }}
      initial={{ scale: 0.95, y: 20, opacity: 0 }}
      animate={{ scale: isFront ? 1 : 0.95, y: isFront ? 0 : 20, opacity: 1 }}
      exit="exit"
      custom={direction}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
    >
      <motion.div
        style={{ x, rotate, willChange: "transform" }}
        drag={isFront ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.6}
        onDragEnd={handleDragEnd}
        className={`w-full h-full bg-white rounded-[40px] shadow-2xl border-2 border-[#556B5A]/5 flex flex-col items-center justify-center p-6 origin-bottom ${isFront ? 'touch-none cursor-grab active:cursor-grabbing pointer-events-auto' : ''}`}
      >
         <motion.div style={{ opacity: skipOpacity, willChange: "opacity" }} className="absolute top-6 left-6 text-[#A68CAB] font-black text-xl border-4 border-[#A68CAB] rounded-xl px-3 py-1.5 rotate-[-15deg] z-10 pointer-events-none bg-white">
           PASS
         </motion.div>
         <motion.div style={{ opacity: addOpacity, willChange: "opacity" }} className="absolute top-6 right-6 text-[#7C9A86] font-black text-xl border-4 border-[#7C9A86] rounded-xl px-3 py-1.5 rotate-[15deg] z-10 pointer-events-none bg-white">
           ADD
         </motion.div>
         <span className="text-6xl mb-6 pointer-events-none">{card.emoji}</span>
         <h3 className="text-2xl font-black text-[#556B5A] text-center mb-4 leading-tight pointer-events-none">{card.title}</h3>
         <span className="px-4 py-1.5 bg-[#F6F2EC] text-[#556B5A]/70 text-[10px] font-bold uppercase tracking-widest rounded-full border border-[#E6DED1] pointer-events-none">
            {card.category}
         </span>
      </motion.div>
    </motion.div>
  );
};

export default function LifeCharmSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const charmId = searchParams.get("charmId");

  const [phase, setPhase] = useState<"swipe" | "review">("swipe");
  const [cards, setCards] = useState<CardData[]>([]);
  const [selected, setSelected] = useState<CardData[]>([]);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);
  
  const [customName, setCustomName] = useState("");
  const [newItemText, setNewItemText] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!charmId) {
      router.push("/");
      return;
    }
    setCards(getShuffledDeck());
  }, [charmId, router]);

  const handleSwipe = (dir: "left" | "right") => {
    setDirection(dir);
    const topCard = cards[cards.length - 1];
    
    if (dir === "right") {
      const newSelected = [...selected, topCard];
      setSelected(newSelected);
      if (newSelected.length >= 5) {
        setTimeout(() => setPhase("review"), 400);
      }
    }
    
    setCards(prev => prev.slice(0, -1));
    
    if (cards.length <= 1) {
       setTimeout(() => setPhase("review"), 400);
    }
  };

  const handleAddCustom = () => {
    const trimmed = newItemText.trim();
    if (!trimmed) return;
    if (selected.length >= 5) {
      toast.error("You can only have up to 5 items to start.");
      return;
    }
    if (selected.some(s => s.title === trimmed)) {
      toast.error("Item already added!");
      return;
    }
    setSelected([...selected, { id: trimmed, title: trimmed, category: "Custom", emoji: "✨" }]);
    setNewItemText("");
  };

  const handleRemove = (title: string) => {
    setSelected(prev => prev.filter(s => s.title !== title));
  };

  const handleCreate = () => {
    if (selected.length === 0) {
      toast.error("Please select at least one item.");
      return;
    }

    startTransition(async () => {
      const name = customName.trim() || "My Life List";
      const result = await createLifeList(charmId!, {
        name,
        description: "A mixed list of experiences",
        items: selected.map(s => s.title),
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Life list created!");
        router.push(`/life-charm?charmId=${charmId}`);
      }
    });
  };

  if (!charmId) return null;

  return (
    <div className="fixed inset-0 bg-[#F6F2EC] flex flex-col font-[family-name:var(--font-outfit)] overflow-hidden">
       {phase === "swipe" ? (
          <div className="flex-1 flex flex-col items-center justify-between py-8 px-6 overflow-hidden">
             <header className="text-center w-full mx-auto max-w-sm mt-2 shrink-0 bg-white/40 backdrop-blur-xl p-4 rounded-3xl border border-white/50 shadow-sm z-20">
               <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 15 }} className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm border border-[#556B5A]/10">
                 <Sparkles className="w-6 h-6 text-[#7C9A86]" />
               </motion.div>
               <h1 className="text-2xl font-black text-[#556B5A] uppercase tracking-tight leading-none">Build Your List</h1>
               <p className="text-[#556B5A]/60 font-bold text-xs mt-2">Pick up to 5 goals ({selected.length}/5)</p>
             </header>

             <div className="relative w-full max-w-[340px] flex-1 my-6 flex items-center justify-center perspective-[1000px]">
                <AnimatePresence custom={direction}>
                   {cards.slice(-3).map((card, idx, arr) => (
                      <Card 
                        key={card.id} 
                        card={card} 
                        isFront={idx === arr.length - 1} 
                        onSwipe={handleSwipe} 
                        direction={direction} 
                      />
                   ))}
                </AnimatePresence>
                {cards.length === 0 && (
                   <div className="text-center text-[#556B5A]/40 font-bold">No more goals!</div>
                )}
             </div>

             <div className="flex items-center justify-center gap-6 w-full max-w-sm mb-2 z-10 shrink-0">
                <button onClick={() => handleSwipe("left")} disabled={cards.length === 0} className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all text-[#A68CAB] disabled:opacity-50 border border-[#E6DED1]">
                   <X className="w-7 h-7" />
                </button>
                <button onClick={() => setPhase("review")} className="w-14 h-14 bg-[#556B5A]/10 rounded-full flex items-center justify-center text-[#556B5A] text-[10px] font-black uppercase tracking-widest hover:scale-110 active:scale-95 transition-all shadow-sm">
                   DONE
                </button>
                <button onClick={() => handleSwipe("right")} disabled={cards.length === 0} className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all text-[#7C9A86] disabled:opacity-50 border border-[#7C9A86]/20">
                   <Heart className="w-7 h-7 fill-current" />
                </button>
             </div>
          </div>
       ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col p-6 overflow-y-auto no-scrollbar pb-32">
             <header className="mb-8 mt-2 text-center w-full mx-auto max-w-sm bg-white/40 backdrop-blur-xl p-6 rounded-3xl border border-white/50 shadow-sm z-20">
                <div className="w-12 h-12 bg-[#556B5A] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl rotate-3">
                   <ListTodo className="w-6 h-6 text-white -rotate-3" />
                </div>
                <h2 className="text-2xl font-black text-[#556B5A] uppercase tracking-tight leading-none">Looking Good!</h2>
                <p className="text-[#556B5A]/60 text-xs font-bold mt-2">Let's review your new Life List</p>
             </header>

             <div className="space-y-8 max-w-md mx-auto w-full">
                <div>
                   <label className="block text-[11px] font-black uppercase tracking-widest text-[#556B5A]/60 mb-2 ml-4">Name Your List</label>
                   <input
                     type="text"
                     value={customName}
                     onChange={(e) => setCustomName(e.target.value)}
                     placeholder="e.g. My 2026 Adventure"
                     className="w-full px-5 py-4 rounded-[24px] bg-white border border-[#556B5A]/10 text-[#556B5A] font-bold placeholder-[#556B5A]/30 outline-none focus:border-[#7C9A86] focus:ring-4 focus:ring-[#7C9A86]/10 transition-all shadow-sm"
                   />
                </div>

                <div>
                   <label className="block text-[11px] font-black uppercase tracking-widest text-[#556B5A]/60 mb-2 ml-4">Your Selected Goals ({selected.length}/5)</label>
                   <div className="space-y-3">
                      {selected.length === 0 ? (
                         <p className="text-sm font-bold text-[#556B5A]/40 text-center py-6 bg-white/50 rounded-[24px] border border-dashed border-[#556B5A]/20">No items selected yet.</p>
                      ) : (
                         <AnimatePresence>
                           {selected.map(item => (
                              <motion.div key={item.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex items-center justify-between p-4 bg-white rounded-[24px] shadow-sm border border-[#556B5A]/5">
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-[#F6F2EC] rounded-full flex items-center justify-center text-xl shadow-sm border border-[#E6DED1]">{item.emoji}</div>
                                    <span className="font-bold text-[#556B5A] text-sm">{item.title}</span>
                                 </div>
                                 <button onClick={() => handleRemove(item.title)} className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center text-[#556B5A]/40 hover:bg-[#F6F2EC] hover:text-red-500 hover:border-red-100 transition-colors">
                                    <X className="w-4 h-4" />
                                 </button>
                              </motion.div>
                           ))}
                         </AnimatePresence>
                      )}
                   </div>
                </div>

                {selected.length < 5 && (
                   <div className="pt-2 pb-6">
                      <div className="flex gap-2 p-2 bg-white rounded-[24px] shadow-sm border border-[#556B5A]/10">
                         <input
                           type="text"
                           value={newItemText}
                           onChange={(e) => setNewItemText(e.target.value)}
                           onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
                           placeholder="Type a custom goal..."
                           className="flex-1 px-4 py-2 bg-transparent text-[#556B5A] font-bold placeholder-[#556B5A]/30 outline-none text-sm"
                         />
                         <button onClick={handleAddCustom} disabled={!newItemText.trim()} className="w-10 h-10 bg-[#7C9A86] rounded-full flex items-center justify-center text-white disabled:opacity-50 hover:scale-105 active:scale-95 transition-all shadow-md">
                            <Plus className="w-5 h-5" />
                         </button>
                      </div>
                   </div>
                )}
             </div>

             <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#F6F2EC] via-[#F6F2EC]/80 to-transparent pt-12 z-50 pointer-events-none">
                <div className="max-w-md mx-auto pointer-events-auto">
                   <button onClick={handleCreate} disabled={isPending || selected.length === 0} className="w-full py-5 bg-[#556B5A] text-white rounded-[24px] font-black uppercase tracking-widest text-[13px] flex items-center justify-center gap-2 shadow-xl hover:bg-[#445849] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100">
                      {isPending ? "Creating..." : "Create Life List"}
                      {!isPending && <ArrowRight className="w-5 h-5 ml-1" />}
                   </button>
                </div>
             </motion.div>
          </motion.div>
       )}
    </div>
  );
}

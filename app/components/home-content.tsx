"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, useMemo } from "react";
import { motion, useMotionValue, animate, useTransform, MotionValue, AnimatePresence } from "motion/react";
import { MemoryDrawer } from "@/components/memory-drawer";
import { LifeCharmDrawer } from "@/components/life-charm-drawer";
import { getOptimizedUrl } from "@/lib/media-helper";

import { Plus, Search, LayoutGrid, List, Mic, Music, X, GraduationCap, Flame, Zap } from "lucide-react";

// --- Data ---

type GridItemType = 
  | { type: 'memory', id: string, mediaUrl: string, mediaType: 'image' | 'video' | 'audio', title: string, date: string }
  | { type: 'life-charm', id: string, title: string, charmId: string, status?: string, stats: { total: number, lived: number }, coverImage?: string }
  | { type: 'habit-charm', id: string, title: string, charmId: string, status?: string, stats: { streak: number, target: number }, focusArea?: string }
  | { type: 'empty', id: string };

// --- Components ---

  // --- Components ---
  
  interface FilterBarProps {
      tags: string[];
      selectedFilter: string | null;
      onSelectFilter: (filter: string | null) => void;
      searchQuery: string;
      setSearchQuery: (q: string) => void;
      isSearchOpen: boolean;
      setIsSearchOpen: (open: boolean) => void;
  }
  
  function FilterBar({ tags, selectedFilter, onSelectFilter, searchQuery, setSearchQuery, isSearchOpen, setIsSearchOpen }: FilterBarProps) {
    const inputRef = useRef<HTMLInputElement>(null);
  
    useEffect(() => {
        if (isSearchOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isSearchOpen]);
  
    return (
      <div className="flex items-center gap-3 px-6 py-4 overflow-x-auto no-scrollbar z-10 relative">
        <div className={`shrink-0 rounded-full bg-white shadow-sm flex items-center transition-all duration-300 overflow-hidden h-10 ${isSearchOpen ? 'w-60 px-4' : 'w-10 justify-center'}`}>
           {isSearchOpen ? (
               <>
                  <input 
                      ref={inputRef}
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="w-full h-full bg-transparent outline-none text-[#5B2D7D] text-base placeholder-[#5B2D7D]/40 min-w-0"
                      onBlur={() => !searchQuery && setIsSearchOpen(false)}
                  />
                  {searchQuery ? (
                       <button onClick={() => setSearchQuery("")} className="ml-2">
                          <X className="w-4 h-4 text-[#5B2D7D]/60" />
                       </button>
                  ) : null}
               </>
           ) : (
              <button onClick={() => setIsSearchOpen(true)} className="w-full h-full flex items-center justify-center">
                  <Search className="w-5 h-5 text-[#5B2D7D]" />
              </button>
           )}
        </div>
        
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => onSelectFilter(selectedFilter === tag ? null : tag)}
            className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap shadow-sm transition-colors ${
                selectedFilter === tag 
                ? 'bg-[#5B2D7D] text-white' 
                : 'bg-[#EADDDE] text-[#5B2D7D] hover:bg-[#EADDDE]/80'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
    );
  }


// --- Helper for Distance Calculation ---
function useDistance(
    x: MotionValue<number>, 
    y: MotionValue<number>, 
    row: number, 
    col: number, 
    cellSize: { width: number, height: number }, 
    containerSize: { width: number, height: number },
    visualYOffset: number
) {
    return useTransform([x, y], (values: number[]) => {
        const [latestX, latestY] = values;
        if (cellSize.width === 0 || containerSize.width === 0) return 1000;
        
        // Target position for this cell to be centered
        const targetX = (containerSize.width - cellSize.width) / 2 - col * cellSize.width;
        const targetY = (containerSize.height - cellSize.height) / 2 - visualYOffset - row * cellSize.height;

        const distX = Math.abs(latestX - targetX);
        const distY = Math.abs(latestY - targetY);
        
        // Euclidean distance for radial falloff
        return Math.sqrt(distX * distX + distY * distY);
    });
}

function MemoryCard({ 
    item, 
    onClick,
    x, y, row, col, cellSize, containerSize, visualYOffset
}: { 
    item: Extract<GridItemType, { type: 'memory' }>; 
    onClick: () => void;
    x: MotionValue<number>;
    y: MotionValue<number>;
    row: number;
    col: number;
    cellSize: { width: number, height: number };
    containerSize: { width: number, height: number };
    visualYOffset: number;
}) {
    const dist = useDistance(x, y, row, col, cellSize, containerSize, visualYOffset);
    
    // Map distance to visual properties
    const scale = useTransform(dist, [0, 400], [1, 0.85]);
    const opacity = useTransform(dist, [0, 400], [1, 0.5]);
    const titleOpacity = useTransform(dist, [0, 200], [1, 0]);

    return (
        <motion.div 
            onClick={onClick}
            className="w-full h-full relative p-4 flex flex-col justify-end shadow-lg rounded-[32px] overflow-hidden group origin-center cursor-pointer"
            style={{ 
                scale,
                opacity,
                willChange: "transform, opacity",
                touchAction: "none",
                transform: "translate3d(0,0,0)",
                backfaceVisibility: "hidden"
            }}
            whileTap={{ scale: 0.98 }}
        >
             {/* Background Media */}
             <div className="absolute inset-0">
                {item.mediaType === 'audio' ? (
                    <div className="w-full h-full bg-[#FFF5F0] flex flex-col items-center justify-center relative overflow-hidden">
                        {/* Decorative circles */}
                        <div className="absolute w-64 h-64 rounded-full bg-[#5B2D7D]/5 blur-3xl -top-10 -right-10"></div>
                        <div className="absolute w-64 h-64 rounded-full bg-[#F37B55]/10 blur-3xl -bottom-10 -left-10"></div>
                        
                        <div className="w-20 h-20 rounded-full bg-[#5B2D7D]/10 flex items-center justify-center mb-4 relative z-10">
                            <Mic className="w-10 h-10 text-[#5B2D7D]" />
                        </div>
                        {/* Simple bars visualization */}
                        <div className="flex items-end gap-1 h-8 mb-8 opacity-50">
                             {[40, 70, 50, 80, 60, 90, 40].map((h, i) => (
                                 <div key={i} className="w-1 bg-[#5B2D7D] rounded-full" style={{ height: `${h}%` }}></div>
                             ))}
                        </div>
                    </div>
                ) : (
                    <img src={item.mediaUrl} alt={item.title} className="w-full h-full object-cover" />
                )}
                
                {/* Gradient Overlay (darker for images, lighter for audio?) */}
                <div className={`absolute inset-0 ${item.mediaType === 'audio' ? 'bg-linear-to-t from-[#5B2D7D]/40 via-transparent to-transparent' : 'bg-linear-to-t from-black/60 via-black/10 to-transparent'}`}></div>
             </div>

             {/* Content */}
             <motion.div 
                className="relative z-10 text-center mb-6"
                style={{ opacity: titleOpacity }}
            >
                 <h3 className={`text-2xl font-bold font-[Outfit] ${item.mediaType === 'audio' ? 'text-[#5B2D7D]' : 'text-white'}`}>{item.title}</h3>
                 <p className={`text-sm mt-1 ${item.mediaType === 'audio' ? 'text-[#5B2D7D]/70' : 'text-white/80'}`}>{item.date}</p>
             </motion.div>
        </motion.div>
    )
}

function LifeCharmCard({ 

    item, 

    onClick,

    x, y, row, col, cellSize, containerSize, visualYOffset

}: { 

    item: Extract<GridItemType, { type: 'life-charm' }>; 

    onClick: () => void;

    x: MotionValue<number>;

    y: MotionValue<number>;

    row: number;

    col: number;

    cellSize: { width: number, height: number };

    containerSize: { width: number, height: number };

    visualYOffset: number;

}) {

    const dist = useDistance(x, y, row, col, cellSize, containerSize, visualYOffset);

    

    // Map distance to visual properties

    const scale = useTransform(dist, [0, 400], [1, 0.85]);

    const opacity = useTransform(dist, [0, 400], [1, 0.6]);

    const contentOpacity = useTransform(dist, [0, 200], [1, 0]);



    const percentage = item.stats.total > 0 ? Math.round((item.stats.lived / item.stats.total) * 100) : 0;



    return (

        <motion.div 

            onClick={onClick}

            className="w-full h-full relative flex flex-col justify-end shadow-xl rounded-[32px] overflow-hidden group origin-center cursor-pointer bg-[#2E1640]"

            style={{ 

                scale,

                opacity,

                willChange: "transform, opacity",

                touchAction: "none",

                transform: "translate3d(0,0,0)",

                backfaceVisibility: "hidden"

            }}

            whileTap={{ scale: 0.98 }}

        >

             {/* Background Image */}

             {item.coverImage ? (

                 <div className="absolute inset-0">

                     <img src={item.coverImage} alt="" className="w-full h-full object-cover" />

                     {/* Strong Gradient Overlay for readability */}

                     <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />

                 </div>

             ) : (

                 /* Decorative Gradient Background */

                 <div className="absolute inset-0 bg-gradient-to-br from-[#5B2D7D] to-[#2E1640]">

                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl transform translate-x-10 -translate-y-10"></div>

                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#A4C538]/20 rounded-full blur-3xl transform -translate-x-10 translate-y-10"></div>

                 </div>

             )}



             {/* Top Badge */}

             <div className="absolute top-4 left-4 z-20">

                 <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10">

                    <GraduationCap className="w-4 h-4 text-white" />

                    <span className="text-xs font-bold text-white uppercase tracking-wider">Life Charm</span>

                 </div>

             </div>



             {/* Main Content (Bottom Aligned) */}

             <motion.div 

                className="relative z-10 px-8 pb-24 flex flex-col w-full"

                style={{ opacity: contentOpacity }}

             >

                 {item.status === 'GRADUATED' && (

                    <div className="self-start mb-4 px-3 py-1 bg-[#A4C538] rounded-lg shadow-lg transform -rotate-2">

                        <span className="text-white text-xs font-black uppercase tracking-widest">Graduated</span>

                    </div>

                 )}



                 <h3 className="text-4xl font-black font-[Outfit] text-white leading-[0.9] mb-6 drop-shadow-2xl line-clamp-3 tracking-tighter uppercase">

                    {item.title}

                 </h3>

                 

                 {/* Stats Row */}

                 {item.stats.total > 0 ? (

                    <div className="flex items-baseline gap-3">

                        <span className="text-8xl font-black text-[#A4C538] leading-none tracking-tighter drop-shadow-xl">

                            {item.stats.lived}

                        </span>

                        <div className="flex flex-col">

                            <span className="text-3xl font-black text-white/30 leading-none">/ {item.stats.total}</span>

                            <span className="text-[#A4C538] text-[10px] font-black uppercase tracking-[0.3em] mt-1">Lived</span>

                        </div>

                    </div>

                 ) : (

                    <span className="text-white/80 text-xl font-medium font-[Outfit] self-start border-2 border-white/20 rounded-full px-6 py-2">

                        Tap to Start Your List

                    </span>

                 )}

             </motion.div>



             {/* Detached, Thick, Gradient Progress Bar */}

             {item.stats.total > 0 && (

                 <div className="absolute bottom-8 left-8 right-8 h-6 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">

                    <motion.div 

                        className="h-full bg-gradient-to-r from-[#A4C538] via-[#A4C538] to-[#E3FF80] shadow-[0_0_30px_rgba(164,197,56,0.4)] rounded-full" 

                        initial={{ width: 0 }}

                        animate={{ width: `${percentage}%` }}

                        transition={{ duration: 1.5, ease: [0.34, 1.56, 0.64, 1] }}

                    />

                 </div>

             )}

        </motion.div>

    )

}



function HabitCharmCard({ 

    item, 

    onClick,

    x, y, row, col, cellSize, containerSize, visualYOffset

}: { 

    item: Extract<GridItemType, { type: 'habit-charm' }>; 

    onClick: () => void;

    x: MotionValue<number>;

    y: MotionValue<number>;

    row: number;

    col: number;

    cellSize: { width: number, height: number };

    containerSize: { width: number, height: number };

    visualYOffset: number;

}) {

    const dist = useDistance(x, y, row, col, cellSize, containerSize, visualYOffset);

    

    const scale = useTransform(dist, [0, 400], [1, 0.85]);

    const opacity = useTransform(dist, [0, 400], [1, 0.6]);

    const contentOpacity = useTransform(dist, [0, 200], [1, 0]);



    const percentage = item.stats.target > 0 ? Math.round((item.stats.streak / item.stats.target) * 100) : 0;



    return (

        <motion.div 

            onClick={onClick}

            className="w-full h-full relative flex flex-col justify-end shadow-xl rounded-[32px] overflow-hidden group origin-center cursor-pointer bg-[#1A1A1A]"

            style={{ 

                scale,

                opacity,

                willChange: "transform, opacity",

                touchAction: "none",

                transform: "translate3d(0,0,0)",

                backfaceVisibility: "hidden"

            }}

            whileTap={{ scale: 0.98 }}

        >

             {/* Decorative Gradient Background */}

             <div className="absolute inset-0 bg-gradient-to-br from-[#1A1A1A] to-[#2E1640]">

                <div className="absolute top-0 right-0 w-48 h-48 bg-[#F37B55]/10 rounded-full blur-3xl transform translate-x-10 -translate-y-10"></div>

                <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#5B2D7D]/20 rounded-full blur-3xl transform -translate-x-10 translate-y-10"></div>

             </div>



             {/* Top Badge */}

             <div className="absolute top-4 left-4 z-20">

                 <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10">

                    <div className="text-xs">

                        {item.focusArea === 'energy' && '⚡'}

                        {item.focusArea === 'movement' && '🏃'}

                        {item.focusArea === 'rest' && '🌙'}

                        {item.focusArea === 'mind' && '🧠'}

                        {item.focusArea === 'connection' && '❤️'}

                        {!item.focusArea && <Zap className="w-4 h-4 text-white" />}

                    </div>

                    <span className="text-xs font-bold text-white uppercase tracking-wider">Habit Charm</span>

                 </div>

             </div>



             {/* Main Content (Bottom Aligned) */}

             <motion.div 

                className="relative z-10 px-8 pb-24 flex flex-col w-full"

                style={{ opacity: contentOpacity }}

             >

                 {item.status === 'GRADUATED' && (

                    <div className="self-start mb-4 px-3 py-1 bg-[#F37B55] rounded-lg shadow-lg transform -rotate-2">

                        <span className="text-white text-xs font-black uppercase tracking-widest">Graduated</span>

                    </div>

                 )}



                 <h3 className="text-4xl font-black font-[Outfit] text-white leading-[0.9] mb-6 drop-shadow-2xl line-clamp-3 tracking-tighter uppercase">

                    {item.title}

                 </h3>

                 

                 {/* Stats Row */}

                 <div className="flex items-baseline gap-3">

                    <div className="flex items-center gap-2">

                        <Flame className="w-8 h-8 text-[#F37B55] fill-[#F37B55]" />

                        <span className="text-8xl font-black text-[#F37B55] leading-none tracking-tighter drop-shadow-xl">

                            {item.stats.streak}

                        </span>

                    </div>

                    <div className="flex flex-col">

                        <span className="text-3xl font-black text-white/30 leading-none">/ {item.stats.target}</span>

                        <span className="text-[#F37B55] text-[10px] font-black uppercase tracking-[0.3em] mt-1">Day Streak</span>

                    </div>

                 </div>

             </motion.div>



             {/* Detached, Thick, Gradient Progress Bar */}

             <div className="absolute bottom-8 left-8 right-8 h-6 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">

                <motion.div 

                    className="h-full bg-gradient-to-r from-[#F37B55] to-[#FF9D7E] shadow-[0_0_30px_rgba(243,123,85,0.4)] rounded-full" 

                    initial={{ width: 0 }}

                    animate={{ width: `${percentage}%` }}

                    transition={{ duration: 1.5, ease: [0.34, 1.56, 0.64, 1] }}

                />

             </div>

        </motion.div>

    )

}

function EmptyCard({ 
    onClick,
    x, y, row, col, cellSize, containerSize, visualYOffset
}: { 
    onClick: () => void;
    x: MotionValue<number>;
    y: MotionValue<number>;
    row: number;
    col: number;
    cellSize: { width: number, height: number };
    containerSize: { width: number, height: number };
    visualYOffset: number;
}) {
    const dist = useDistance(x, y, row, col, cellSize, containerSize, visualYOffset);

    // Visuals

    const scale = useTransform(dist, [0, 400], [1, 0.85]);
    const opacity = useTransform(dist, [0, 400], [1, 0.6]);
    const contentOpacity = useTransform(dist, [0, 200], [1, 0.5]);
    
    return (
        <motion.div 
            className={`w-full h-full rounded-[32px] flex flex-col items-center justify-center overflow-hidden cursor-pointer bg-white/60 shadow-md`}
            style={{ 
                scale,
                opacity,
                willChange: "transform, opacity",
                touchAction: "none",
                transform: "translate3d(0,0,0)",
                backfaceVisibility: "hidden"
            }}
            onClick={onClick}
        > 
             <motion.div 
                className="flex flex-col items-center justify-center"
                style={{ 
                    opacity: contentOpacity,
                    scale: useTransform(dist, [0, 400], [1, 0.9])
                }}
             >
                 <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 shadow-sm bg-[#EADDDE]`}>
                    <Plus className="w-8 h-8 text-[#5B2D7D]" />
                 </div>
                 <span className="text-[#5B2D7D] font-medium font-[Outfit]">Add a Memory</span>
             </motion.div>
        </motion.div>
    )
}

// --- List View Components ---

function ListMemoryCard({ item, onClick }: { item: Extract<GridItemType, { type: 'memory' }>; onClick: () => void }) {
    return (
        <div 
            onClick={onClick}
            className="w-full mb-4 break-inside-avoid relative rounded-2xl overflow-hidden cursor-pointer"
        >
            <div className="relative">
                {item.mediaType === 'audio' ? (
                     <div className="w-full aspect-square bg-[#FFF5F0] flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="absolute w-32 h-32 rounded-full bg-[#5B2D7D]/5 blur-2xl top-0 right-0"></div>
                        <div className="w-12 h-12 rounded-full bg-[#5B2D7D]/10 flex items-center justify-center mb-2 relative z-10">
                            <Mic className="w-6 h-6 text-[#5B2D7D]" />
                        </div>
                     </div>
                ) : (
                    <img src={item.mediaUrl} alt={item.title} className="w-full h-auto object-cover block" />
                )}
            </div>

            <div className="pt-2 pb-1">
                 <h3 className="text-[#5B2D7D] font-bold text-lg leading-tight font-[Outfit]">{item.title}</h3>
                 <p className="text-[#5B2D7D]/60 text-xs mt-1">{item.date}</p>
            </div>
        </div>
    )
}

function ListLifeCharmCard({ item, onClick }: { item: Extract<GridItemType, { type: 'life-charm' }>; onClick: () => void }) {
    return (
        <div 
            onClick={onClick}
            className="w-full mb-4 break-inside-avoid relative rounded-2xl overflow-hidden cursor-pointer bg-gradient-to-br from-[#5B2D7D] to-[#452260] aspect-[4/5] flex flex-col items-center justify-center text-center p-6"
        >
             <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mb-4 backdrop-blur-sm border border-white/20">
                <GraduationCap className="w-7 h-7 text-white" />
             </div>
             
             <h3 className="text-2xl font-black font-[Outfit] text-white leading-tight mb-3 uppercase tracking-tighter">
                {item.title}
             </h3>

             {item.stats.total > 0 && (
                <div className="flex flex-col items-center mb-4">
                    <span className="text-4xl font-black text-[#A4C538] leading-none">{item.stats.lived}/{item.stats.total}</span>
                    <span className="text-[#A4C538] text-[10px] font-black uppercase tracking-[0.2em] mt-1">Lived</span>
                </div>
             )}
             
             <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10">
                <span className="text-[10px] font-medium text-white/90 uppercase tracking-wide">Life Charm</span>
             </div>
        </div>
    )
}

function ListHabitCard({ item, onClick }: { item: Extract<GridItemType, { type: 'habit-charm' }>; onClick: () => void }) {
    return (
        <div 
            onClick={onClick}
            className="w-full mb-4 break-inside-avoid relative rounded-2xl overflow-hidden cursor-pointer bg-gradient-to-br from-[#1A1A1A] to-[#2E1640] aspect-[4/5] flex flex-col items-center justify-center text-center p-6"
        >
             <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mb-4 backdrop-blur-sm border border-white/20">
                <div className="text-2xl">
                    {item.focusArea === 'energy' && '⚡'}
                    {item.focusArea === 'movement' && '🏃'}
                    {item.focusArea === 'rest' && '🌙'}
                    {item.focusArea === 'mind' && '🧠'}
                    {item.focusArea === 'connection' && '❤️'}
                    {!item.focusArea && <Zap className="w-7 h-7 text-white" />}
                </div>
             </div>
             
             <h3 className="text-2xl font-black font-[Outfit] text-white leading-tight mb-3 uppercase tracking-tighter">
                {item.title}
             </h3>

             <div className="flex flex-col items-center mb-4">
                <div className="flex items-center gap-1">
                    <Flame className="w-5 h-5 text-[#F37B55] fill-[#F37B55]" />
                    <span className="text-4xl font-black text-[#F37B55] leading-none">{item.stats.streak}</span>
                </div>
                <span className="text-[#F37B55] text-[10px] font-black uppercase tracking-[0.2em] mt-1">Day Streak</span>
             </div>
             
             <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10">
                <span className="text-[10px] font-medium text-white/90 uppercase tracking-wide">Habit Charm</span>
             </div>
        </div>
    )
}


function getCenterOutOrder(n: number): number[] {
    const center = (n - 1) / 2;
    const cells: { index: number; dist: number }[] = [];

    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            const dist = Math.sqrt(Math.pow(r - center, 2) + Math.pow(c - center, 2));
            cells.push({ index: r * n + c, dist });
        }
    }

    // Sort by distance (ascending)
    cells.sort((a, b) => a.dist - b.dist);
    return cells.map(cell => cell.index);
}

interface HomeContentProps {
  initialMemories?: any[];
  lifeCharms?: any[]; // Products with type='LIFE'
  habitCharms?: any[]; // Products with type='HABIT'
  people?: any[];
  user?: any;
  isGuest?: boolean;
  guestToken?: string;
  forcedViewMode?: 'grid' | 'list';
}

export default function HomeContent({ initialMemories, lifeCharms = [], habitCharms = [], people = [], user, isGuest = false, guestToken, forcedViewMode }: HomeContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const charmId = searchParams.get('charmId');

  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedMemory, setSelectedMemory] = useState<any>(null);
  const [selectedLifeCharm, setSelectedLifeCharm] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(forcedViewMode || 'grid');
  
  const [cellSize, setCellSize] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  
  const dragStartRef = useRef<{col: number, row: number} | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // --- Filters & Search State ---
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  // Extract unique tags (Emotions + Moods)
  const uniqueTags = useMemo(() => {
     if (!initialMemories) return [];
     const tags = new Set<string>();
     initialMemories.forEach(mem => {
         if (mem.emotions && Array.isArray(mem.emotions)) {
             mem.emotions.forEach((e: string) => tags.add(e.trim()));
         } else if (mem.emotions && typeof mem.emotions === 'string') {
             mem.emotions.split(',').forEach((e: string) => tags.add(e.trim()));
         }
         
         if (mem.events && Array.isArray(mem.events)) {
             mem.events.forEach((e: string) => tags.add(e.trim()));
         } else if (mem.events && typeof mem.events === 'string') {
             mem.events.split(',').forEach((e: string) => tags.add(e.trim()));
         }

         if (mem.mood) tags.add(mem.mood.trim());
     });
     return Array.from(tags).sort();
  }, [initialMemories]);

  // Filter Memories
  const filteredMemories = useMemo(() => {
      if (!initialMemories) return [];
      
      return initialMemories.filter(mem => {
          // Search Filter
          if (searchQuery) {
              const q = searchQuery.toLowerCase();
              const titleMatch = mem.title?.toLowerCase().includes(q);
              const descMatch = mem.description?.toLowerCase().includes(q);
              if (!titleMatch && !descMatch) return false;
          }

          // Tag Filter
          if (selectedFilter) {
              const hasMood = mem.mood === selectedFilter;
              let hasEmotion = false;
              if (Array.isArray(mem.emotions)) {
                  hasEmotion = mem.emotions.includes(selectedFilter);
              } else if (typeof mem.emotions === 'string') {
                   hasEmotion = mem.emotions.split(',').map((e: string) => e.trim()).includes(selectedFilter);
              }

              let hasEvent = false;
              if (Array.isArray(mem.events)) {
                  hasEvent = mem.events.includes(selectedFilter);
              } else if (typeof mem.events === 'string') {
                   hasEvent = mem.events.split(',').map((e: string) => e.trim()).includes(selectedFilter);
              }
              
              if (!hasMood && !hasEmotion && !hasEvent) return false;
          }

          return true;
      });
  }, [initialMemories, searchQuery, selectedFilter]);

  // Combine Life Charms and Memories for Grid
  const combinedItems = useMemo(() => {
    // Only show Life Charms if no specific filter/search is active (or maybe include them always?)
    // Typically, if I search for "Happy", a Life Charm doesn't have emotions, so it shouldn't show.
    // If I have no filters, show Life Charms first.
    
    if (searchQuery || selectedFilter) {
        return filteredMemories;
    }
    
    // Map Life Charms to GridItemType
    const lifeCharmItems: GridItemType[] = lifeCharms.map(lc => {
        const items = lc.lifeLists?.[0]?.items || [];
        
        // DEBUG: Log items structure
        console.log(`[LifeCharm: ${lc.name}] Items:`, items);

        const total = items.length;
        const lived = items.filter((i: any) => i.status === 'lived').length;
        
        // Collect all valid media from lived items
        const allMedia: string[] = [];
        items.forEach((item: any) => {
            // DEBUG: Check each item's media
            if (item.status === 'lived') {
                console.log(`[LifeCharm: ${lc.name}] Checking item ${item.title}:`, item.experience);
            }

            if (item.status === 'lived' && item.experience?.media?.length > 0) {
                item.experience.media.forEach((m: any) => {
                    if (m.type === 'image' || m.type === 'video') {
                        allMedia.push(m.url);
                    }
                });
            }
        });

        console.log(`[LifeCharm: ${lc.name}] All collected media:`, allMedia);

        // Select a random cover image if any exist
        let coverImage: string | undefined;
        if (allMedia.length > 0) {
            const randomIndex = Math.floor(Math.random() * allMedia.length);
            coverImage = getOptimizedUrl(allMedia[randomIndex], 'image', 600);
        }

        return {
            type: 'life-charm',
            id: `lc-${lc.id}`,
            title: lc.name,
            charmId: lc.id,
            status: lc.state,
            stats: { total, lived },
            coverImage
        };
    });

    // Map Habit Charms to GridItemType
    const habitCharmItems: GridItemType[] = habitCharms.map(hc => {
        const activeHabit = hc.habits?.find((h: any) => h.isActive);
        
        return {
            type: 'habit-charm',
            id: `hc-${hc.id}`,
            title: activeHabit?.title || hc.name,
            charmId: hc.id,
            status: hc.state,
            focusArea: activeHabit?.focusArea,
            stats: { 
                streak: activeHabit?.currentStreak || 0, 
                target: activeHabit?.targetDays || 66 
            }
        };
    });

    const allItems = [...lifeCharmItems, ...habitCharmItems, ...filteredMemories];
    
    // Randomize (Fisher-Yates Shuffle)
    for (let i = allItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allItems[i], allItems[j]] = [allItems[j], allItems[i]];
    }

    return allItems;
  }, [filteredMemories, lifeCharms, habitCharms, searchQuery, selectedFilter]);


  // Initialize Grid Data
  // We need to re-calc grid size based on COMBINED items
  const [gridData, setGridData] = useState<GridItemType[]>([]);

  useEffect(() => {
        const totalItems = combinedItems.length;
        const currentGridSize = Math.max(3, Math.ceil(Math.sqrt(totalItems)));
        const totalCells = currentGridSize * currentGridSize;
        const initialGrid: GridItemType[] = Array(totalCells).fill(null).map((_, i) => ({ type: 'empty', id: `e${i}` }));
        
        const newGrid = [...initialGrid];
        const itemsToMap = combinedItems.slice(0, totalCells);
        const FILL_ORDER = getCenterOutOrder(currentGridSize);

        itemsToMap.forEach((item: any, index: number) => {
            const gridIndex = FILL_ORDER[index];
            if (gridIndex === undefined) return;

            // Check if it's already a shaped GridItem (LifeCharm/HabitCharm) or raw Memory
            if (item.type === 'life-charm' || item.type === 'habit-charm') {
                newGrid[gridIndex] = item;
            } else {
                // It's a memory
                const memory = item;
                const dateObj = new Date(memory.date);
                const dateStr = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
                
                let mediaUrl = 'https://images.unsplash.com/photo-1533174072545-e8d4aa97edf9?auto=format&fit=crop&w=800&q=80';
                let mediaType: 'image' | 'video' | 'audio' = 'image';

                if (memory.media && memory.media.length > 0) {
                    const firstMedia = memory.media[0];
                    if (firstMedia.type.startsWith('video')) {
                        const videoAsImage = firstMedia.url.replace(/\.[^/.]+$/, ".jpg");
                        mediaUrl = getOptimizedUrl(videoAsImage, 'image', 400);
                        mediaType = 'video';
                    } else if (firstMedia.type.startsWith('audio')) {
                        mediaUrl = firstMedia.url;
                        mediaType = 'audio';
                    } else {
                        mediaUrl = getOptimizedUrl(firstMedia.url, 'image', 400);
                        mediaType = 'image';
                    }
                }

                newGrid[gridIndex] = {
                    type: 'memory',
                    id: memory.id,
                    title: memory.title,
                    date: dateStr,
                    mediaUrl,
                    mediaType
                };
            }
        });
        setGridData(newGrid);
  }, [combinedItems]);


  // Measure cell size on mount/resize
  useEffect(() => {
    const updateSize = () => {
        if (containerRef.current) {
            const containerW = containerRef.current.offsetWidth;
            const containerH = containerRef.current.offsetHeight;
            const w = Math.min(containerW * 0.75, 380);
            const h = Math.min(containerH * 0.60, 550);

            setCellSize({ width: w, height: h });
            setContainerSize({ width: containerW, height: containerH });
        } else {
             setCellSize({
                width: Math.min(window.innerWidth * 0.75, 380),
                height: Math.min(window.innerHeight * 0.60, 550)
            });
        }
    };
    setTimeout(updateSize, 0); 
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const VISUAL_Y_OFFSET = 60;
  const currentGridSize = Math.max(3, Math.ceil(Math.sqrt(combinedItems.length))); // Derived for positioning

  // Set Initial Position (Centering)
  useEffect(() => {
    if (cellSize.width === 0 || containerSize.width === 0) return;
    
    const centerIndex = getCenterOutOrder(currentGridSize)[0];
    if (centerIndex === undefined) return;

    const row = Math.floor(centerIndex / currentGridSize);
    const col = centerIndex % currentGridSize;

    const initialX = (containerSize.width - cellSize.width) / 2 - col * cellSize.width;
    const initialY = (containerSize.height - cellSize.height) / 2 - VISUAL_Y_OFFSET - row * cellSize.height;

    x.set(initialX);
    y.set(initialY);
    
  }, [cellSize, containerSize, currentGridSize, x, y]);


  const handleAddMemory = () => {
    if (isGuest && guestToken) {
        router.push(`/upload-memory?guest_token=${guestToken}`);
    } else {
        router.push("/upload-memory");
    }
  };

  const handleMemoryClick = (id: string) => {
      const memory = initialMemories?.find(m => m.id === id);
      if (memory) {
          setSelectedMemory(memory);
      }
  };
  
  const handleLifeCharmClick = (charmId: string) => {
      const charm = lifeCharms.find((lc: any) => lc.id === charmId);
      if (charm) {
          setSelectedLifeCharm(charm);
      }
  };

  const handleHabitCharmClick = (charmId: string) => {
      router.push(`/habit-charm?charmId=${charmId}`);
  };

  return (
    <div className="flex flex-col h-full bg-[#FDF2EC] relative overflow-hidden"> 
      <div className="shrink-0 pt-2 pb-2 z-30 relative pointer-events-none">
          <div className="pointer-events-auto">
             <FilterBar 
                tags={uniqueTags}
                selectedFilter={selectedFilter}
                onSelectFilter={setSelectedFilter}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                isSearchOpen={isSearchOpen}
                setIsSearchOpen={setIsSearchOpen}
             />
          </div>
      </div>

      <div className="flex-1 min-h-0 relative flex flex-col justify-end" ref={containerRef}>
             {viewMode === 'grid' ? (
             <motion.div  
                className="grid gap-0 absolute top-0 left-0 touch-none origin-top-left"
                style={{ 
                    gridTemplateColumns: `repeat(${currentGridSize}, ${cellSize.width ? cellSize.width + 'px' : '75vw'})`,
                    gridTemplateRows: `repeat(${currentGridSize}, ${cellSize.height ? cellSize.height + 'px' : '60vh'})`,
                    x, 
                    y,
                    width: currentGridSize * (cellSize.width || 0),
                    height: currentGridSize * (cellSize.height || 0),
                    willChange: "transform",
                    touchAction: "none",
                    overscrollBehavior: "none",
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    perspective: 1000,
                    backfaceVisibility: "hidden",
                    transform: "translate3d(0,0,0)"
                }}
                drag
                dragDirectionLock
                dragElastic={0.2}
                dragMomentum={false}
                onDragStart={() => {
                    const textContentWidth = cellSize.width;
                    const textContentHeight = cellSize.height;
                    
                    const offsetStartX = (containerSize.width - textContentWidth) / 2;
                    const currentX = x.get();
                    const startCol = Math.round((offsetStartX - currentX) / textContentWidth);

                    const offsetStartY = (containerSize.height - textContentHeight) / 2 - VISUAL_Y_OFFSET;
                    const currentY = y.get();
                    const startRow = Math.round((offsetStartY - currentY) / textContentHeight);
                    
                    dragStartRef.current = { col: startCol, row: startRow };
                }}
                onDragEnd={(e, { offset }) => {
                    const isX = Math.abs(offset.x) > Math.abs(offset.y);
                    
                    const textContentSize = isX ? cellSize.width : cellSize.height;
                    const containerValues = isX ? containerSize.width : containerSize.height;
                    let offsetStart = (containerValues - textContentSize) / 2;
                    if (!isX) offsetStart -= VISUAL_Y_OFFSET;

                    const SWIPE_THRESHOLD = 50; 
                    let targetIndex = 0;
                    
                    if (dragStartRef.current) {
                        const startIndex = isX ? dragStartRef.current.col : dragStartRef.current.row;
                        const dragOffset = isX ? offset.x : offset.y;
                        
                        let direction = 0;
                        if (dragOffset < -SWIPE_THRESHOLD) direction = 1;
                        if (dragOffset > SWIPE_THRESHOLD) direction = -1;

                        targetIndex = startIndex + direction;
                    } else {
                        const current = isX ? x.get() : y.get();
                        targetIndex = Math.round((offsetStart - current) / textContentSize);
                    }
                    
                    const clampedIndex = Math.max(0, Math.min(currentGridSize - 1, targetIndex));
                    const snapPoint = offsetStart - clampedIndex * textContentSize;
                    const valueToAnimate = isX ? x : y;
                    
                    animate(valueToAnimate, snapPoint, {
                        type: "spring",
                        stiffness: 300,
                        damping: 30
                    });
                }}
              >
                 {gridData.map((item, index) => {
                     const r = Math.floor(index / currentGridSize);
                     const c = index % currentGridSize;
                     
                     return (
                    <div 
                        key={index}
                        className="flex items-center justify-center p-2"
                        style={{ width: cellSize.width || '75vw', height: cellSize.height || '60vh' }}
                    >
                        {item && item.type === 'memory' ? (
                            <MemoryCard 
                                item={item} 
                                onClick={() => handleMemoryClick(item.id)}
                                x={x} y={y} row={r} col={c}
                                cellSize={cellSize} containerSize={containerSize}
                                visualYOffset={VISUAL_Y_OFFSET}
                            />
                        ) : item && item.type === 'life-charm' ? (
                            <LifeCharmCard 
                                item={item} 
                                onClick={() => handleLifeCharmClick(item.charmId)}
                                x={x} y={y} row={r} col={c}
                                cellSize={cellSize} containerSize={containerSize}
                                visualYOffset={VISUAL_Y_OFFSET}
                            />
                        ) : item && item.type === 'habit-charm' ? (
                            <HabitCharmCard 
                                item={item} 
                                onClick={() => handleHabitCharmClick(item.charmId)}
                                x={x} y={y} row={r} col={c}
                                cellSize={cellSize} containerSize={containerSize}
                                visualYOffset={VISUAL_Y_OFFSET}
                            />
                        ) : (
                            <EmptyCard 
                                onClick={handleAddMemory} 
                                x={x} y={y} row={r} col={c}
                                cellSize={cellSize} containerSize={containerSize}
                                visualYOffset={VISUAL_Y_OFFSET}
                                />
                        )}
                    </div>
                 )})}
             </motion.div>

      ) : (
        /* List View */
        <div className="flex-1 min-h-0 w-full relative overflow-y-auto overflow-x-hidden pt-4 px-4 pb-24 no-scrollbar">
            <div className="columns-2 md:columns-3 lg:columns-4 gap-4 w-full max-w-7xl mx-auto">
                {/* Render Life Charms First in List View */}
                {lifeCharms.map((lc: any) => {
                    const items = lc.lifeLists?.[0]?.items || [];
                    const total = items.length;
                    const lived = items.filter((i: any) => i.status === 'lived').length;

                    return (
                        <ListLifeCharmCard
                            key={lc.id}
                            item={{ 
                                type: 'life-charm', 
                                id: `lc-${lc.id}`, 
                                title: lc.name, 
                                charmId: lc.id, 
                                status: lc.state,
                                stats: { total, lived }
                            }}
                            onClick={() => handleLifeCharmClick(lc.id)}
                        />
                    );
                })}

                {/* Render Habit Charms in List View */}
                {habitCharms.map((hc: any) => {
                    const activeHabit = hc.habits?.find((h: any) => h.isActive);
                    
                    return (
                        <ListHabitCard
                            key={hc.id}
                            item={{ 
                                type: 'habit-charm', 
                                id: `hc-${hc.id}`, 
                                title: activeHabit?.title || hc.name, 
                                charmId: hc.id, 
                                status: hc.state,
                                focusArea: activeHabit?.focusArea,
                                stats: { 
                                    streak: activeHabit?.currentStreak || 0, 
                                    target: activeHabit?.targetDays || 66 
                                }
                            }}
                            onClick={() => handleHabitCharmClick(hc.id)}
                        />
                    );
                })}

                {filteredMemories?.map((memory) => {
                     const dateObj = new Date(memory.date);
                     const dateStr = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
                     
                     let mediaUrl = 'https://images.unsplash.com/photo-1533174072545-e8d4aa97edf9?auto=format&fit=crop&w=800&q=80';
                     let mediaType: 'image' | 'video' | 'audio' = 'image';
             
                     if (memory.media && memory.media.length > 0) {
                         const firstMedia = memory.media[0];
                         if (firstMedia.type.startsWith('video')) {
                                 const videoAsImage = firstMedia.url.replace(/\.[^/.]+$/, ".jpg");
                                 mediaUrl = getOptimizedUrl(videoAsImage, 'image', 400);
                                 mediaType = 'video';
                         } else if (firstMedia.type.startsWith('audio')) {
                                 mediaUrl = firstMedia.url;
                                 mediaType = 'audio';
                         } else {
                                 mediaUrl = getOptimizedUrl(firstMedia.url, 'image', 400);
                                 mediaType = 'image';
                         }
                     }

                     const item: GridItemType = {
                         type: 'memory',
                         id: memory.id,
                         title: memory.title,
                         date: dateStr,
                         mediaUrl,
                         mediaType,
                     };

                     return (
                         <ListMemoryCard 
                            key={memory.id} 
                            item={item} 
                            onClick={() => handleMemoryClick(memory.id)}
                         />
                     );
                })}
                
                 <div 
                    onClick={handleAddMemory}
                    className="w-full mb-4 break-inside-avoid relative rounded-2xl overflow-hidden cursor-pointer bg-[#FDF2EC] border-2 border-dashed border-[#5B2D7D]/20 flex flex-col items-center justify-center p-8 aspect-4/5"
                >
                     <div className="w-12 h-12 rounded-full bg-[#5B2D7D]/10 flex items-center justify-center mb-2">
                        <Plus className="w-6 h-6 text-[#5B2D7D]" />
                     </div>
                     <span className="text-[#5B2D7D] font-medium font-[Outfit] text-sm">Add New</span>
                </div>
            </div>
        </div>
      )}
      </div>

       {/* Bottom Controls */}
       <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between pointer-events-none z-20">
             {!forcedViewMode && (
                 <div className="flex items-center gap-2 pointer-events-auto bg-[#FDF2EC]/80 backdrop-blur-md p-1.5 rounded-full shadow-lg border border-[#EADDDE]">
                     <button 
                        onClick={() => setViewMode('grid')}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${viewMode === 'grid' ? 'bg-[#5B2D7D] text-white' : 'text-[#5B2D7D] hover:bg-[#5B2D7D]/10'}`}
                     >
                        <LayoutGrid className="w-6 h-6" />
                     </button>
                     <button 
                        onClick={() => setViewMode('list')}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-[#5B2D7D] text-white' : 'text-[#5B2D7D] hover:bg-[#5B2D7D]/10'}`}
                     >
                        <List className="w-6 h-6" />
                     </button>
                 </div>
             )}
             
             <div className={forcedViewMode ? "ml-auto pointer-events-auto" : ""}>
                 <button 
                    onClick={handleAddMemory}
                    className="w-14 h-14 rounded-full bg-[#A4C538] flex items-center justify-center shadow-lg hover:bg-[#95b330] transition-colors pointer-events-auto"
                >
                     <Plus className="w-7 h-7 text-[#5B2D7D]" />
                 </button>
             </div>
        </div>
      
      {/* Memory Drawer as an overlay on Home */}
      <MemoryDrawer
        memory={selectedMemory}
        open={!!selectedMemory}
        onOpenChange={(open) => !open && setSelectedMemory(null)}
        isGuest={isGuest}
        guestToken={guestToken}
        people={people}
      />

      {/* Life Charm Drawer */}
      <LifeCharmDrawer
        lifeCharm={selectedLifeCharm}
        open={!!selectedLifeCharm}
        onOpenChange={(open) => !open && setSelectedLifeCharm(null)}
        people={people}
      />
    </div>
  );
}

"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { motion } from "motion/react";
import { getMemories } from "@/app/actions/memories";

// --- Icons ---

function PlusIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <line
        x1="12"
        y1="5"
        x2="12"
        y2="19"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        x1="5"
        y1="12"
        x2="19"
        y2="12"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SearchIcon() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-[#5B2D7D]">
            <circle cx="11.5" cy="11.5" r="9.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M18.5 18.5L22 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
    )
}

function GridIcon() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white">
            <rect x="3" y="3" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="14" y="3" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="3" y="14" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="14" y="14" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
    )
}

function ListIcon() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-[#5B2D7D]">
            <path d="M8 6H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M8 12H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M8 18H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M3 6H3.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M3 12H3.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M3 18H3.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
    )
}

// --- Data ---

type GridItemType = 
  | { type: 'memory', id: string, image: string, title: string, date: string }
  | { type: 'empty', id: string };

const INITIAL_GRID_DATA: GridItemType[] = [
    { type: 'empty', id: 'e1' }, { type: 'empty', id: 'e2' }, { type: 'empty', id: 'e3' },
    { type: 'empty', id: 'e4' }, { type: 'empty', id: 'e5' }, { type: 'empty', id: 'e6' },
    { type: 'empty', id: 'e7' }, { type: 'empty', id: 'e8' }, { type: 'empty', id: 'e9' },
];

// --- Components ---

function FilterBar() {
  const filters = ["Evening", "Party", "Road Trip", "Birthday", "Concert", "Dinner"];
  return (
    <div className="flex items-center gap-3 px-6 py-4 overflow-x-auto no-scrollbar z-10 relative">
      <div className="w-10 h-10 shrink-0 rounded-full bg-white flex items-center justify-center shadow-sm">
        <SearchIcon />
      </div>
      {filters.map((filter) => (
        <button
          key={filter}
          className="px-4 py-2 rounded-full bg-[#EADDDE] text-[#5B2D7D] font-medium text-sm whitespace-nowrap shadow-sm"
        >
          {filter}
        </button>
      ))}
    </div>
  );
}

function MemoryCard({ item, isActive }: { item: Extract<GridItemType, { type: 'memory' }>; isActive: boolean }) {
    return (
        <motion.div 
            className="w-full h-full relative p-4 flex flex-col justify-end shadow-lg rounded-[32px] overflow-hidden group origin-center"
            animate={{ 
                scale: isActive ? 1 : 0.85,
                opacity: isActive ? 1 : 0.5,
                filter: isActive ? 'blur(0px)' : 'blur(3px)'
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
        >
             {/* Background Image */}
             <div className="absolute inset-0">
                <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
             </div>

             {/* Content */}
             <motion.div 
                className="relative z-10 text-center mb-6"
                animate={{ opacity: isActive ? 1 : 0 }} 
                transition={{ duration: 0.3 }}
            >
                 <h3 className="text-white text-2xl font-bold font-[Outfit]">{item.title}</h3>
                 <p className="text-white/80 text-sm mt-1">{item.date}</p>
             </motion.div>
        </motion.div>
    )
}

function EmptyCard({ isActive, onClick }: { isActive: boolean; onClick: () => void }) {
    return (
        <motion.div 
            className={`w-full h-full rounded-[32px] flex flex-col items-center justify-center overflow-hidden
                 ${isActive ? 'bg-[#EAE8C3]/90 backdrop-blur-sm shadow-md' : 'bg-white/60 shadow-md'}
            `}
            animate={{ 
                scale: isActive ? 1 : 0.85,
                opacity: isActive ? 1 : 0.6, 
                filter: isActive ? 'blur(0px)' : 'blur(1px)'
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
        > 
             <motion.div 
                onClick={isActive ? onClick : undefined}
                className="flex flex-col items-center justify-center cursor-pointer"
                animate={{ 
                    opacity: isActive ? 1 : 0.5,
                    scale: isActive ? 1 : 0.9 
                }}
                transition={{ duration: 0.4 }}
             >
                 <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 shadow-sm ${isActive ? 'bg-[#A4C538]' : 'bg-[#EADDDE]'}`}>
                    <PlusIcon className="w-8 h-8 text-[#5B2D7D]" />
                 </div>
                 <span className="text-[#5B2D7D] font-medium font-[Outfit]">Add a Memory</span>
             </motion.div>
        </motion.div>
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
  user?: any;
}

export default function HomeContent({ initialMemories, user }: HomeContentProps) {
  // Use user from props if available, otherwise from context (though server should enforce it)
  // Actually, we should probably still rely on context for client-side updates if any, but for initial render use props.
  // But context.user might be null initially.
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const charmId = searchParams.get('charmId');

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [activeCellIndex, setActiveCellIndex] = useState(4); // Default to center, will update based on gridSize
  
  // Determine grid size based on initial memories
  const memoryCount = initialMemories ? initialMemories.length : 0;
  // Min 3x3, but expand if needed. e.g. 10 memories -> 4x4
  const gridSize = Math.max(3, Math.ceil(Math.sqrt(memoryCount)));

  // Initialize grid with passed memories
  const [gridData, setGridData] = useState<GridItemType[]>(() => {
    const totalCells = gridSize * gridSize;
    const initialGrid: GridItemType[] = Array(totalCells).fill(null).map((_, i) => ({ type: 'empty', id: `e${i}` }));

    if (!initialMemories || initialMemories.length === 0) return initialGrid;
    
    const newGrid = [...initialGrid];
    
    // Priority fill order: Center first, then outward
    const FILL_ORDER = getCenterOutOrder(gridSize);
    
    // Limit memories to grid capacity
    const memoriesToMap = initialMemories.slice(0, totalCells);

    memoriesToMap.forEach((memory: any, index: number) => {
        const gridIndex = FILL_ORDER[index];
        if (gridIndex === undefined) return;

        const dateObj = new Date(memory.date);
        const dateStr = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        
        let imageUrl = 'https://images.unsplash.com/photo-1533174072545-e8d4aa97edf9?auto=format&fit=crop&w=800&q=80';
        if (memory.media && memory.media.length > 0) {
            const firstMedia = memory.media[0];
            if (firstMedia.type === 'video') {
                    imageUrl = firstMedia.url.replace(/\.[^/.]+$/, ".jpg");
            } else {
                    imageUrl = firstMedia.url;
            }
        }

        newGrid[gridIndex] = {
            type: 'memory',
            id: memory.id,
            title: memory.title,
            date: dateStr,
            image: imageUrl 
        };
    });
    return newGrid;
  });

  // Remove the useEffect that fetches memories on mount
  // But we might want to refetch if charmId changes heavily?
  // The server component will handle the initial fetch based on searchParams.
  // So if charmId changes in URL, the server component re-renders (if using standard nav), or client?
  // If navigating via router.push with search params, it's a soft nav.
  // But page.tsx is a server component, so searchParams prop usage makes it dynamic.
  // Next.js might re-run the server component on search param change.
  
  // We still might want a client-side fetch effect that ONLY runs if initialMemories didn't account for current charmId?
  // Or just rely on the server component to provide data.
  // Let's rely on server passing fresh data.
  // However, we need to update state when initialMemories prop changes.
  
  useEffect(() => {
    if (initialMemories) {
        const currentGridSize = Math.max(3, Math.ceil(Math.sqrt(initialMemories.length)));
        const totalCells = currentGridSize * currentGridSize;
        const initialGrid: GridItemType[] = Array(totalCells).fill(null).map((_, i) => ({ type: 'empty', id: `e${i}` }));
        
        const newGrid = [...initialGrid];
        const memoriesToMap = initialMemories.slice(0, totalCells);
        
        const FILL_ORDER = getCenterOutOrder(currentGridSize);

        memoriesToMap.forEach((memory: any, index: number) => {
            const gridIndex = FILL_ORDER[index];
            if (gridIndex === undefined) return;

            const dateObj = new Date(memory.date);
            const dateStr = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
            
            let imageUrl = 'https://images.unsplash.com/photo-1533174072545-e8d4aa97edf9?auto=format&fit=crop&w=800&q=80';
            if (memory.media && memory.media.length > 0) {
                const firstMedia = memory.media[0];
                if (firstMedia.type === 'video') {
                     imageUrl = firstMedia.url.replace(/\.[^/.]+$/, ".jpg");
                } else {
                     imageUrl = firstMedia.url;
                }
            }

            newGrid[gridIndex] = {
                type: 'memory',
                id: memory.id,
                title: memory.title,
                date: dateStr,
                image: imageUrl
            };
        });
        setGridData(newGrid);
    }
  }, [initialMemories]);


  // Initial Center Scroll & Observer
  useEffect(() => {
      if (scrollContainerRef.current) {
          const centerIndex = getCenterOutOrder(gridSize)[0];
          // Update active cell index to center initially
          setActiveCellIndex(centerIndex);
          
          const centerEl = itemsRef.current[centerIndex];
          if (centerEl) {
               setTimeout(() => {
                   centerEl.scrollIntoView({ behavior: "instant", block: "center", inline: "center" });
               }, 100);
          }
      }

      const container = scrollContainerRef.current;
      if (!container) return;

      const observer = new IntersectionObserver(
          (entries) => {
              entries.forEach((entry) => {
                  if (entry.isIntersecting) {
                      const index = itemsRef.current.findIndex(el => el === entry.target);
                      if (index !== -1) {
                          setActiveCellIndex(index);
                      }
                  }
              });
          },
          {
              root: container,
              threshold: 0.6
          }
      );

      itemsRef.current.forEach(el => {
          if (el) observer.observe(el);
      });

      return () => observer.disconnect();
  }, [gridData]);

  const handleAddMemory = () => {
    router.push("/upload-memory");
  };

  return (
    <div className="flex flex-col h-full bg-[#FDF2EC] relative">
      <div className="shrink-0 pt-2 pb-2">
          <FilterBar />
      </div>

      <div className="flex-1 min-h-0 relative flex flex-col justify-end">
            <div 
                ref={scrollContainerRef}
                className="w-full overflow-auto snap-both snap-mandatory no-scrollbar touch-pan-x touch-pan-y pb-24"
                style={{ scrollBehavior: 'smooth' }}
            >
                <div 
                    className="grid gap-2 w-max px-[12.5vw]"
                    style={{ 
                        gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                        gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`
                    }}
                >
                    {gridData.map((item, index) => (
                        <div 
                            key={index}
                            ref={el => { itemsRef.current[index] = el }}
                            className="snap-center w-[75vw] h-[60vh]"
                        >
                            {/* We handle undefined gracefully, but array is pre-filled */}
                            {item && item.type === 'memory' ? (
                                <MemoryCard item={item} isActive={activeCellIndex === index} />
                            ) : (
                                <EmptyCard 
                                    isActive={activeCellIndex === index} 
                                    onClick={handleAddMemory} 
                                    />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between pointer-events-none z-20">
                 <div className="flex items-center gap-2 pointer-events-auto bg-[#FDF2EC]/80 backdrop-blur-md p-1.5 rounded-full shadow-lg border border-[#EADDDE]">
                     <button className="w-10 h-10 rounded-full bg-[#5B2D7D] flex items-center justify-center text-white">
                        <GridIcon />
                     </button>
                     <button className="w-10 h-10 rounded-full flex items-center justify-center text-[#5B2D7D]">
                        <ListIcon />
                     </button>
                 </div>

                 <button 
                    onClick={handleAddMemory}
                    className="w-14 h-14 rounded-full bg-[#A4C538] flex items-center justify-center shadow-lg hover:bg-[#95b330] transition-colors pointer-events-auto"
                 >
                    <PlusIcon className="w-7 h-7 text-[#5B2D7D]" />
                 </button>
            </div>
      </div>
    </div>
  );
}

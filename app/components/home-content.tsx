"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { motion } from "motion/react";
import { MemoryDrawer } from "@/components/memory-drawer";

import { Plus, Search, LayoutGrid, List } from "lucide-react";

// --- Data ---

type GridItemType = 
  | { type: 'memory', id: string, image: string, title: string, date: string }
  | { type: 'empty', id: string };

// --- Components ---

function FilterBar() {
  const filters = ["Evening", "Party", "Road Trip", "Birthday", "Concert", "Dinner"];
  return (
    <div className="flex items-center gap-3 px-6 py-4 overflow-x-auto no-scrollbar z-10 relative">
      <div className="w-10 h-10 shrink-0 rounded-full bg-white flex items-center justify-center shadow-sm">
        <Search className="w-5 h-5 text-[#5B2D7D]" />
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

function MemoryCard({ item, isActive, onClick }: { item: Extract<GridItemType, { type: 'memory' }>; isActive: boolean; onClick: () => void }) {
    return (
        <motion.div 
            onClick={onClick}
            className="w-full h-full relative p-4 flex flex-col justify-end shadow-lg rounded-[32px] overflow-hidden group origin-center cursor-pointer"
            animate={{ 
                scale: isActive ? 1 : 0.85,
                opacity: isActive ? 1 : 0.5,
                filter: isActive ? 'blur(0px)' : 'blur(3px)'
            }}
            whileTap={{ scale: 0.98 }}
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
            className={`w-full h-full rounded-[32px] flex flex-col items-center justify-center overflow-hidden cursor-pointer
                 ${isActive ? 'bg-[#EAE8C3]/90 backdrop-blur-sm shadow-md' : 'bg-white/60 shadow-md'}
            `}
            animate={{ 
                scale: isActive ? 1 : 0.85,
                opacity: isActive ? 1 : 0.6, 
                filter: isActive ? 'blur(0px)' : 'blur(1px)'
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            onClick={onClick}
        > 
             <motion.div 
                className="flex flex-col items-center justify-center"
                animate={{ 
                    opacity: isActive ? 1 : 0.5,
                    scale: isActive ? 1 : 0.9 
                }}
                transition={{ duration: 0.4 }}
             >
                 <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 shadow-sm ${isActive ? 'bg-[#A4C538]' : 'bg-[#EADDDE]'}`}>
                    <Plus className="w-8 h-8 text-[#5B2D7D]" />
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const charmId = searchParams.get('charmId');

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [activeCellIndex, setActiveCellIndex] = useState(4);
  const [selectedMemory, setSelectedMemory] = useState<any>(null);
  
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
    
    const FILL_ORDER = getCenterOutOrder(gridSize);
    
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
          { root: container, threshold: 0.6 }
      );

      itemsRef.current.forEach(el => {
          if (el) observer.observe(el);
      });

      return () => observer.disconnect();
  }, [gridData, gridSize]);

  const handleAddMemory = () => {
    router.push("/upload-memory");
  };

  const handleMemoryClick = (id: string) => {
      const memory = initialMemories?.find(m => m.id === id);
      if (memory) {
          setSelectedMemory(memory);
      }
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
                            {item && item.type === 'memory' ? (
                                <MemoryCard 
                                    item={item} 
                                    isActive={activeCellIndex === index} 
                                    onClick={() => handleMemoryClick(item.id)}
                                />
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
                        <LayoutGrid className="w-6 h-6" />
                     </button>
                     <button className="w-10 h-10 rounded-full flex items-center justify-center text-[#5B2D7D]">
                        <List className="w-6 h-6" />
                     </button>
                 </div>

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
      />
    </div>
  );
}

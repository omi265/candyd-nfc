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
      <div className="w-10 h-10 flex-shrink-0 rounded-full bg-white flex items-center justify-center shadow-sm">
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
            className={`w-full h-full rounded-[32px] flex flex-col items-center justify-center rounded-3xl overflow-hidden
                 ${isActive ? 'bg-[#EAE8C3]/90 backdrop-blur-sm shadow-sm' : 'bg-transparent'}
            `}
            animate={{ 
                scale: isActive ? 1 : 0.85,
                opacity: isActive ? 1 : 0.5, 
                filter: isActive ? 'blur(0px)' : 'blur(2px)'
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
        > 
             <motion.div 
                onClick={isActive ? onClick : undefined}
                className="flex flex-col items-center justify-center cursor-pointer"
                animate={{ 
                    opacity: isActive ? 1 : 0,
                    scale: isActive ? 1 : 0.9 
                }}
                transition={{ duration: 0.4 }}
             >
                 <div className="w-16 h-16 rounded-full bg-[#A4C538] flex items-center justify-center mb-3 shadow-lg">
                    <PlusIcon className="w-8 h-8 text-[#5B2D7D]" />
                 </div>
                 <span className="text-[#5B2D7D] font-medium font-[Outfit]">Add a Memory</span>
             </motion.div>
        </motion.div>
    )
}


export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const charmId = searchParams.get('charmId');

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [activeCellIndex, setActiveCellIndex] = useState(4);
  const [gridData, setGridData] = useState<GridItemType[]>(INITIAL_GRID_DATA);
  const [isMemoryLoading, setIsMemoryLoading] = useState(true);

  // Auth Redirect
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  // Fetch Memories
  useEffect(() => {
     async function loadMemories() {
         if (user) {
             try {
                setIsMemoryLoading(true);
                const fetchedMemories = await getMemories(charmId || undefined);
                
                // Map memories to grid data. Strategy: Fill empty slots.
                const newGrid = [...INITIAL_GRID_DATA];
                const memoriesToMap = fetchedMemories.slice(0, 9); // Limit to 9 for this layout

                memoriesToMap.forEach((memory: any, index: number) => {
                    const dateObj = new Date(memory.date);
                    const dateStr = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
                    
                    // Simple logic: Fill linearly for now, OR try to scatter them conceptually?
                    // Let's just fill linearly 
                    newGrid[index] = {
                        type: 'memory',
                        id: memory.id,
                        title: memory.title,
                        date: dateStr,
                        // Fallback image since we skipped upload
                        image: 'https://images.unsplash.com/photo-1533174072545-e8d4aa97edf9?auto=format&fit=crop&w=800&q=80' 
                    };
                });
                
                setGridData(newGrid);
             } catch (e) {
                 console.error("Failed to load memories", e);
             } finally {
                 setIsMemoryLoading(false);
             }
         }
     }
     loadMemories();
  }, [user, charmId]);

  // Initial Center Scroll & Observer
  useEffect(() => {
      // Must wait for content potentially... basically same logic
      if (scrollContainerRef.current) {
          const centerEl = itemsRef.current[4];
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

      // Re-observe if gridData changes (rendering might change refs)
      // Actually ref callback handles it, but we might need to prompt disconnect/reconnect if DOM nodes change extensively.
      // Since map key is index and we mutate array content but not length commonly (9), it should be fine.
      // But safer to separate this effect if needed. For now:
      itemsRef.current.forEach(el => {
          if (el) observer.observe(el);
      });

      return () => observer.disconnect();
  }, [gridData]); // Re-run when data loads to ensure we observe new elements if any keys changed

  const handleAddMemory = () => {
    router.push("/upload-memory");
  };

  if (isLoading || isMemoryLoading && user) return <div className="flex min-h-screen items-center justify-center bg-[#FDF2EC] text-[#5B2D7D]">Loading...</div>;
  if (!user) return null;

  return (
    <div className="flex flex-col h-full bg-[#FDF2EC] relative">
      <div className="flex-shrink-0 pt-2 pb-2">
          <FilterBar />
      </div>

      <div className="flex-1 min-h-0 relative flex flex-col justify-end">
            <div 
                ref={scrollContainerRef}
                className="w-full overflow-auto snap-both snap-mandatory no-scrollbar touch-pan-x touch-pan-y pb-24"
                style={{ scrollBehavior: 'smooth' }}
            >
                {/* 
                   Padding Logic to center the 5th element (center of 3x3) initially and allow scrolling.
                   Grid is 3x3. 
                   We want the user to be able to scroll to all edges.
                   The container aligns to the bottom of the screen (flex-end).
                */}
                <div className="
                    grid grid-cols-3 grid-rows-3 gap-2
                    w-max px-[12.5vw]
                ">
                    {gridData.map((item, index) => (
                        <div 
                            key={index}
                            ref={el => { itemsRef.current[index] = el }}
                            className="snap-center w-[75vw] h-[60vh]"
                        >
                            {item.type === 'memory' ? (
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


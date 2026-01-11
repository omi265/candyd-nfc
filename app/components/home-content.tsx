"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useMemo } from "react";
import { motion, useMotionValue, animate, useTransform, MotionValue, AnimatePresence } from "motion/react";
import { MemoryDrawer } from "@/components/memory-drawer";
import { getOptimizedUrl } from "@/lib/media-helper";

import { Plus, Search, LayoutGrid, List, Mic, X } from "lucide-react";

// --- Data ---

type GridItemType =
  | { type: 'memory', id: string, mediaUrl: string, mediaType: 'image' | 'video' | 'audio', title: string, date: string }
  | { type: 'empty', id: string };

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

    // Map distance to visual properties - Removed scaling for tighter grid
    const opacity = useTransform(dist, [0, 400], [1, 0.7]);
    const titleOpacity = useTransform(dist, [0, 200], [1, 0.8]);

    return (
        <motion.div
            onClick={onClick}
            className="w-full h-full relative p-4 flex flex-col justify-end shadow-lg rounded-none overflow-hidden group origin-center cursor-pointer"
            style={{
                opacity,
                willChange: "transform, opacity",
                touchAction: "none",
                transform: "translate3d(0,0,0)",
                backfaceVisibility: "hidden"
            }}
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

                {/* Gradient Overlay */}
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

    const opacity = useTransform(dist, [0, 400], [1, 0.6]);
    const contentOpacity = useTransform(dist, [0, 200], [1, 0.8]);

    return (
        <motion.div
            className={`w-full h-full rounded-none flex flex-col items-center justify-center overflow-hidden cursor-pointer bg-white/60 shadow-md`}
            style={{
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
  people?: any[];
  user?: any;
  forcedViewMode?: 'grid' | 'list';
}

export default function HomeContent({ initialMemories, people = [], user, forcedViewMode }: HomeContentProps) {
  const router = useRouter();

  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedMemory, setSelectedMemory] = useState<any>(null);
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

  // Initialize Grid Data
  const [gridData, setGridData] = useState<GridItemType[]>([]);

  useEffect(() => {
        const totalItems = filteredMemories.length;
        const currentGridSize = Math.max(3, Math.ceil(Math.sqrt(totalItems)));
        const totalCells = currentGridSize * currentGridSize;
        const initialGrid: GridItemType[] = Array(totalCells).fill(null).map((_, i) => ({ type: 'empty', id: `e${i}` }));

        const newGrid = [...initialGrid];
        const itemsToMap = filteredMemories.slice(0, totalCells);
        const FILL_ORDER = getCenterOutOrder(currentGridSize);

        itemsToMap.forEach((memory: any, index: number) => {
            const gridIndex = FILL_ORDER[index];
            if (gridIndex === undefined) return;

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
        });
        setGridData(newGrid);
  }, [filteredMemories]);


  // Measure cell size on mount/resize
  useEffect(() => {
    const updateSize = () => {
        if (containerRef.current) {
            const containerW = containerRef.current.offsetWidth;
            const containerH = containerRef.current.offsetHeight;
            // Adjusted multipliers to show side cards more clearly
            const w = Math.min(containerW * 0.85, 400);
            const h = Math.min(containerH * 0.80, 650);

            setCellSize({ width: w, height: h });
            setContainerSize({ width: containerW, height: containerH });
        } else {
             setCellSize({
                width: Math.min(window.innerWidth * 0.85, 400),
                height: Math.min(window.innerHeight * 0.80, 650)
            });
        }
    };
    setTimeout(updateSize, 0);
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const VISUAL_Y_OFFSET = 60;
  const currentGridSize = Math.max(3, Math.ceil(Math.sqrt(filteredMemories.length)));

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
      router.push("/upload-memory");
  };

  const handleMemoryClick = (id: string) => {
      const memory = initialMemories?.find(m => m.id === id);
      if (memory) {
          setSelectedMemory(memory);
      }
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

                    let clampedIndex = Math.max(0, Math.min(currentGridSize - 1, targetIndex));
                    
                    // --- Snap to Valid Item Logic ---
                    // Convert row/col back to 1D index to check gridData
                    // But here we are dragging rows/cols independently? 
                    // No, the grid is "repeat(currentGridSize)". We are moving the whole grid X or Y.
                    // Actually, the grid layout `grid-template-columns` is `repeat(N, size)`.
                    // The drag moves `x` and `y`.
                    // We are snapping `x` to a column, and `y` to a row.
                    
                    // We need to ensure that the (targetRow, targetCol) cell is not empty.
                    // But we are only animating ONE axis at a time based on drag direction? 
                    // No, `dragDirectionLock` is false in the code (wait, it is true? "dragDirectionLock").
                    // Actually it says `dragDirectionLock`. So user drags mostly X or mostly Y.
                    // But the code updates `x` OR `y` in onDragEnd based on `isX`.
                    // This means we are locking the OTHER axis to its current state? 
                    // The other axis's motion value (`x` or `y`) retains its previous value.
                    
                    // Let's get the PROPOSED (Row, Col).
                    // We need the current "snapped" value of the OTHER axis to know the full coordinate.
                    // `x` corresponds to `col`. `y` corresponds to `row`.
                    
                    // Calculate current Row/Col from current X/Y values
                    const getCurrentCol = (currentX: number) => {
                         const startX = (containerSize.width - cellSize.width) / 2;
                         return Math.round((startX - currentX) / cellSize.width);
                    };
                    const getCurrentRow = (currentY: number) => {
                         const startY = (containerSize.height - cellSize.height) / 2 - VISUAL_Y_OFFSET;
                         return Math.round((startY - currentY) / cellSize.height);
                    };

                    let targetCol = isX ? clampedIndex : getCurrentCol(x.get());
                    let targetRow = !isX ? clampedIndex : getCurrentRow(y.get());
                    
                    // Clamp both
                    targetCol = Math.max(0, Math.min(currentGridSize - 1, targetCol));
                    targetRow = Math.max(0, Math.min(currentGridSize - 1, targetRow));

                    // Check if (targetRow, targetCol) is empty
                    // Grid is 1D array mapped to 2D: index = row * size + col
                    const checkIndex = targetRow * currentGridSize + targetCol;
                    const targetItem = gridData[checkIndex];

                    if (!targetItem || targetItem.type === 'empty') {
                        // Find nearest valid item
                        let nearestDist = Infinity;
                        let bestRow = targetRow;
                        let bestCol = targetCol;

                        // Search all cells
                        for (let r = 0; r < currentGridSize; r++) {
                            for (let c = 0; c < currentGridSize; c++) {
                                const idx = r * currentGridSize + c;
                                const item = gridData[idx];
                                if (item && item.type !== 'empty') {
                                    // Calculate distance in "grid steps"
                                    const d = Math.abs(r - targetRow) + Math.abs(c - targetCol); // Manhattan dist
                                    // Prefer moves along the drag axis if possible
                                    const axisBias = isX ? (r === targetRow ? -0.5 : 0) : (c === targetCol ? -0.5 : 0); 
                                    
                                    if (d + axisBias < nearestDist) {
                                        nearestDist = d + axisBias;
                                        bestRow = r;
                                        bestCol = c;
                                    }
                                }
                            }
                        }
                        
                        targetRow = bestRow;
                        targetCol = bestCol;
                    }

                    // Animate X and Y to the validated target
                    const targetXPos = (containerSize.width - cellSize.width) / 2 - targetCol * cellSize.width;
                    const targetYPos = (containerSize.height - cellSize.height) / 2 - VISUAL_Y_OFFSET - targetRow * cellSize.height;

                    animate(x, targetXPos, { type: "spring", stiffness: 300, damping: 30 });
                    animate(y, targetYPos, { type: "spring", stiffness: 300, damping: 30 });
                }}
              >
                 {gridData.map((item, index) => {
                     const r = Math.floor(index / currentGridSize);
                     const c = index % currentGridSize;

                     return (
                    <div
                        key={item?.id || `empty-${index}`}
                        className="flex items-center justify-center p-1"
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

      {/* Memory Drawer */}
      <MemoryDrawer
        memory={selectedMemory}
        open={!!selectedMemory}
        onOpenChange={(open) => !open && setSelectedMemory(null)}
        people={people}
      />
    </div>
  );
}

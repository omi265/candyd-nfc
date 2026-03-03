"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useMotionValue, animate, useTransform, MotionValue } from "motion/react";
import {
  Plus,
  Check,
  GraduationCap,
  Calendar,
  Users,
  ChevronUp,
  Image as ImageIcon,
  Search,
  X,
  Heart
} from "lucide-react";
import { LifeList, LifeListItem, Product, Person, Experience, ExperienceMedia, Memory, Media } from "@prisma/client";
import { getOptimizedUrl } from "@/lib/media-helper";
import { MemoryDrawer } from "@/components/memory-drawer";
import { toast } from "sonner";
import Image from "next/image";

type LifeListItemWithExperience = LifeListItem & {
  experience: (Experience & { media: ExperienceMedia[] }) | null;
};

type LifeListWithItems = LifeList & {
  items: LifeListItemWithExperience[];
};

type MemoryWithMedia = Memory & {
    media: Media[];
};

type ProductWithState = Product & {
  state: string;
};

// Unified type for Grid Display
type GridItem = {
    id: string;
    type: 'life_item' | 'memory';
    title: string;
    description?: string | null;
    date: Date;
    media: { url: string; type: string }[];
    peopleIds: string[];
    isLiked: boolean;
    originalData: LifeListItemWithExperience | MemoryWithMedia;
};

interface LifeCharmContentProps {
  lifeList: LifeListWithItems;
  product: ProductWithState;
  people: Person[];
  memories: MemoryWithMedia[];
}

// --- Search / Filter Bar ---

interface FilterBarProps {
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    isSearchOpen: boolean;
    setIsSearchOpen: (open: boolean) => void;
}

function FilterBar({ searchQuery, setSearchQuery, isSearchOpen, setIsSearchOpen }: FilterBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      if (isSearchOpen && inputRef.current) {
          inputRef.current.focus();
      }
  }, [isSearchOpen]);

  return (
    <div className="flex items-center gap-3 px-5 py-3 z-30 relative">
      <div className={`shrink-0 rounded-full bg-white shadow-sm border border-[#EADDDE] flex items-center transition-all duration-300 overflow-hidden h-10 ${isSearchOpen ? 'w-full px-4' : 'w-10 justify-center'}`}>
         {isSearchOpen ? (
             <>
                <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search memories and items..."
                    className="w-full h-full bg-transparent outline-none text-[#5B2D7D] text-sm placeholder-[#5B2D7D]/40 min-w-0"
                    onBlur={() => !searchQuery && setIsSearchOpen(false)}
                />
                {searchQuery ? (
                     <button onClick={() => setSearchQuery("")} className="ml-2">
                        <X className="w-4 h-4 text-[#5B2D7D]/60" />
                     </button>
                ) : (
                    <button onClick={() => setIsSearchOpen(false)} className="ml-2">
                        <X className="w-4 h-4 text-[#5B2D7D]/60" />
                    </button>
                )}
             </>
         ) : (
            <button onClick={() => setIsSearchOpen(true)} className="w-full h-full flex items-center justify-center">
                <Search className="w-5 h-5 text-[#5B2D7D]" />
            </button>
         )}
      </div>
    </div>
  );
}

// --- Helper for Distance Calculation ---
function useDistance(
  x: MotionValue<number>,
  y: MotionValue<number>,
  row: number,
  col: number,
  cellSize: { width: number; height: number },
  containerSize: { width: number; height: number },
  visualYOffset: number
) {
  return useTransform([x, y], (values: number[]) => {
    const [latestX, latestY] = values;
    if (cellSize.width === 0 || containerSize.width === 0) return 1000;

    const targetX = (containerSize.width - cellSize.width) / 2 - col * cellSize.width;
    const targetY = (containerSize.height - cellSize.height) / 2 - visualYOffset - row * cellSize.height;

    const distX = Math.abs(latestX - targetX);
    const distY = Math.abs(latestY - targetY);

    return Math.sqrt(distX * distX + distY * distY);
  });
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

  cells.sort((a, b) => a.dist - b.dist);
  return cells.map((cell) => cell.index);
}

// --- Life Item / Memory Card ---
function GridCard({
  item,
  people,
  onClick,
  x,
  y,
  row,
  col,
  cellSize,
  containerSize,
  visualYOffset,
}: {
  item: GridItem;
  people: Person[];
  onClick: () => void;
  x: MotionValue<number>;
  y: MotionValue<number>;
  row: number;
  col: number;
  cellSize: { width: number; height: number };
  containerSize: { width: number; height: number };
  visualYOffset: number;
}) {
  const dist = useDistance(x, y, row, col, cellSize, containerSize, visualYOffset);

  const opacity = useTransform(dist, [0, 400], [1, 0.5]);
  const contentOpacity = useTransform(dist, [0, 200], [1, 0.8]);

  const hasMedia = item.media && item.media.length > 0;
  const firstMedia = hasMedia ? item.media[0] : null;

  // Get people names
  const peopleNames = item.peopleIds
    .map((id) => people.find((p) => p.id === id)?.name)
    .filter(Boolean)
    .slice(0, 2);

  // Background colors
  // Life Items (Lived) get Green-ish gradient
  // Memories get Purple-ish gradient
  const bgGradient = item.type === 'life_item'
    ? "from-[#A4C538] to-[#7A9B1E]"
    : "from-[#5B2D7D] to-[#3A1D52]";

  return (
    <motion.div
      onClick={onClick}
      className={`w-full h-full relative flex flex-col justify-between shadow-xl rounded-none overflow-hidden cursor-pointer`}
      style={{
        opacity,
        willChange: "transform, opacity",
        touchAction: "none",
        transform: "translate3d(0,0,0)",
        backfaceVisibility: "hidden",
      }}
    >
      {/* Background */}
      {hasMedia && (firstMedia?.type.includes("image") || firstMedia?.type.includes("video")) ? (
        <div className="absolute inset-0">
          <Image
            src={getOptimizedUrl(
                firstMedia.type.includes("video") 
                ? (firstMedia.url.includes('.') ? firstMedia.url.replace(/\.[^/.]+$/, ".jpg") : `${firstMedia.url}.jpg`) 
                : firstMedia.url, 
                "image", 
                600
            )}
            alt=""
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        </div>
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${bgGradient}`}>
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl transform translate-x-10 -translate-y-10" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-3xl transform -translate-x-10 translate-y-10" />
        </div>
      )}

      {/* Type Badge */}
      <div className="relative z-10 p-6 flex items-start justify-between">
        {item.type === 'life_item' ? (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-full">
            <Check className="w-4 h-4 text-white" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Lived
            </span>
          </div>
        ) : (
           <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
            <ImageIcon className="w-4 h-4 text-white" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Memory
            </span>
          </div>
        )}

        {/* Liked Indicator */}
        {item.isLiked && (
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                <Heart className="w-4 h-4 text-white fill-white" />
            </div>
        )}
      </div>

      {/* Content */}
      <motion.div
        className="relative z-10 p-6 pt-0"
        style={{ opacity: contentOpacity }}
      >
        {/* Title */}
        <h2 className="text-3xl font-black text-white leading-tight mb-3 uppercase tracking-tight line-clamp-2">
          {item.title}
        </h2>

        {/* Description */}
        {item.description && (
          <p className="text-white/70 text-sm line-clamp-2 mb-4">
            {item.description}
          </p>
        )}

        {/* Meta Tags */}
        <div className="flex flex-wrap gap-2">
          {peopleNames.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full">
              <Users className="w-3.5 h-3.5 text-white/70" />
              <span className="text-xs text-white/80 font-medium">
                {peopleNames.join(", ")}
                {item.peopleIds.length > 2 && ` +${item.peopleIds.length - 2}`}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full">
              <Calendar className="w-3.5 h-3.5 text-white/70" />
              <span className="text-xs text-white/80 font-medium">
                  {new Date(item.date).toLocaleDateString()}
              </span>
          </div>
        </div>
      </motion.div>

      {/* Swipe hint */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2"
        style={{ opacity: contentOpacity }}
      >
        <ChevronUp className="w-6 h-6 text-white/30 animate-bounce" />
      </motion.div>
    </motion.div>
  );
}

// --- Main Component ---
export default function LifeCharmContent({
  lifeList,
  product,
  people,
  memories
}: LifeCharmContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialView = searchParams.get('view') as 'grid' | 'list' | null;
  const focusId = searchParams.get('focusId');
  
  const containerRef = useRef<HTMLDivElement>(null);

  const [cellSize, setCellSize] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialView === 'list' ? 'list' : 'grid');
  const dragStartRef = useRef<{ col: number; row: number } | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDrawerData, setSelectedDrawerData] = useState<any>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Update view mode if URL changes
  useEffect(() => {
      if (initialView && (initialView === 'grid' || initialView === 'list')) {
          if (viewMode !== initialView) {
              setViewMode(initialView);
          }
      }
  }, [initialView, viewMode]);

  const handleEditItem = () => {
      if (!selectedDrawerData) return;
      
      if (selectedDrawerData.dataType === 'memory') {
          router.push(`/memory/${selectedDrawerData.id}`);
      } else {
          router.push(`/life-charm/experience/${selectedDrawerData.id}/edit?charmId=${product.id}`);
      }
      setDrawerOpen(false);
  };

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const isGraduated = product.state === "GRADUATED";

  // Stats
  const stats = useMemo(() => {
    const total = lifeList.items.length;
    const lived = lifeList.items.filter((i) => i.status === "lived").length;
    const pending = lifeList.items.filter((i) => i.status === "pending").length;
    return { total, lived, pending };
  }, [lifeList.items]);

  // --- PREPARE DATA ---

  // 1. Grid Items: Standalone Memories + Lived List Items
  const gridItems = useMemo<GridItem[]>(() => {
      const unifiedItems: GridItem[] = [];

      // Add Lived List Items
      lifeList.items.forEach(item => {
          if (item.status === 'lived' && item.experience) {
              const exp = item.experience as any; // Cast to access isLiked if not in type yet (it is on db type)
              unifiedItems.push({
                  id: item.id,
                  type: 'life_item',
                  title: item.title,
                  description: item.experience.reflection || item.description,
                  date: item.experience.date,
                  media: item.experience.media.map(m => ({ url: m.url, type: m.type })),
                  peopleIds: item.experience.peopleIds.length > 0 ? item.experience.peopleIds : item.peopleIds,
                  isLiked: exp.isLiked || false,
                  originalData: item
              });
          }
      });

      // Add Standalone Memories
      memories.forEach(memory => {
          const mem = memory as any;
          unifiedItems.push({
              id: memory.id,
              type: 'memory',
              title: memory.title,
              description: memory.description,
              date: memory.date,
              media: memory.media.map(m => ({ url: m.url, type: m.type })),
              peopleIds: memory.peopleIds,
              isLiked: mem.isLiked || false,
              originalData: memory
          });
      });

      // Filter by searchQuery
      let filtered = unifiedItems;
      if (searchQuery) {
          const q = searchQuery.toLowerCase();
          filtered = unifiedItems.filter(item => {
              const titleMatch = item.title.toLowerCase().includes(q);
              const descMatch = item.description?.toLowerCase().includes(q);
              
              // Keywords/Tags match (Emotions, Events, Mood)
              let tagMatch = false;
              if (item.type === 'memory') {
                  const mem = item.originalData as MemoryWithMedia;
                  const emotions = mem.emotions || [];
                  const events = mem.events || [];
                  
                  tagMatch = emotions.some((e: string) => e.toLowerCase().includes(q)) ||
                             events.some((e: string) => e.toLowerCase().includes(q)) ||
                             (mem.mood?.toLowerCase().includes(q) ?? false);
              } else {
                  // For life items, maybe search title as a tag too? 
                  // Life items don't have separate tags in the schema yet, but title is the primary tag
                  tagMatch = item.title.toLowerCase().includes(q);
              }

              return titleMatch || descMatch || tagMatch;
          });
      }

      // Sort by date descending (newest first)
      filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return filtered;
  }, [lifeList.items, memories, searchQuery]);


  // 2. List Items: All LifeList Items (Pending + Lived)
  const listItems = useMemo(() => {
      let items = [...lifeList.items];

      // Filter by searchQuery
      if (searchQuery) {
          const q = searchQuery.toLowerCase();
          items = items.filter(item => {
              const titleMatch = item.title.toLowerCase().includes(q);
              const descMatch = item.description?.toLowerCase().includes(q);
              return titleMatch || descMatch;
          });
      }

      // Sort: Pending first, then Lived? Or Lived first?
      // Usually bucket lists show what's left to do first, or completed at bottom.
      // Let's sort by Status (Pending top) then OrderIndex
      items.sort((a, b) => {
          if (a.status === "pending" && b.status === "lived") return -1;
          if (a.status === "lived" && b.status === "pending") return 1;
          return a.orderIndex - b.orderIndex;
      });
      return items;
  }, [lifeList.items, searchQuery]);


  // --- GRID LAYOUT LOGIC ---

  const currentGridSize = Math.max(3, Math.ceil(Math.sqrt(gridItems.length)));
  const totalCells = currentGridSize * currentGridSize;
  const FILL_ORDER = getCenterOutOrder(currentGridSize);

  const gridData = useMemo(() => {
    if (gridItems.length === 0 && searchQuery) return [];

    const grid: (GridItem | null)[] = Array(totalCells).fill(null);
    
    // Shuffle slightly or keep sorted?
    const shuffledItems = [...gridItems];
    
    shuffledItems.slice(0, totalCells).forEach((item, index) => {
      const gridIndex = FILL_ORDER[index];
      if (gridIndex !== undefined) {
        grid[gridIndex] = item;
      }
    });
    return grid;
  }, [gridItems, totalCells, FILL_ORDER, searchQuery]);

  // Measure cell size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const containerW = containerRef.current.offsetWidth;
        const containerH = containerRef.current.offsetHeight;
        const w = Math.min(containerW * 0.85, 400);
        const h = Math.min(containerH * 0.80, 650);
        setCellSize({ width: w, height: h });
        setContainerSize({ width: containerW, height: containerH });
      }
    };
    setTimeout(updateSize, 0);
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const VISUAL_Y_OFFSET = 40;
  
  // Set initial position
  useEffect(() => {
    if (cellSize.width === 0 || containerSize.width === 0) return;
    if (gridData.length === 0) return;

    let targetRow = 0;
    let targetCol = 0;
    let found = false;

    // If focusId is provided, try to find it in the grid
    if (focusId && viewMode === 'grid') {
        const index = gridData.findIndex(item => item?.id === focusId);
        if (index !== -1) {
            targetRow = Math.floor(index / currentGridSize);
            targetCol = index % currentGridSize;
            found = true;
        }
    }

    if (!found) {
        // Default: Center on the first item (which is in the middle due to center-out)
        const centerIndex = FILL_ORDER[0];
        if (centerIndex !== undefined && centerIndex < gridData.length) {
            targetRow = Math.floor(centerIndex / currentGridSize);
            targetCol = centerIndex % currentGridSize;
        }
    }

    const initialX = (containerSize.width - cellSize.width) / 2 - targetCol * cellSize.width;
    const initialY = (containerSize.height - cellSize.height) / 2 - VISUAL_Y_OFFSET - targetRow * cellSize.height;

    animate(x, initialX, { type: "spring", stiffness: 300, damping: 30, duration: 0 });
    animate(y, initialY, { type: "spring", stiffness: 300, damping: 30, duration: 0 });
  }, [cellSize, containerSize, currentGridSize, x, y, FILL_ORDER, focusId, gridData, viewMode]);

  // --- ACTIONS ---

  const handleFabClick = () => {
      if (viewMode === 'grid') {
          // Grid View -> Add Standalone Memory
          router.push(`/upload-memory?productId=${product.id}`);
      } else {
          // List View -> Add Bucket List Item
          if (stats.pending >= 5) {
              toast.error("You can only have 5 unlived experiences at a time. Mark one as lived to add more!");
              return;
          }
          router.push(`/life-charm/add?charmId=${product.id}`);
      }
  };

  const handleItemClick = (item: GridItem) => {
    const isMemory = item.type === 'memory';
    const raw = item.originalData as any;
    
    // For experiences (life_item), raw is LifeListItem which has experience property
    // For memories, raw is Memory
    
    const data = {
        dataType: item.type,
        id: item.type === 'life_item' ? (raw.experience?.id || item.id) : item.id, // ID should be experience ID for liking? Or Item ID? 
        // NOTE: MemoryDrawer expects memory object or similar.
        // For LifeItem, we should pass the Experience data + Item Title
        title: item.title,
        description: item.description,
        date: item.date,
        location: isMemory ? raw.location : raw.experience?.location,
        peopleIds: item.peopleIds,
        media: isMemory ? raw.media : raw.experience?.media,
        events: isMemory ? raw.events : [item.title],
        isLiked: item.isLiked // Pass isLiked
    };
    
    // Adjust ID for server actions: Memory Actions need memory.id, Experience Actions need experience.id
    // If it's a life_item, `raw` is the item. `raw.experience` is the experience.
    if (!isMemory && raw.experience) {
        data.id = raw.experience.id; // Use experience ID for liking logic in drawer
    }
    
    setSelectedDrawerData(data);
    setDrawerOpen(true);
  };

  const handleListItemClick = (item: LifeListItemWithExperience) => {
      if (item.status === 'lived') {
          const exp = item.experience as any;
          const data = {
            dataType: 'life_item',
            id: item.experience?.id, // Use Experience ID
            title: item.title,
            description: item.experience?.reflection || item.description,
            date: item.experience?.date,
            location: item.experience?.location,
            peopleIds: item.experience?.peopleIds || item.peopleIds,
            media: item.experience?.media || [],
            events: [item.title],
            isLiked: exp?.isLiked || false
          };
          setSelectedDrawerData(data);
          setDrawerOpen(true);
      } else {
          router.push(`/life-charm/item/${item.id}?charmId=${product.id}`);
      }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Filter / Search Bar */}
      <FilterBar 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isSearchOpen={isSearchOpen}
        setIsSearchOpen={setIsSearchOpen}
      />

      {/* Content */}
      <div className="flex-1 min-h-0 relative" ref={containerRef}>
        {viewMode === 'grid' ? (
            gridData.length > 0 ? (
        <motion.div
          className="grid gap-0 absolute top-0 left-0 touch-none origin-top-left"
          style={{
            gridTemplateColumns: `repeat(${currentGridSize}, ${cellSize.width ? cellSize.width + "px" : "80vw"})`,
            gridTemplateRows: `repeat(${currentGridSize}, ${cellSize.height ? cellSize.height + "px" : "65vh"})`,
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
            transform: "translate3d(0,0,0)",
          }}
          drag
          dragDirectionLock
          dragElastic={0.2}
          dragMomentum={false}
          onDragStart={() => {
            const offsetStartX = (containerSize.width - cellSize.width) / 2;
            const currentX = x.get();
            const startCol = Math.round((offsetStartX - currentX) / cellSize.width);

            const offsetStartY = (containerSize.height - cellSize.height) / 2 - VISUAL_Y_OFFSET;
            const currentY = y.get();
            const startRow = Math.round((offsetStartY - currentY) / cellSize.height);

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

            // --- Snap to Valid Item Logic ---
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
            const checkIndex = targetRow * currentGridSize + targetCol;
            const targetItem = gridData[checkIndex];

            if (!targetItem) {
                // Find nearest valid item
                let nearestDist = Infinity;
                let bestRow = targetRow;
                let bestCol = targetCol;

                // Search all cells
                for (let r = 0; r < currentGridSize; r++) {
                    for (let c = 0; c < currentGridSize; c++) {
                        const idx = r * currentGridSize + c;
                        const item = gridData[idx];
                        if (item) {
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

            if (!item) {
                return (
                    <div
                        key={`empty-${index}`}
                        className="pointer-events-none"
                        style={{ width: cellSize.width || "80vw", height: cellSize.height || "65vh" }}
                    />
                );
            }

            return (
              <div
                key={`${item.type}-${item.id}`}
                className="flex items-center justify-center p-1"
                style={{ width: cellSize.width || "80vw", height: cellSize.height || "65vh" }}
              >
                  <GridCard
                    item={item}
                    people={people}
                    onClick={() => handleItemClick(item)}
                    x={x}
                    y={y}
                    row={r}
                    col={c}
                    cellSize={cellSize}
                    containerSize={containerSize}
                    visualYOffset={VISUAL_Y_OFFSET}
                  />
              </div>
            );
          })}
        </motion.div>
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-full bg-[#EADDDE]/30 flex items-center justify-center mb-4">
                        <Search className="w-8 h-8 text-[#5B2D7D]/20" />
                    </div>
                    <h3 className="text-[#5B2D7D] font-bold text-lg">No results found</h3>
                    <p className="text-[#5B2D7D]/60 text-sm max-w-[200px] mx-auto mt-1">We couldn&apos;t find anything matching your search.</p>
                    <button 
                        onClick={() => setSearchQuery("")}
                        className="mt-6 text-[#5B2D7D] font-bold text-sm underline underline-offset-4"
                    >
                        Clear search
                    </button>
                </div>
            )
        ) : (
            // List View
            <div className="w-full h-full overflow-y-auto px-4 pt-4 pb-32 no-scrollbar">
                <div className="max-w-2xl mx-auto space-y-4">
                    {listItems.length > 0 ? listItems.map((item) => {
                         const isLived = item.status === 'lived';
                         const hasMedia = item.experience?.media && item.experience.media.length > 0;
                         const firstMedia = hasMedia ? item.experience!.media[0] : null;
                         
                         return (
                            <div 
                                key={item.id} 
                                onClick={() => handleListItemClick(item)}
                                className="bg-white rounded-2xl p-4 shadow-sm border border-[#EADDDE] flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
                            >
                                <div className={`w-16 h-16 shrink-0 rounded-xl overflow-hidden relative ${isLived ? '' : 'bg-[#EADDDE]/30 flex items-center justify-center'}`}>
                                    {hasMedia && firstMedia?.type === 'image' ? (
                                        <Image src={getOptimizedUrl(firstMedia.url, 'image', 200)} alt="" fill className="object-cover" />
                                    ) : (
                                        <div className={`w-full h-full flex items-center justify-center ${isLived ? 'bg-[#A4C538]/20' : ''}`}>
                                            {isLived ? <Check className="w-6 h-6 text-[#A4C538]" /> : <div className="w-3 h-3 rounded-full bg-[#EADDDE]" />}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <h3 className={`font-bold text-lg truncate ${isLived ? 'text-[#5B2D7D]' : 'text-[#5B2D7D]/60'}`}>{item.title}</h3>
                                    {item.description && <p className="text-sm text-[#5B2D7D]/60 truncate">{item.description}</p>}
                                    {isLived && item.livedAt && (
                                        <p className="text-xs text-[#A4C538] font-medium mt-1">
                                            {new Date(item.livedAt).toLocaleDateString()}
                                        </p>
                                    )}
                                    {!isLived && item.targetDate && (
                                        <p className="text-xs text-[#5B2D7D]/40 font-medium mt-1">
                                            Target: {new Date(item.targetDate).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                                
                                {isLived && <div className="w-2 h-2 rounded-full bg-[#A4C538]" />}
                            </div>
                         )
                    }) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 rounded-full bg-[#EADDDE]/30 flex items-center justify-center mb-4">
                                <Search className="w-8 h-8 text-[#5B2D7D]/20" />
                            </div>
                            <h3 className="text-[#5B2D7D] font-bold text-lg">No results found</h3>
                            <p className="text-[#5B2D7D]/60 text-sm max-w-[200px] mx-auto mt-1">We couldn&apos;t find anything matching your search.</p>
                            <button 
                                onClick={() => setSearchQuery("")}
                                className="mt-6 text-[#5B2D7D] font-bold text-sm underline underline-offset-4"
                            >
                                Clear search
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>

      {/* Bottom Controls Area */}
      <div className="absolute bottom-6 left-0 right-0 z-40 pointer-events-none px-6 flex items-end justify-between gap-4">
        {/* View Toggle - Bottom Center-ish */}
        <div 
            onClick={() => setViewMode(prev => prev === 'grid' ? 'list' : 'grid')}
            className="h-12 bg-white/80 backdrop-blur-xl border border-[#EADDDE] shadow-lg rounded-2xl flex items-center p-1.5 cursor-pointer relative pointer-events-auto flex-1 max-w-[240px]"
        >
            <motion.div 
                className="absolute inset-y-1.5 w-[calc(50%-6px)] bg-[#5B2D7D] rounded-xl shadow-sm"
                animate={{ x: viewMode === 'grid' ? 0 : '100%' }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
            <div className={`flex-1 flex items-center justify-center relative z-10 text-[10px] font-black uppercase tracking-wider transition-colors duration-200 ${viewMode === 'grid' ? 'text-white' : 'text-[#5B2D7D]'}`}>
                Gallery
            </div>
            <div className={`flex-1 flex items-center justify-center relative z-10 text-[10px] font-black uppercase tracking-wider transition-colors duration-200 ${viewMode === 'list' ? 'text-white' : 'text-[#5B2D7D]'}`}>
                Bucket List
            </div>
        </div>

        {/* Action Buttons */}
        {!isGraduated && (
            <div className="flex flex-col items-center gap-3 pointer-events-auto">
            {/* Primary: Add Memory (Grid) or Add Experience (List) */}
            <button
                onClick={handleFabClick}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors ${
                    viewMode === 'grid' 
                    ? 'bg-[#5B2D7D] hover:bg-[#4A246A]' 
                    : 'bg-[#A4C538] hover:bg-[#93B132]'
                }`}
            >
                {viewMode === 'grid' ? <ImageIcon className="w-6 h-6 text-white" /> : <Plus className="w-7 h-7 text-white" />}
            </button>
            </div>
        )}
      </div>

      <MemoryDrawer 
        memory={selectedDrawerData} 
        open={drawerOpen} 
        onOpenChange={setDrawerOpen} 
        people={people}
        onEdit={handleEditItem}
      />
    </div>
  );
}
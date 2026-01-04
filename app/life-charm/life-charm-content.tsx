"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, animate, useTransform, MotionValue } from "motion/react";
import {
  Plus,
  Check,
  GraduationCap,
  Calendar,
  Users,
  ChevronUp,
} from "lucide-react";
import { LifeList, LifeListItem, Product, Person, Experience, ExperienceMedia } from "@prisma/client";
import { getOptimizedUrl } from "@/lib/media-helper";

type LifeListItemWithExperience = LifeListItem & {
  experience: (Experience & { media: ExperienceMedia[] }) | null;
};

type LifeListWithItems = LifeList & {
  items: LifeListItemWithExperience[];
};

type ProductWithState = Product & {
  state: string;
};

interface LifeCharmContentProps {
  lifeList: LifeListWithItems;
  product: ProductWithState;
  people: Person[];
  user: { id?: string; name?: string | null; email?: string | null };
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

// --- Life Item Card ---
function LifeItemCard({
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
  item: LifeListItemWithExperience;
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

  const isLived = item.status === "lived";
  const hasMedia = item.experience?.media && item.experience.media.length > 0;
  const firstMedia = hasMedia ? item.experience!.media[0] : null;

  // Get people names
  const peopleNames = item.peopleIds
    .map((id) => people.find((p) => p.id === id)?.name)
    .filter(Boolean)
    .slice(0, 2);

  // Format when text
  const getWhenText = () => {
    if (item.whenType === "someday") return "Someday";
    if (item.whenType === "this_year") return "This Year";
    if (item.whenType === "this_month") return "This Month";
    if (item.targetDate) return new Date(item.targetDate).toLocaleDateString();
    return null;
  };

  const whenText = getWhenText();

  // Background colors based on status
  const bgGradient = isLived
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
      {hasMedia && firstMedia?.type === "image" ? (
        <div className="absolute inset-0">
          <img
            src={getOptimizedUrl(firstMedia.url, "image", 600)}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        </div>
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${bgGradient}`}>
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl transform translate-x-10 -translate-y-10" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-3xl transform -translate-x-10 translate-y-10" />
        </div>
      )}

      {/* Status Badge */}
      <div className="relative z-10 p-6">
        {isLived ? (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-full">
            <Check className="w-4 h-4 text-white" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Lived
            </span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
            <div className="w-2 h-2 rounded-full bg-white/60" />
            <span className="text-xs font-bold text-white/80 uppercase tracking-wider">
              Pending
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <motion.div
        className="relative z-10 p-6 pt-0"
        style={{ opacity: contentOpacity }}
      >
        {/* Title */}
        <h2 className="text-3xl font-black text-white leading-tight mb-3 uppercase tracking-tight">
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

          {whenText && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full">
              <Calendar className="w-3.5 h-3.5 text-white/70" />
              <span className="text-xs text-white/80 font-medium">{whenText}</span>
            </div>
          )}
        </div>

        {/* Lived Date */}
        {isLived && item.livedAt && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-white/60 text-xs">
              Experienced on{" "}
              <span className="text-white font-medium">
                {new Date(item.livedAt).toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </p>
          </div>
        )}
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

// --- Empty Card ---
function EmptyCard({
  onClick,
  x,
  y,
  row,
  col,
  cellSize,
  containerSize,
  visualYOffset,
}: {
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

  const opacity = useTransform(dist, [0, 400], [1, 0.6]);
  const contentOpacity = useTransform(dist, [0, 200], [1, 0.8]);

  return (
    <motion.div
      className="w-full h-full rounded-none flex flex-col items-center justify-center overflow-hidden cursor-pointer bg-white/60 shadow-md border-2 border-dashed border-[#5B2D7D]/20"
      style={{
        opacity,
        willChange: "transform, opacity",
        touchAction: "none",
        transform: "translate3d(0,0,0)",
        backfaceVisibility: "hidden",
      }}
      onClick={onClick}
    >
      <motion.div
        className="flex flex-col items-center justify-center"
        style={{
          opacity: contentOpacity,
          scale: useTransform(dist, [0, 400], [1, 0.9]),
        }}
      >
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3 shadow-sm bg-[#5B2D7D]/10">
          <Plus className="w-8 h-8 text-[#5B2D7D]" />
        </div>
        <span className="text-[#5B2D7D] font-medium font-[Outfit]">
          Add Experience
        </span>
      </motion.div>
    </motion.div>
  );
}

// --- Main Component ---
export default function LifeCharmContent({
  lifeList,
  product,
  people,
  user,
}: LifeCharmContentProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [cellSize, setCellSize] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const dragStartRef = useRef<{ col: number; row: number } | null>(null);

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

  // Grid data - all items
  const gridItems = useMemo(() => {
    const items = [...lifeList.items];
    // Sort: pending first, then lived (for Grid)
    items.sort((a, b) => {
      if (a.status === "pending" && b.status === "lived") return -1;
      if (a.status === "lived" && b.status === "pending") return 1;
      return 0;
    });
    return items;
  }, [lifeList.items]);

  // List Items - Lived first for List View
  const listItems = useMemo(() => {
      const items = [...lifeList.items];
      items.sort((a, b) => {
          if (a.status === "lived" && b.status === "pending") return -1;
          if (a.status === "pending" && b.status === "lived") return 1;
          return 0;
      });
      return items;
  }, [lifeList.items]);

  const currentGridSize = Math.max(3, Math.ceil(Math.sqrt(gridItems.length)));
  const totalCells = currentGridSize * currentGridSize;
  const FILL_ORDER = getCenterOutOrder(currentGridSize);

  // Build grid with random order but compact layout
  const gridData = useMemo(() => {
    const grid: (LifeListItemWithExperience | null)[] = Array(totalCells).fill(null);
    
    // Shuffle the items to randomize their order
    const shuffledItems = [...gridItems];
    for (let i = shuffledItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledItems[i], shuffledItems[j]] = [shuffledItems[j], shuffledItems[i]];
    }

    // Place shuffled items into grid using center-out order (compact)
    shuffledItems.slice(0, totalCells).forEach((item, index) => {
      const gridIndex = FILL_ORDER[index];
      if (gridIndex !== undefined) {
        grid[gridIndex] = item;
      }
    });
    return grid;
  }, [gridItems, totalCells, FILL_ORDER]);

  // Measure cell size
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
      }
    };
    setTimeout(updateSize, 0);
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const VISUAL_Y_OFFSET = 40;
  const initialFocusIndexRef = useRef<number | null>(null);

  // Set initial position
  useEffect(() => {
    if (cellSize.width === 0 || containerSize.width === 0) return;

    let targetIndex = initialFocusIndexRef.current;

    if (targetIndex === null) {
        // Find all indices that contain a lived item
        const livedIndices: number[] = [];
        gridData.forEach((item, index) => {
            if (item && item.status === "lived") {
                livedIndices.push(index);
            }
        });

        if (livedIndices.length > 0) {
            // Pick a random lived item
            const randomIndex = Math.floor(Math.random() * livedIndices.length);
            targetIndex = livedIndices[randomIndex];
        } else {
             // If center is empty, try to find ANY item to center on
             const anyItemIndex = gridData.findIndex(item => item !== null);
             targetIndex = (anyItemIndex !== -1) ? anyItemIndex : FILL_ORDER[0];
        }
        initialFocusIndexRef.current = targetIndex;
    }

    if (targetIndex === undefined || targetIndex === -1) return;

    const row = Math.floor(targetIndex / currentGridSize);
    const col = targetIndex % currentGridSize;

    const initialX = (containerSize.width - cellSize.width) / 2 - col * cellSize.width;
    const initialY = (containerSize.height - cellSize.height) / 2 - VISUAL_Y_OFFSET - row * cellSize.height;

    // Use animate with 0 duration to ensure value update propagates
    animate(x, initialX, { type: "spring", stiffness: 300, damping: 30, duration: 0 });
    animate(y, initialY, { type: "spring", stiffness: 300, damping: 30, duration: 0 });
  }, [cellSize, containerSize, currentGridSize, x, y, FILL_ORDER, gridData]);

  const handleAddItem = () => {
    router.push(`/life-charm/add?charmId=${product.id}`);
  };

  const handleItemClick = (item: LifeListItemWithExperience) => {
    if (item.status === "lived") {
      router.push(`/life-charm/experience/${item.id}?charmId=${product.id}`);
    } else {
      router.push(`/life-charm/item/${item.id}?charmId=${product.id}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#FDF2EC] relative overflow-hidden font-[Outfit]">
      {/* Header */}
      <header className="shrink-0 px-6 py-4 z-30 bg-white border-b border-[#EADDDE] shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-black text-[#5B2D7D] tracking-tight">{lifeList.name}</h1>
            <p className="text-sm font-bold text-[#5B2D7D]/70 uppercase tracking-wider">
              {stats.lived} / {stats.total} Lived
            </p>
          </div>
          {isGraduated ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-[#A4C538]/20 rounded-full border border-[#A4C538]/30">
              <GraduationCap className="w-5 h-5 text-[#A4C538]" />
              <span className="text-sm font-black text-[#5B2D7D]">Graduated</span>
            </div>
          ) : (
            <button
              onClick={() => router.push(`/life-charm/graduate?charmId=${product.id}`)}
              className="px-4 py-2 rounded-full bg-[#5B2D7D]/5 text-sm font-bold text-[#5B2D7D]/80 hover:bg-[#5B2D7D]/10 transition-colors"
            >
              Graduate
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div 
            onClick={() => setViewMode(prev => prev === 'grid' ? 'list' : 'grid')}
            className="w-full h-4 bg-[#EADDDE] rounded-full overflow-hidden shadow-inner cursor-pointer hover:opacity-90 transition-opacity relative group"
            title="Click to toggle view"
        >
          <motion.div
            className="h-full bg-[#A4C538] rounded-full shadow-[0_0_10px_rgba(164,197,56,0.5)]"
            initial={{ width: 0 }}
            animate={{
              width: stats.total > 0 ? `${(stats.lived / stats.total) * 100}%` : "0%",
            }}
            transition={{ duration: 0.8, ease: "circOut" }}
          />
           <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[9px] font-bold text-[#5B2D7D]/60 uppercase tracking-widest">{viewMode === 'grid' ? 'View List' : 'View Grid'}</span>
           </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 min-h-0 relative" ref={containerRef}>
        {viewMode === 'grid' ? (
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
            const snapPoint = offsetStart - clampedIndex * textContentSize;
            const valueToAnimate = isX ? x : y;

            animate(valueToAnimate, snapPoint, {
              type: "spring",
              stiffness: 300,
              damping: 30,
            });
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
                key={item.id}
                className="flex items-center justify-center p-1"
                style={{ width: cellSize.width || "80vw", height: cellSize.height || "65vh" }}
              >
                  <LifeItemCard
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
            // List View
            <div className="w-full h-full overflow-y-auto px-4 pt-4 pb-24 no-scrollbar">
                <div className="max-w-2xl mx-auto space-y-4">
                    {listItems.map((item) => {
                         const isLived = item.status === 'lived';
                         const hasMedia = item.experience?.media && item.experience.media.length > 0;
                         const firstMedia = hasMedia ? item.experience!.media[0] : null;
                         
                         return (
                            <div 
                                key={item.id} 
                                onClick={() => handleItemClick(item)}
                                className="bg-white rounded-2xl p-4 shadow-sm border border-[#EADDDE] flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
                            >
                                <div className={`w-16 h-16 shrink-0 rounded-xl overflow-hidden ${isLived ? '' : 'bg-[#EADDDE]/30 flex items-center justify-center'}`}>
                                    {hasMedia && firstMedia?.type === 'image' ? (
                                        <img src={getOptimizedUrl(firstMedia.url, 'image', 200)} alt="" className="w-full h-full object-cover" />
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
                                </div>
                                
                                {isLived && <div className="w-2 h-2 rounded-full bg-[#A4C538]" />}
                            </div>
                         );
                    })}
                </div>
            </div>
        )}
      </div>

      {/* Add Button */}
      {!isGraduated && (
        <div className="absolute bottom-6 right-6 z-20">
          <button
            onClick={handleAddItem}
            className="w-14 h-14 rounded-full bg-[#A4C538] flex items-center justify-center shadow-lg hover:bg-[#93B132] transition-colors"
          >
            <Plus className="w-7 h-7 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}

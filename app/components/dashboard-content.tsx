"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, animate, useTransform, MotionValue } from "motion/react";
import { Mic, Heart, Zap, Plus, Image as ImageIcon, ChevronUp } from "lucide-react";

interface Product {
    id: string;
    name: string;
    type: string;
}

interface DashboardContentProps {
    products: Product[];
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

function CharmCard({
  product,
  onClick,
  x,
  y,
  row,
  col,
  cellSize,
  containerSize,
  visualYOffset,
}: {
  product: Product;
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

  const scale = useTransform(dist, [0, 400], [1, 0.85]);
  const opacity = useTransform(dist, [0, 400], [1, 0.5]);
  const contentOpacity = useTransform(dist, [0, 200], [1, 0.8]);

  let icon = <ImageIcon className="w-12 h-12 text-white" />;
  let bgGradient = "from-[#5B2D7D] to-[#3A1D52]"; // Memory (Purple)
  let typeLabel = "Memory";

  if (product.type === "MEMORY") {
      icon = (
        <div className="relative w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 bg-white/20 rounded-xl shadow-md border-2 border-white/30 -rotate-12 translate-x-[-15%] translate-y-[-5%] overflow-hidden">
                <img src="https://images.unsplash.com/photo-1518173946687-a4c8a9b746f5?auto=format&fit=crop&w=100&q=80" className="w-full h-full object-cover opacity-40" alt="" />
            </div>
            <div className="absolute inset-0 bg-white/20 rounded-xl shadow-md border-2 border-white/30 rotate-12 translate-x-[15%] translate-y-[5%] overflow-hidden">
                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80" className="w-full h-full object-cover opacity-40" alt="" />
            </div>
            <div className="relative z-10 w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                <ImageIcon className="w-8 h-8 text-[#5B2D7D]" />
            </div>
        </div>
      );
      bgGradient = "from-[#5B2D7D] to-[#3A1D52]";
      typeLabel = "Memory";
  } else if (product.type === "LIFE") {
      icon = <Heart className="w-12 h-12 text-white fill-white" />;
      bgGradient = "from-[#A4C538] to-[#7A9B1E]";
      typeLabel = "Life";
  } else if (product.type === "HABIT") {
      icon = <Zap className="w-12 h-12 text-white fill-white" />;
      bgGradient = "from-[#EA580C] to-[#9A3412]";
      typeLabel = "Habit";
  }

  return (
    <motion.div
      onClick={onClick}
      className={`w-full h-full relative flex flex-col justify-between shadow-xl rounded-[32px] overflow-hidden cursor-pointer`}
      style={{
        scale,
        opacity,
        willChange: "transform, opacity",
        touchAction: "none",
        transform: "translate3d(0,0,0)",
        backfaceVisibility: "hidden",
      }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${bgGradient}`}>
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl transform translate-x-10 -translate-y-10" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-3xl transform -translate-x-10 translate-y-10" />
      </div>

      {/* Badge */}
      <div className="relative z-10 p-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-full">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            {typeLabel} Charm
          </span>
        </div>
      </div>

      {/* Content */}
      <motion.div
        className="relative z-10 p-6 pt-0 flex flex-col items-center"
        style={{ opacity: contentOpacity }}
      >
        <div className="mb-6">
            {icon}
        </div>
        
        <h2 className="text-3xl font-black text-white leading-tight text-center uppercase tracking-tight px-2">
          {product.name}
        </h2>
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

function AddCharmCard({
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

  const scale = useTransform(dist, [0, 400], [1, 0.85]);
  const opacity = useTransform(dist, [0, 400], [1, 0.6]);
  const contentOpacity = useTransform(dist, [0, 200], [1, 0.8]);

  return (
    <motion.div
      onClick={onClick}
      className="w-full h-full rounded-[32px] flex flex-col items-center justify-center overflow-hidden cursor-pointer bg-white/60 shadow-md border-2 border-dashed border-[#5B2D7D]/20"
      style={{
        scale,
        opacity,
        willChange: "transform, opacity",
        touchAction: "none",
        transform: "translate3d(0,0,0)",
        backfaceVisibility: "hidden",
      }}
    >
      <motion.div
        className="flex flex-col items-center justify-center"
        style={{
          opacity: contentOpacity,
          scale: useTransform(dist, [0, 400], [1, 0.9]),
        }}
      >
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-sm bg-[#5B2D7D]/10">
          <Plus className="w-10 h-10 text-[#5B2D7D]" />
        </div>
        <span className="text-[#5B2D7D] font-black uppercase tracking-tight text-xl">
          Add Charm
        </span>
      </motion.div>
    </motion.div>
  );
}

export default function DashboardContent({ products }: DashboardContentProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [cellSize, setCellSize] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const dragStartRef = useRef<{ col: number; row: number } | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Add a fake "Add" item to the list
  const gridItems = useMemo(() => {
      return [...products, { id: 'add-new', name: 'Add Charm', type: 'ADD' }];
  }, [products]);

  const currentGridSize = Math.max(3, Math.ceil(Math.sqrt(gridItems.length)));
  const totalCells = currentGridSize * currentGridSize;
  const FILL_ORDER = getCenterOutOrder(currentGridSize);

  // Build grid (Center-Out Compact)
  const gridData = useMemo(() => {
    const grid: (Product | null)[] = Array(totalCells).fill(null);
    gridItems.slice(0, totalCells).forEach((item, index) => {
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
        const w = Math.min(containerW * 0.8, 340);
        const h = Math.min(containerH * 0.65, 480);
        setCellSize({ width: w, height: h });
        setContainerSize({ width: containerW, height: containerH });
      }
    };
    setTimeout(updateSize, 0);
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const VISUAL_Y_OFFSET = 40;

  // Bounding box of valid items
  const { minCol, maxCol, minRow, maxRow } = useMemo(() => {
    let minC = currentGridSize, maxC = 0, minR = currentGridSize, maxR = 0;
    let hasItems = false;
    gridData.forEach((item, index) => {
        if (item) {
            const r = Math.floor(index / currentGridSize);
            const c = index % currentGridSize;
            minC = Math.min(minC, c);
            maxC = Math.max(maxC, c);
            minR = Math.min(minR, r);
            maxR = Math.max(maxR, r);
            hasItems = true;
        }
    });
    if (!hasItems) return { minCol: 0, maxCol: 0, minRow: 0, maxRow: 0 };
    return { minCol: minC, maxCol: maxC, minRow: minR, maxRow: maxR };
  }, [gridData, currentGridSize]);

  // Initial Center
  useEffect(() => {
    if (cellSize.width === 0 || containerSize.width === 0) return;

    // Center on the first product (or add button if empty)
    const centerIndex = FILL_ORDER[0];
    
    if (centerIndex === undefined) return;

    const row = Math.floor(centerIndex / currentGridSize);
    const col = centerIndex % currentGridSize;

    const initialX = (containerSize.width - cellSize.width) / 2 - col * cellSize.width;
    const initialY = (containerSize.height - cellSize.height) / 2 - VISUAL_Y_OFFSET - row * cellSize.height;

    animate(x, initialX, { type: "spring", stiffness: 300, damping: 30, duration: 0 });
    animate(y, initialY, { type: "spring", stiffness: 300, damping: 30, duration: 0 });
  }, [cellSize, containerSize, currentGridSize, x, y, FILL_ORDER]);

  const handleCharmClick = (product: Product) => {
      if (product.type === 'ADD') {
          router.push('/products'); // or /manage-charms or wherever adding happens
          return;
      }

      if (product.type === "MEMORY") {
          router.push('/memories');
      } else if (product.type === "LIFE") {
          router.push(`/life-charm?charmId=${product.id}`);
      } else if (product.type === "HABIT") {
          router.push(`/habit-charm?charmId=${product.id}`);
      }
  };

  return (
    <div className="flex flex-col h-full bg-[#FDF2EC] relative overflow-hidden font-[Outfit]">
      <header className="shrink-0 px-6 py-6 z-30">
        <h1 className="text-3xl font-bold text-[#5B2D7D]">My Charms</h1>
        <p className="text-[#5B2D7D]/60">Swipe to explore</p>
      </header>

      <div className="flex-1 min-h-0 relative" ref={containerRef}>
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
              
                                  const minIdx = isX ? minCol : minRow;
                                  const maxIdx = isX ? maxCol : maxRow;
                                  const clampedIndex = Math.max(minIdx, Math.min(maxIdx, targetIndex));
                                  const snapPoint = offsetStart - clampedIndex * textContentSize;
                                  const valueToAnimate = isX ? x : y;
              
                                  animate(valueToAnimate, snapPoint, {              type: "spring",
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

            if (item.type === 'ADD') {
                return (
                    <div
                        key="add-card"
                        className="flex items-center justify-center p-2"
                        style={{ width: cellSize.width || "80vw", height: cellSize.height || "65vh" }}
                    >
                        <AddCharmCard
                            onClick={() => handleCharmClick(item)}
                            x={x} y={y} row={r} col={c}
                            cellSize={cellSize} containerSize={containerSize}
                            visualYOffset={VISUAL_Y_OFFSET}
                        />
                    </div>
                )
            }

            return (
              <div
                key={item.id}
                className="flex items-center justify-center p-2"
                style={{ width: cellSize.width || "80vw", height: cellSize.height || "65vh" }}
              >
                  <CharmCard
                    product={item}
                    onClick={() => handleCharmClick(item)}
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
      </div>
    </div>
  );
}

"use client";

import { getGifterProduct, createGifterFullMemory, getGuestCloudinarySignature, getGifterMemories } from "@/app/actions/nfc";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useTransition, useRef, Suspense, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue, animate, useTransform, MotionValue } from "framer-motion";
import CameraCapture from "@/app/components/CameraCapture";
import { MemoryDrawer } from "@/components/memory-drawer";
import { getOptimizedUrl } from "@/lib/media-helper";

import {
    ChevronLeft,
    Upload,
    Calendar,
    MapPin,
    Image as ImageIcon,
    Video as VideoIcon,
    Mic,
    RefreshCw,
    Feather,
    ChevronDown,
    Plus,
    X,
    Camera,
    Zap,
    Gift,
    Heart,
    ChevronUp,
    LayoutGrid,
    Check
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

const MOODS = ["Serene", "Celebratory", "Nostalgic", "Dreamy", "Quiet", "Vibrant", "Tender", "Bittersweet", "Warm", "Intimate", "Reflective", "Emotional", "Lighthearted", "Cozy", "Energetic", "Sentimental", "Playful", "Soft", "Meaningful", "Heavy"];

// --- Helpers for Sliding Gallery ---

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

// --- Components ---

function GalleryCard({
  item, x, y, row, col, cellSize, containerSize, visualYOffset, index, onClick
}: any) {
  const dist = useDistance(x, y, row, col, cellSize, containerSize, visualYOffset);
  const opacity = useTransform(dist, [0, 400], [1, 0.5]);
  const contentOpacity = useTransform(dist, [0, 200], [1, 0.8]);

  const hasMedia = item.media && item.media.length > 0;
  const firstMedia = hasMedia ? item.media[0] : null;

  const formattedDate = useMemo(() => {
      if (!item.date) return "";
      return new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(item.date));
  }, [item.date]);

  return (
    <motion.div
      onClick={onClick}
      className="w-full h-full relative flex flex-col justify-between shadow-xl rounded-3xl overflow-hidden cursor-pointer bg-white"
      style={{ opacity, touchAction: "none", transform: "translate3d(0,0,0)", backfaceVisibility: "hidden" }}
    >
      {/* Background */}
      {hasMedia && (firstMedia?.type.includes("image") || firstMedia?.type.includes("video")) ? (
        <div className="absolute inset-0">
          <Image
            src={getOptimizedUrl(
              firstMedia.type.includes("video")
                ? ((firstMedia as any).posterUrl || (firstMedia.url.includes('.') ? firstMedia.url.replace(/\.[^/.]+$/, ".jpg") : `${firstMedia.url}.jpg`))
                : firstMedia.url,
              "image",
              600
            )}
            alt="" fill className="object-cover" priority={index < 4}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#556B5A] to-[#3A1D52]">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl transform translate-x-10 -translate-y-10" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-3xl transform -translate-x-10 translate-y-10" />
        </div>
      )}

      <div className="relative z-10 p-6 flex items-start justify-between">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-full">
            <Heart className="w-4 h-4 text-white fill-white" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Gifted</span>
        </div>
      </div>

      <motion.div className="relative z-10 p-6 pt-0" style={{ opacity: contentOpacity }}>
        <h2 className="text-3xl font-black text-white leading-tight mb-3 uppercase tracking-tight line-clamp-2">{item.title}</h2>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full w-fit">
            <Calendar className="w-3.5 h-3.5 text-white/70" />
            <span className="text-xs text-white/80 font-medium">{formattedDate}</span>
        </div>
      </motion.div>

      <motion.div className="absolute bottom-6 left-1/2 -translate-x-1/2" style={{ opacity: contentOpacity }}>
        <ChevronUp className="w-6 h-6 text-white/30 animate-bounce" />
      </motion.div>
    </motion.div>
  );
}

function GifterUploadContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const [isPending, startTransition] = useTransition();
    const [isUploading, setIsUploading] = useState(false);
    const [uploadMode, setUploadMode] = useState<'full' | 'quick'>('full');
    const [viewMode, setViewMode] = useState<'upload' | 'gallery'>('upload');
    const [product, setProduct] = useState<any>(null);
    const [memories, setMemories] = useState<any[]>([]);
    const [isLoadingInitial, setIsLoadingInitial] = useState(true);

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedDrawerData, setSelectedDrawerData] = useState<any>(null);

    // Gallery Motion Values
    const containerRef = useRef<HTMLDivElement>(null);
    const [cellSize, setCellSize] = useState({ width: 0, height: 0 });
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const dragStartRef = useRef<{ col: number; row: number } | null>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const VISUAL_Y_OFFSET = 40;
    const hasCentered = useRef(false);

    // Form Refs
    const imageInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);

    // Form State
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
    const [location, setLocation] = useState("");
    const [selectedMood, setSelectedMood] = useState<string | null>(null);
    const [mediaItems, setMediaItems] = useState<any[]>([]);
    const uploadPromisesRef = useRef<Map<string, Promise<any>>>(new Map());
    const completedUploadsRef = useRef<Map<string, any>>(new Map());
    const [optionalExpanded, setOptionalExpanded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Grid Logic for Gallery
    const gridSize = useMemo(() => Math.max(3, Math.ceil(Math.sqrt(memories.length))), [memories.length]);
    const totalCells = useMemo(() => gridSize * gridSize, [gridSize]);
    const FILL_ORDER = useMemo(() => getCenterOutOrder(gridSize), [gridSize]);
    const gridData = useMemo(() => {
        const grid = Array(totalCells).fill(null);
        memories.forEach((m, i) => { if (FILL_ORDER[i] !== undefined) grid[FILL_ORDER[i]] = m; });
        return grid;
    }, [memories, totalCells, FILL_ORDER]);

    // Initialization
    useEffect(() => {
        if (!token) {
            setError("Invalid access link.");
            setIsLoadingInitial(false);
            return;
        }

        Promise.all([
            getGifterProduct(token),
            getGifterMemories(token)
        ]).then(([prodRes, memRes]) => {
            if (prodRes && 'error' in prodRes) {
                setError((prodRes as any).error || "Access denied.");
            } else {
                setProduct(prodRes);
                if (memRes) setMemories(memRes);
            }
            setIsLoadingInitial(false);
        });
    }, [token]);

    // Resize Handler for Gallery & Initial Centering
    useEffect(() => {
        if (viewMode === 'gallery' && memories.length > 0) {
            const updateSize = () => {
                if (containerRef.current) {
                    const w = containerRef.current.offsetWidth;
                    const h = containerRef.current.offsetHeight;
                    const cw = Math.min(w * 0.85, 400);
                    const ch = Math.min(h * 0.80, 650);
                    setCellSize({ width: cw, height: ch });
                    setContainerSize({ width: w, height: h });

                    // Center on the first item (center of grid) if not already centered
                    if (!hasCentered.current && cw > 0) {
                        const mid = Math.floor(gridSize / 2);
                        const centerX = (w - cw) / 2 - mid * cw;
                        const centerY = (h - ch) / 2 - VISUAL_Y_OFFSET - mid * ch;
                        x.set(centerX);
                        y.set(centerY);
                        hasCentered.current = true;
                    }
                }
            };
            updateSize();
            window.addEventListener("resize", updateSize);
            return () => window.removeEventListener("resize", updateSize);
        } else {
            hasCentered.current = false;
        }
    }, [viewMode, memories.length, gridSize, x, y]);

    // Upload logic
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            const newItems = files.map(file => ({
                id: Math.random().toString(36).substring(7),
                file,
                previewUrl: URL.createObjectURL(file),
                status: 'uploading',
            }));
            setMediaItems(prev => [...prev, ...newItems]);
            newItems.forEach(item => uploadFile(item));
        }
    };

    const uploadFile = async (item: any) => {
        try {
            const uploadPromise = (async () => {
                const signatureData = await getGuestCloudinarySignature(token!);
                if (!signatureData) throw new Error("Signature failed");
                const { signature, timestamp, folder, cloudName, apiKey } = signatureData;
                const formData = new FormData();
                formData.append("file", item.file);
                formData.append("api_key", apiKey!);
                formData.append("timestamp", timestamp.toString());
                formData.append("signature", signature);
                formData.append("folder", folder);
                formData.append("type", "authenticated");
                const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: "POST", body: formData });
                if (!res.ok) throw new Error("Upload failed");
                return res.json();
            })();
            uploadPromisesRef.current.set(item.id, uploadPromise);
            const data = await uploadPromise;
            completedUploadsRef.current.set(item.id, { 
                url: data.secure_url, 
                type: item.file.type.startsWith('audio') ? 'audio' : data.resource_type, 
                size: data.bytes 
            });
            setMediaItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'completed' } : i));
        } catch (e) {
            setMediaItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error' } : i));
            toast.error("File upload failed");
        } finally {
            uploadPromisesRef.current.delete(item.id);
        }
    };

    const handleSubmit = async () => {
        if (!title.trim() || mediaItems.length === 0) {
            toast.error("Please fill required fields");
            return;
        }
        setIsUploading(true);
        try {
            const pending = mediaItems.filter(i => i.status === 'uploading');
            await Promise.all(pending.map(i => uploadPromisesRef.current.get(i.id)));
            
            const finalMedia = mediaItems.map(i => completedUploadsRef.current.get(i.id)).filter(Boolean);
            const res = await createGifterFullMemory(token!, {
                title, description, date: `${date}T${time}:00`, media: finalMedia as any, mood: selectedMood || undefined
            });

            if (res.success) {
                toast.success("Memory added to gift!");
                const updatedMems = await getGifterMemories(token!);
                if (updatedMems) setMemories(updatedMems);
                
                setTitle(""); setDescription(""); setMediaItems([]); setSelectedMood(null);
                setViewMode('gallery');
            } else {
                toast.error(res.error || "Failed to save");
            }
        } catch (e) {
            toast.error("Error processing submission");
        } finally {
            setIsUploading(false);
        }
    };

    const handleCardClick = (item: any) => {
        setSelectedDrawerData({
            ...item,
            dataType: 'memory',
            peopleIds: [],
            media: item.media
        });
        setDrawerOpen(true);
    };

    if (isLoadingInitial) return <div className="h-dvh flex items-center justify-center bg-[#F6F2EC]"><RefreshCw className="w-8 h-8 animate-spin text-[#556B5A]" /></div>;
    if (error) return <div className="h-dvh flex flex-col items-center justify-center p-6 text-center bg-[#F6F2EC]"><Zap className="w-8 h-8 text-red-500 mb-4" /><h2 className="text-xl font-bold">{error}</h2></div>;

    return (
        <div className="flex flex-col h-full bg-[#F6F2EC] font-[Outfit] relative overflow-hidden">
            <AnimatePresence mode="wait">
                {viewMode === 'upload' ? (
                    <motion.div 
                        key="upload" 
                        initial={{ opacity: 0, x: -20 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        exit={{ opacity: 0, x: 20 }}
                        className="flex-1 overflow-y-auto px-6 pt-6 pb-24 no-scrollbar"
                    >
                        <div className="max-w-xl mx-auto w-full">
                            <div className="flex items-start justify-between mb-8">
                                <div className="flex items-start gap-3">
                                    <Gift className="w-7 h-7 text-[#7C9A86] mt-1" />
                                    <div>
                                        <h1 className="text-2xl font-black text-[#556B5A] uppercase leading-none">PRE-LOAD GIFT</h1>
                                        <p className="text-[#A68CAB] text-[10px] font-bold uppercase mt-1">For {product.name}</p>
                                    </div>
                                </div>
                                <button onClick={() => setViewMode('gallery')} className="p-2 bg-white rounded-full shadow-sm text-[#556B5A]"><LayoutGrid className="w-5 h-5" /></button>
                            </div>

                            <div className="bg-white/50 backdrop-blur-md p-1.5 rounded-2xl flex gap-1.5 mb-8">
                                <button onClick={() => setUploadMode('full')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${uploadMode === 'full' ? 'bg-[#556B5A] text-white' : 'text-[#556B5A]/60'}`}>Full Memory</button>
                                <button onClick={() => setUploadMode('quick')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${uploadMode === 'quick' ? 'bg-[#7C9A86] text-white' : 'text-[#556B5A]/60'}`}>Quick Snap</button>
                            </div>

                            {uploadMode === 'quick' ? (
                                <div className="bg-white/80 rounded-[40px] p-6 shadow-xl min-h-[400px] flex items-center justify-center relative overflow-hidden">
                                    <CameraCapture token={token!} onClose={() => setUploadMode('full')} onSuccess={() => { 
                                        toast.success("Snap added!"); 
                                        getGifterMemories(token!).then(res => { if (res) setMemories(res); }); 
                                        setViewMode('gallery'); 
                                    }} />
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div onClick={() => imageInputRef.current?.click()} className="border-2 border-dashed border-[#556B5A]/20 bg-white/50 rounded-[32px] p-10 flex flex-col items-center justify-center cursor-pointer">
                                        <Upload className="w-8 h-8 text-[#F37B55] mb-2" />
                                        <p className="text-[#556B5A] font-black text-sm uppercase">Add Media</p>
                                    </div>
                                    {mediaItems.length > 0 && (
                                        <div className="grid grid-cols-3 gap-2">
                                            {mediaItems.map(item => (
                                                <div key={item.id} className="aspect-square rounded-xl bg-gray-100 relative overflow-hidden">
                                                    {item.status === 'uploading' && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><RefreshCw className="w-4 h-4 animate-spin text-white" /></div>}
                                                    <Image src={item.previewUrl} alt="" fill className="object-cover" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className="bg-white/80 rounded-[32px] p-6 space-y-4">
                                        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="w-full bg-[#F6F2EC]/50 rounded-xl px-4 py-3 font-bold text-[#556B5A] outline-none" />
                                        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="The story..." className="w-full bg-[#F6F2EC]/50 rounded-xl px-4 py-3 text-sm min-h-[100px] outline-none resize-none" />
                                        <div className="flex gap-2">
                                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="flex-1 bg-[#F6F2EC]/50 rounded-xl px-4 py-3 text-xs font-bold" />
                                            <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Location" className="flex-1 bg-[#F6F2EC]/50 rounded-xl px-4 py-3 text-xs font-bold outline-none" />
                                        </div>
                                    </div>
                                    <button onClick={handleSubmit} disabled={isUploading} className="w-full bg-[#556B5A] text-white py-5 rounded-[24px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
                                        {isUploading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                        <span>Add to Gift</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div 
                        key="gallery" 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="flex-1 relative flex flex-col"
                    >
                        <div className="p-6 flex items-center justify-between z-50">
                            <h2 className="text-xl font-black text-[#556B5A] uppercase">GIFT GALLERY</h2>
                            <button onClick={() => setViewMode('upload')} className="p-3 bg-[#556B5A] text-white rounded-2xl shadow-lg"><Plus className="w-6 h-6" /></button>
                        </div>

                        {memories.length > 0 ? (
                            <div className="flex-1 relative" ref={containerRef}>
                                <motion.div
                                    className="grid gap-0 absolute top-0 left-0 touch-none origin-top-left"
                                    style={{
                                        gridTemplateColumns: `repeat(${gridSize}, ${cellSize.width ? cellSize.width + "px" : "80vw"})`,
                                        gridTemplateRows: `repeat(${gridSize}, ${cellSize.height ? cellSize.height + "px" : "65vh"})`,
                                        x, y,
                                        width: gridSize * (cellSize.width || 0),
                                        height: gridSize * (cellSize.height || 0),
                                    }}
                                    drag
                                    dragDirectionLock
                                    dragMomentum={false}
                                    onDragEnd={(e, { offset }) => {
                                        const isX = Math.abs(offset.x) > Math.abs(offset.y);
                                        const textContentSize = isX ? cellSize.width : cellSize.height;
                                        const containerValues = isX ? containerSize.width : containerSize.height;
                                        let offsetStart = (containerValues - textContentSize) / 2;
                                        if (!isX) offsetStart -= VISUAL_Y_OFFSET;
                                        const current = isX ? x.get() : y.get();
                                        const targetIndex = Math.round((offsetStart - current) / textContentSize);
                                        const clampedIndex = Math.max(0, Math.min(gridSize - 1, targetIndex));
                                        
                                        const targetXPos = (containerSize.width - cellSize.width) / 2 - (isX ? clampedIndex : Math.round(((containerSize.width - cellSize.width) / 2 - x.get()) / cellSize.width)) * cellSize.width;
                                        const targetYPos = (containerSize.height - cellSize.height) / 2 - VISUAL_Y_OFFSET - (!isX ? clampedIndex : Math.round(((containerSize.height - cellSize.height) / 2 - VISUAL_Y_OFFSET - y.get()) / cellSize.height)) * cellSize.height;

                                        animate(x, targetXPos, { type: "spring", stiffness: 300, damping: 30 });
                                        animate(y, targetYPos, { type: "spring", stiffness: 300, damping: 30 });
                                    }}
                                >
                                    {gridData.map((item, index) => {
                                        if (!item) return <div key={`empty-${index}`} style={{ width: cellSize.width, height: cellSize.height }} />;
                                        return (
                                            <div key={item.id} className="flex items-center justify-center p-1" style={{ width: cellSize.width, height: cellSize.height }}>
                                                <GalleryCard item={item} x={x} y={y} row={Math.floor(index / gridSize)} col={index % gridSize} cellSize={cellSize} containerSize={containerSize} visualYOffset={VISUAL_Y_OFFSET} index={index} onClick={() => handleCardClick(item)} />
                                            </div>
                                        );
                                    })}
                                </motion.div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center opacity-40">
                                <Feather className="w-16 h-16 mb-4" />
                                <p className="font-bold">No memories yet. Add your first one!</p>
                                <button onClick={() => setViewMode('upload')} className="mt-6 font-black text-[#556B5A] underline uppercase tracking-widest text-xs">Start Pre-loading</button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <MemoryDrawer memory={selectedDrawerData} open={drawerOpen} onOpenChange={setDrawerOpen} people={[]} />
            
            <input type="file" ref={imageInputRef} className="hidden" onChange={handleFileChange} multiple accept="image/*" />
            <input type="file" ref={videoInputRef} className="hidden" onChange={handleFileChange} multiple accept="video/*" />
            <input type="file" ref={audioInputRef} className="hidden" onChange={handleFileChange} multiple accept="audio/*" />
        </div>
    );
}

export default function GifterUploadPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <GifterUploadContent />
        </Suspense>
    );
}

"use client";

import { signIn } from "next-auth/react";
import { Zap, Lock, ArrowRight, Loader2, Camera, Heart, MapPin, Calendar, Sparkles, ChevronUp, Image as ImageIcon, X, Upload } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense, useCallback, useMemo, useRef } from "react";
import { getProductWithType } from "@/app/actions/life-charm";
import { getProductOwnerInfo, completeUserSetup, getPublicCharmShowcase, claimProduct, verifyGuestUploadPassword, getGuestCloudinarySignature, createGuestMemory } from "@/app/actions/nfc";
import CameraCapture from "@/app/components/CameraCapture";
import { AnimatePresence, motion, useMotionValue, animate, useTransform, MotionValue } from "motion/react";
import { getOptimizedUrl } from "@/lib/media-helper";
import { MemoryDrawer } from "@/components/memory-drawer";
import Image from "next/image";
import { haptics } from "@/lib/haptics";
import { toast } from "sonner";

// --- Helpers ---

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

function PublicGridCard({
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
      className="w-full h-full relative flex flex-col justify-between shadow-xl rounded-none overflow-hidden cursor-pointer"
      style={{ opacity, touchAction: "none", transform: "translate3d(0,0,0)", backfaceVisibility: "hidden" }}
    >
      {/* Background */}
      {hasMedia && (firstMedia?.type.includes("image") || firstMedia?.type.includes("video")) ? (
        <div className="absolute inset-0">
          <Image
            src={getOptimizedUrl(firstMedia.type.includes("video") ? (firstMedia.url.includes('.') ? firstMedia.url.replace(/\.[^/.]+$/, ".jpg") : `${firstMedia.url}.jpg`) : firstMedia.url, "image", 600)}
            alt="" fill className="object-cover" priority={index < 4}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#A4C538] to-[#7A9B1E]">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl transform translate-x-10 -translate-y-10" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-3xl transform -translate-x-10 translate-y-10" />
        </div>
      )}

      <div className="relative z-10 p-6 flex items-start justify-between">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-full">
            <Heart className="w-4 h-4 text-white fill-white" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Featured</span>
        </div>
      </div>

      <motion.div className="relative z-10 p-6 pt-0" style={{ opacity: contentOpacity }}>
        <h2 className="text-3xl font-black text-white leading-tight mb-3 uppercase tracking-tight line-clamp-2">{item.title}</h2>
        {item.location && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full w-fit mb-2">
                <MapPin className="w-3.5 h-3.5 text-white/70" />
                <span className="text-xs text-white/80 font-medium truncate max-w-[150px]">{item.location}</span>
            </div>
        )}
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

function ShowcaseGallery({ publicData, onUnlock, onCamera, onUpload, token, onItemClick }: any) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [cellSize, setCellSize] = useState({ width: 0, height: 0 });
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const dragStartRef = useRef<{ col: number; row: number } | null>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const VISUAL_Y_OFFSET = 40;
    const hasInitialized = useRef(false);

    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                const w = containerRef.current.offsetWidth;
                const h = containerRef.current.offsetHeight;
                const cw = Math.min(w * 0.85, 400);
                const ch = Math.min(h * 0.80, 650);
                setCellSize({ width: cw, height: ch });
                setContainerSize({ width: w, height: h });
            }
        };
        updateSize();
        window.addEventListener("resize", updateSize);
        return () => window.removeEventListener("resize", updateSize);
    }, []);

    const items = publicData?.items || [];
    const gridSize = Math.max(3, Math.ceil(Math.sqrt(items.length)));
    const FILL_ORDER = useMemo(() => getCenterOutOrder(gridSize), [gridSize]);
    const gridData = useMemo(() => {
        const grid = Array(gridSize * gridSize).fill(null);
        items.slice(0, gridSize * gridSize).forEach((item: any, i: number) => {
            const idx = FILL_ORDER[i];
            if (idx !== undefined) grid[idx] = item;
        });
        return grid;
    }, [items, gridSize, FILL_ORDER]);

    useEffect(() => {
        if (cellSize.width === 0 || containerSize.width === 0 || gridData.length === 0 || hasInitialized.current) return;
        const centerIdx = FILL_ORDER[0];
        const row = Math.floor(centerIdx / gridSize);
        const col = centerIdx % gridSize;
        const initX = (containerSize.width - cellSize.width) / 2 - col * cellSize.width;
        const initY = (containerSize.height - cellSize.height) / 2 - VISUAL_Y_OFFSET - row * cellSize.height;
        animate(x, initX, { duration: 0 });
        animate(y, initY, { duration: 0 });
        hasInitialized.current = true;
    }, [cellSize, containerSize, gridSize, FILL_ORDER, gridData, x, y]);

    const handleDragEnd = (e: any, { offset }: any) => {
        const isX = Math.abs(offset.x) > Math.abs(offset.y);
        const cellSizeVal = isX ? cellSize.width : cellSize.height;
        const containerVal = isX ? containerSize.width : containerSize.height;
        let offsetStart = (containerVal - cellSizeVal) / 2;
        if (!isX) offsetStart -= VISUAL_Y_OFFSET;

        const SWIPE_THRESHOLD = 50;
        let targetIdx = 0;
        if (dragStartRef.current) {
            const startIdx = isX ? dragStartRef.current.col : dragStartRef.current.row;
            const dragOff = isX ? offset.x : offset.y;
            let dir = 0;
            if (dragOff < -SWIPE_THRESHOLD) dir = 1;
            if (dragOff > SWIPE_THRESHOLD) dir = -1;
            targetIdx = startIdx + dir;
        } else {
            const cur = isX ? x.get() : y.get();
            targetIdx = Math.round((offsetStart - cur) / cellSizeVal);
        }

        const clamped = Math.max(0, Math.min(gridSize - 1, targetIdx));
        const getCol = (v: number) => Math.round(((containerSize.width - cellSize.width) / 2 - v) / cellSize.width);
        const getRow = (v: number) => Math.round(((containerSize.height - cellSize.height) / 2 - VISUAL_Y_OFFSET - v) / cellSize.height);

        let tCol = isX ? clamped : getCol(x.get());
        let tRow = !isX ? clamped : getRow(y.get());
        tCol = Math.max(0, Math.min(gridSize - 1, tCol));
        tRow = Math.max(0, Math.min(gridSize - 1, tRow));

        if (!gridData[tRow * gridSize + tCol]) {
            let minDist = Infinity;
            let bR = tRow, bC = tCol;
            for (let r = 0; r < gridSize; r++) {
                for (let c = 0; c < gridSize; c++) {
                    if (gridData[r * gridSize + c]) {
                        const d = Math.abs(r - tRow) + Math.abs(c - tCol);
                        const bias = isX ? (r === tRow ? -0.5 : 0) : (c === tCol ? -0.5 : 0);
                        if (d + bias < minDist) { minDist = d + bias; bR = r; bC = c; }
                    }
                }
            }
            tRow = bR; tCol = bC;
        }

        const snapX = (containerSize.width - cellSize.width) / 2 - tCol * cellSize.width;
        const snapY = (containerSize.height - cellSize.height) / 2 - VISUAL_Y_OFFSET - tRow * cellSize.height;
        
        haptics.medium();
        animate(x, snapX, { type: "spring", stiffness: 300, damping: 30 });
        animate(y, snapY, { type: "spring", stiffness: 300, damping: 30 });
    };

    return (
        <div className="flex flex-col h-dvh relative overflow-hidden bg-transparent font-[Outfit]">
            <div className="absolute top-0 left-0 right-0 z-30 pt-8 px-6 text-center pointer-events-none">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="inline-block px-4 py-2 bg-white/20 backdrop-blur-xl rounded-2xl border border-white/30 shadow-lg pointer-events-auto">
                    <h1 className="text-xl font-black text-[#5B2D7D] uppercase tracking-tight">{publicData.name}</h1>
                    <p className="text-[#5B2D7D]/60 text-[10px] font-bold uppercase tracking-widest mt-0.5">Showcase Gallery</p>
                </motion.div>
            </div>
            <div className="flex-1 min-h-0 relative" ref={containerRef}>
                <motion.div
                    className="grid gap-0 absolute top-0 left-0 touch-none origin-top-left"
                    style={{ gridTemplateColumns: `repeat(${gridSize}, ${cellSize.width ? cellSize.width + "px" : "80vw"})`, gridTemplateRows: `repeat(${gridSize}, ${cellSize.height ? cellSize.height + "px" : "65vh"})`, x, y, width: gridSize * (cellSize.width || 0), height: gridSize * (cellSize.height || 0), willChange: "transform", touchAction: "none", perspective: 1000, backfaceVisibility: "hidden", transform: "translate3d(0,0,0)" }}
                    drag dragDirectionLock dragElastic={0.2} dragMomentum={false}
                    onDragStart={() => {
                        const sX = (containerSize.width - cellSize.width) / 2;
                        const sY = (containerSize.height - cellSize.height) / 2 - VISUAL_Y_OFFSET;
                        dragStartRef.current = { col: Math.round((sX - x.get()) / cellSize.width), row: Math.round((sY - y.get()) / cellSize.height) };
                    }}
                    onDragEnd={handleDragEnd}
                >
                    {gridData.map((item, i) => {
                        const r = Math.floor(i / gridSize), c = i % gridSize;
                        if (!item) return <div key={`empty-${i}`} style={{ width: cellSize.width || "80vw", height: cellSize.height || "65vh" }} />;
                        return (
                            <div key={item.id} className="flex items-center justify-center p-1" style={{ width: cellSize.width || "80vw", height: cellSize.height || "65vh" }}>
                                <PublicGridCard item={item} x={x} y={y} row={r} col={c} cellSize={cellSize} containerSize={containerSize} visualYOffset={VISUAL_Y_OFFSET} index={i} onClick={() => { haptics.light(); onItemClick(item); }} />
                            </div>
                        );
                    })}
                    {items.length === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center mb-6">
                                <Sparkles className="w-10 h-10 text-white/40" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">No Memories Yet</h3>
                            <p className="text-white/60 text-sm">Be the first to add a memory to this charm!</p>
                        </div>
                    )}
                </motion.div>
            </div>

            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-3 z-[60] w-full max-w-[320px] px-6 pointer-events-none">
                <button onClick={() => { haptics.medium(); onUnlock(); }} className="flex-1 bg-white/80 backdrop-blur-xl text-[#5B2D7D] py-4 rounded-3xl font-black uppercase tracking-tighter text-xs shadow-2xl border border-[#5B2D7D]/10 active:scale-95 transition-all pointer-events-auto">Unlock dashboard</button>
                {publicData?.enableGuestUploadButton && (
                    <button onClick={() => { haptics.light(); onUpload(); }} className="w-14 h-14 bg-[#5B2D7D] text-white rounded-full shadow-2xl flex items-center justify-center active:scale-95 transition-all shadow-[#5B2D7D]/30 pointer-events-auto">
                        <Upload className="w-6 h-6" />
                    </button>
                )}
                <button onClick={() => { haptics.light(); onCamera(); }} className="w-14 h-14 bg-[#A4C538] text-white rounded-full shadow-2xl flex items-center justify-center active:scale-95 transition-all shadow-[#A4C538]/30 pointer-events-auto"><Camera className="w-6 h-6" /></button>
            </div>
        </div>
    );
}

// --- Main Page ---
function NFCLoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState("Checking security...");
  const [isLoading, setIsLoading] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [ownerInfo, setOwnerInfo] = useState<any>(null);
  const [password, setPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [isUnassigned, setIsUnassigned] = useState(false);
  const [error, setError] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [publicData, setPublicData] = useState<any>(null);
  const [showPublicGallery, setShowPublicGallery] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadPassword, setUploadPassword] = useState("");
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRedirect = useCallback(async (tokenVal: string) => {
      const p = await getProductWithType(tokenVal);
      if (p) {
          router.push(p.type === "LIFE" ? `/life-charm?charmId=${p.id}` : p.type === "HABIT" ? `/habit-charm?charmId=${p.id}` : "/");
      } else router.push("/");
  }, [router]);

  const maskEmail = (e: string) => {
      if (!e) return "";
      const [n, d] = e.split("@");
      return n && d ? `${n.length > 2 ? n.substring(0, 2) : n}***@${d}` : e;
  };

  const performLogin = useCallback(async (t: string) => {
      const r = await signIn("credentials", { token: t, redirect: false });
      if (r?.error) { setStatus("Tag expired."); setIsLoading(false); localStorage.removeItem(`trusted_tag_${t}`); }
      else { setStatus("Success!"); await handleRedirect(t); }
  }, [handleRedirect]);

  const handleVerifyUploadPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!token) return;
      setIsVerifyingPassword(true);
      try {
          const result = await verifyGuestUploadPassword(token, uploadPassword);
          if (result.success) {
              setShowUploadModal(false);
              setUploadPassword("");
              fileInputRef.current?.click();
          } else {
              toast.error(result.error || "Verification failed");
          }
      } catch (error) {
          toast.error("An error occurred during verification");
      } finally {
          setIsVerifyingPassword(false);
      }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !token) return;

      setIsUploading(true);
      const toastId = toast.loading("Uploading your memory...");

      try {
          const sig = await getGuestCloudinarySignature(token);
          if (!sig) throw new Error("Could not get upload signature");

          const formData = new FormData();
          formData.append("file", file);
          formData.append("api_key", sig.apiKey!);
          formData.append("timestamp", sig.timestamp.toString());
          formData.append("signature", sig.signature);
          formData.append("folder", sig.folder);
          formData.append("type", sig.type);

          const response = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`, {
              method: "POST",
              body: formData,
          });

          if (!response.ok) throw new Error("Cloudinary upload failed");
          const data = await response.json();

          const result = await createGuestMemory(token, {
              title: "Guest Upload",
              mediaUrl: data.secure_url,
              mediaType: data.resource_type,
              mediaSize: data.bytes
          });

          if (result.error) throw new Error(result.error);

          toast.success("Memory uploaded successfully!", { id: toastId });
          const pub = await getPublicCharmShowcase(token);
          if (pub) setPublicData(pub);

      } catch (error: any) {
          toast.error(error.message || "Upload failed", { id: toastId });
      } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
      }
  };

  useEffect(() => {
    if (!token) return;

    haptics.nfcTap();
    const init = async () => {
        try {
            const cachedPublicData = localStorage.getItem(`cache_public_showcase_${token}`);
            const cachedOwnerInfo = localStorage.getItem(`cache_owner_info_${token}`);
            
            if (cachedPublicData) {
                setPublicData(JSON.parse(cachedPublicData));
                setShowPublicGallery(true);
                setIsLoading(false);
            }
            
            if (cachedOwnerInfo) {
                const info = JSON.parse(cachedOwnerInfo);
                setOwnerInfo(info);
                if (info.unassigned) setIsUnassigned(true);
                else if (info.setupRequired) setIsSetupMode(true);
                else setNeedsPassword(true);
                setIsLoading(false);
            }

            if (localStorage.getItem(`trusted_tag_${token}`) === "true") {
                await performLogin(token);
                return;
            }

            setTimeout(async () => {
                const pub = await getPublicCharmShowcase(token);
                if (pub) { 
                    setPublicData(pub); 
                    // Show gallery if there are items OR if the upload button is enabled
                    if (pub.items?.length || pub.enableGuestUploadButton) {
                        setShowPublicGallery(true);
                    }
                    localStorage.setItem(`cache_public_showcase_${token}`, JSON.stringify(pub));
                    setIsLoading(false);
                }

                const info = await getProductOwnerInfo(token);
                if (info) {
                    localStorage.setItem(`cache_owner_info_${token}`, JSON.stringify(info));
                    if ('unassigned' in info) { 
                        setIsUnassigned(true); 
                        setOwnerInfo({ name: info.charmName, email: "", unassigned: true }); 
                    } else { 
                        setOwnerInfo(info); 
                        if (info.setupRequired) setIsSetupMode(true); 
                        else setNeedsPassword(true); 
                    }
                    setIsLoading(false);
                } else if (!cachedOwnerInfo) {
                    setStatus("Invalid tag.");
                    setIsLoading(false);
                }
            }, cachedPublicData ? 1000 : 0);
        } catch { 
            if (isLoading) setStatus("Error occurred."); 
            setIsLoading(false); 
        }
    };
    init();
  }, [token, performLogin]);

  const onSetup = async (e: any) => {
      e.preventDefault(); if (!token) return; setIsLoading(true);
      try {
          const r = await completeUserSetup(token, newName, password);
          if (r.error) { setError(r.error); setIsLoading(false); }
          else await onPasswordLogin(e);
      } catch { setError("Setup failed."); setIsLoading(false); }
  };

  const onClaim = async (e: any) => {
      e.preventDefault(); if (!token) return; setIsLoading(true);
      try {
          const r = await claimProduct(token, { email: newEmail, name: newName, password });
          if (r.error) { setError(r.error); setIsLoading(false); }
          else {
              localStorage.setItem(`trusted_tag_${token}`, "true");
              const lr = await signIn("credentials", { email: newEmail, password, redirect: false });
              if (lr?.error) { setError("Login failed."); setIsLoading(false); }
              else await handleRedirect(token);
          }
      } catch { setError("Claim failed."); setIsLoading(false); }
  };

  const onPasswordLogin = async (e: any) => {
      e.preventDefault(); setIsLoading(true);
      const email = ownerInfo?.email || newEmail;
      if (!email && !token) return;
      try {
          const r = await signIn("credentials", { email, password, token, redirect: false });
          if (r?.error) { setError("Incorrect password."); setIsLoading(false); }
          else if (token) { localStorage.setItem(`trusted_tag_${token}`, "true"); await handleRedirect(token); }
      } catch { setError("Login failed."); setIsLoading(false); }
  };

  const handleItemClick = (item: any) => {
      setSelectedItem({ ...item, dataType: item.type, isLiked: true });
      setDrawerOpen(true);
  };

  const renderContent = () => {
    if (!token) return (
      <div className="h-dvh flex items-center justify-center bg-transparent font-[Outfit]">
        <div className="bg-white/40 backdrop-blur-xl p-8 rounded-[32px] shadow-lg max-w-sm w-full text-center border border-white/50">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><Zap className="w-8 h-8 text-red-500" /></div>
          <h2 className="text-xl font-bold text-[#5B2D7D] mb-2">Access Denied</h2>
          <p className="text-[#5B2D7D]/60">No token found.</p>
        </div>
      </div>
    );

    if (isLoading && !needsPassword && !isSetupMode && !isUnassigned) return (
      <div className="h-dvh flex items-center justify-center bg-transparent font-[Outfit]">
          <div className="text-center"><Loader2 className="w-10 h-10 text-[#5B2D7D] animate-spin mx-auto mb-4" /><p className="text-[#5B2D7D] font-medium animate-pulse">{status}</p></div>
      </div>
    );

    if (showPublicGallery && publicData) return (
        <ShowcaseGallery 
            publicData={publicData} 
            onUnlock={() => setShowPublicGallery(false)} 
            onCamera={() => setShowCamera(true)} 
            onUpload={() => setShowUploadModal(true)}
            token={token} 
            onItemClick={handleItemClick} 
        />
    );

    if (isUnassigned && ownerInfo) return (
      <div className="h-dvh flex items-center justify-center bg-transparent font-[Outfit] p-4 text-center">
          <div className="bg-white/60 backdrop-blur-xl p-8 rounded-[32px] shadow-lg max-w-sm w-full border border-white/50 relative overflow-hidden">
              <div className="absolute top-0 right-0"><button onClick={() => setShowCamera(true)} className="bg-[#A4C538] text-white px-4 py-2 rounded-bl-2xl flex items-center gap-2 hover:bg-[#93b132] transition-colors shadow-sm"><Camera className="w-4 h-4" /><span className="text-[10px] font-bold uppercase tracking-wider">Quick Snap</span></button></div>
              <div className="w-16 h-16 bg-[#A4C538]/20 rounded-2xl flex items-center justify-center mx-auto mb-6"><Sparkles className="w-8 h-8 text-[#A4C538]" /></div>
              <h2 className="text-2xl font-bold text-[#5B2D7D] mb-2">Claim Your Charm</h2>
              <p className="text-[#5B2D7D]/60 text-sm mb-8 px-4">This <span className="font-bold text-[#5B2D7D]">{ownerInfo.name}</span> is ready to be yours.</p>
              <form onSubmit={onClaim} className="space-y-4 text-left">
                  <div className="space-y-2"><label className="text-xs font-bold text-[#5B2D7D] ml-1 uppercase tracking-wider">Email</label><input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full bg-white/50 border border-[#5B2D7D]/10 rounded-xl px-4 py-3 text-[#5B2D7D] focus:outline-none focus:ring-2 focus:ring-[#5B2D7D]/20 transition-all" required /></div>
                  <div className="space-y-2"><label className="text-xs font-bold text-[#5B2D7D] ml-1 uppercase tracking-wider">Name</label><input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full bg-white/50 border border-[#5B2D7D]/10 rounded-xl px-4 py-3 text-[#5B2D7D] focus:outline-none focus:ring-2 focus:ring-[#5B2D7D]/20 transition-all" required /></div>
                  <div className="space-y-2"><label className="text-xs font-bold text-[#5B2D7D] ml-1 uppercase tracking-wider">Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white/50 border border-[#5B2D7D]/10 rounded-xl px-4 py-3 text-[#5B2D7D] focus:outline-none focus:ring-2 focus:ring-[#5B2D7D]/20 transition-all" required minLength={6} /></div>
                  {error && <p className="text-red-500 text-xs text-center font-medium bg-red-50 py-2 rounded-lg">{error}</p>}
                  <button type="submit" disabled={isLoading} className="w-full bg-[#A4C538] hover:bg-[#93b132] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 mt-4 disabled:opacity-50">{isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Claim & Start"}<ArrowRight className="w-5 h-5" /></button>
              </form>
          </div>
      </div>
    );

    if (isSetupMode && ownerInfo) return (
      <div className="h-dvh flex items-center justify-center bg-transparent font-[Outfit] p-4 text-center">
          <div className="bg-white/60 backdrop-blur-xl p-8 rounded-[32px] shadow-lg max-w-sm w-full border border-white/50 relative overflow-hidden">
              <div className="absolute top-0 right-0"><button onClick={() => setShowCamera(true)} className="bg-[#A4C538] text-white px-4 py-2 rounded-bl-2xl flex items-center gap-2 hover:bg-[#93b132] transition-colors shadow-sm"><Camera className="w-4 h-4" /><span className="text-[10px] font-bold uppercase tracking-wider">Quick Snap</span></button></div>
              <div className="w-12 h-12 bg-[#E8DCF0] rounded-full flex items-center justify-center mx-auto mb-6 mt-4"><Zap className="w-6 h-6 text-[#5B2D7D]" /></div>
              <h2 className="text-xl font-bold text-[#5B2D7D] text-center mb-2">Welcome!</h2>
              <p className="text-[#5B2D7D]/60 text-center text-sm mb-6">Set up your account for <br/><span className="font-semibold text-[#5B2D7D]">{ownerInfo.email}</span></p>
              <form onSubmit={onSetup} className="space-y-4 text-left">
                  <div className="space-y-2"><label className="text-xs font-bold text-[#5B2D7D] ml-1 uppercase tracking-wider">Name</label><input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full bg-white/50 border border-[#5B2D7D]/10 rounded-xl px-4 py-3 text-[#5B2D7D] placeholder-[#5B2D7D]/30 focus:outline-none focus:ring-2 focus:ring-[#5B2D7D]/20 transition-all" required /></div>
                  <div className="space-y-2"><label className="text-xs font-bold text-[#5B2D7D] ml-1 uppercase tracking-wider">Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white/50 border border-[#5B2D7D]/10 rounded-xl px-4 py-3 text-[#5B2D7D] focus:outline-none focus:ring-2 focus:ring-[#5B2D7D]/20 transition-all" required minLength={6} /></div>
                  {error && <p className="text-red-500 text-xs text-center font-medium bg-red-50 py-2 rounded-lg">{error}</p>}
                  <button type="submit" disabled={isLoading} className="w-full bg-[#5B2D7D] hover:bg-[#4A246A] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">{isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Complete Setup"}<ArrowRight className="w-4 h-4" /></button>
              </form>
          </div>
      </div>
    );

    if (needsPassword && ownerInfo) return (
      <div className="h-dvh flex items-center justify-center bg-transparent font-[Outfit] p-4 text-center">
          <div className="bg-white/60 backdrop-blur-xl p-8 rounded-[32px] shadow-lg max-w-sm w-full border border-white/50 relative overflow-hidden">
              <div className="absolute top-0 right-0"><button onClick={() => setShowCamera(true)} className="bg-[#A4C538] text-white px-4 py-2 rounded-bl-2xl flex items-center gap-2 hover:bg-[#93b132] transition-colors shadow-sm"><Camera className="w-4 h-4" /><span className="text-[10px] font-bold uppercase tracking-wider">Quick Snap</span></button></div>
              <div className="w-12 h-12 bg-[#E8DCF0] rounded-full flex items-center justify-center mx-auto mb-6 mt-4"><Lock className="w-6 h-6 text-[#5B2D7D]" /></div>
              <h2 className="text-xl font-bold text-[#5B2D7D] text-center mb-2">First Time Access</h2>
              <p className="text-[#5B2D7D]/60 text-center text-sm mb-6">Verify ownership for <br/><span className="font-semibold text-[#5B2D7D]">{maskEmail(ownerInfo.email)}</span></p>
              <form onSubmit={onPasswordLogin} className="space-y-4 text-left">
                  <div className="space-y-2"><label className="text-xs font-bold text-[#5B2D7D] ml-1 uppercase tracking-wider">Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white/50 border border-[#5B2D7D]/10 rounded-xl px-4 py-3 text-[#5B2D7D] focus:outline-none focus:ring-2 focus:ring-[#5B2D7D]/20 transition-all" required /></div>
                  {error && <p className="text-red-500 text-xs text-center font-medium bg-red-50 py-2 rounded-lg">{error}</p>}
                  <button type="submit" disabled={isLoading} className="w-full bg-[#5B2D7D] hover:bg-[#4A246A] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">{isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Login"}<ArrowRight className="w-4 h-4" /></button>
              </form>
          </div>
      </div>
    );

    return (
      <div className="h-dvh flex items-center justify-center bg-transparent font-[Outfit]">
        <div className="bg-white/40 backdrop-blur-xl p-8 rounded-[32px] shadow-lg max-w-sm w-full text-center border border-white/50 relative overflow-hidden">
          {token && <div className="absolute top-0 right-0"><button onClick={() => setShowCamera(true)} className="bg-[#A4C538] text-white px-4 py-2 rounded-bl-2xl flex items-center gap-2 hover:bg-[#93b132] transition-colors shadow-sm"><Camera className="w-4 h-4" /><span className="text-[10px] font-bold uppercase tracking-wider">Quick Snap</span></button></div>}
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 mt-4"><Zap className="w-8 h-8 text-red-500" /></div>
          <h2 className="text-xl font-bold text-[#5B2D7D] mb-2">Access Denied</h2>
          <p className="text-[#5B2D7D]/60">{status}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="h-dvh bg-transparent font-[Outfit] relative">
        {renderContent()}

        {/* --- Global Overlays (Rendered outside conditional logic to maintain state) --- */}
        <AnimatePresence>
            {showCamera && token && (
                <div className="fixed inset-0 z-[200]">
                    <CameraCapture 
                        token={token} 
                        onClose={() => setShowCamera(false)} 
                        onSuccess={() => { 
                            setShowCamera(false); 
                            getPublicCharmShowcase(token).then(pub => pub && setPublicData(pub)); 
                        }} 
                    />
                </div>
            )}
        </AnimatePresence>

        <MemoryDrawer 
            memory={selectedItem} 
            open={drawerOpen} 
            onOpenChange={setDrawerOpen} 
            people={[]} 
            readOnly={true} 
            onEdit={() => setShowPublicGallery(false)} 
        />

        {/* Hidden File Input */}
        <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,video/*"
        />

        {/* Upload Password Modal */}
        <AnimatePresence>
            {showUploadModal && (
                <>
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black z-[100]"
                        onClick={() => setShowUploadModal(false)}
                    />
                    <motion.div 
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] p-8 z-[101] max-w-md mx-auto shadow-2xl"
                    >
                        <div className="flex flex-col items-center">
                            <div className="w-12 h-12 bg-[#E8DCF0] rounded-full flex items-center justify-center mb-6">
                                <Lock className="w-6 h-6 text-[#5B2D7D]" />
                            </div>
                            <h2 className="text-xl font-bold text-[#5B2D7D] mb-2">Upload Protected</h2>
                            <p className="text-[#5B2D7D]/60 text-sm mb-6 text-center">Please enter the charm password to upload images.</p>
                            
                            <form onSubmit={handleVerifyUploadPassword} className="w-full space-y-4">
                                <input 
                                    type="password" 
                                    value={uploadPassword}
                                    onChange={(e) => setUploadPassword(e.target.value)}
                                    placeholder="Enter password..."
                                    className="w-full bg-[#FFF9F6] border border-[#EADDDE] rounded-2xl px-6 py-4 text-[#5B2D7D] focus:outline-none focus:ring-2 focus:ring-[#5B2D7D]/20 transition-all text-center text-lg tracking-widest"
                                    autoFocus
                                />
                                <div className="flex gap-3">
                                    <button 
                                        type="button"
                                        onClick={() => setShowUploadModal(false)}
                                        className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-bold uppercase tracking-tighter text-xs"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={isVerifyingPassword}
                                        className="flex-[2] bg-[#5B2D7D] text-white py-4 rounded-2xl font-bold uppercase tracking-tighter text-xs flex items-center justify-center gap-2"
                                    >
                                        {isVerifyingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    </div>
  );
}

export default function NFCLoginPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <NFCLoginContent />
        </Suspense>
    )
}

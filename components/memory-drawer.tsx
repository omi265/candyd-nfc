"use client";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { useRouter } from "next/navigation";
import { useRef, useState, useEffect, useTransition } from "react";
import { toggleMemoryLike } from "@/app/actions/memories";
import { toggleExperienceLike } from "@/app/actions/life-charm";
import { toast } from "sonner";
import { Edit2, Heart, Plus, Image as ImageIcon, Play, Loader2, Upload, MapPin, User, Sparkles, Users, Info, X } from "lucide-react";
import AudioPlayer from "@/app/components/AudioPlayer";
import { getOptimizedUrl } from "@/lib/media-helper";
import Image from "next/image";
import { motion, AnimatePresence as MotionAnimatePresence } from "framer-motion";

interface MemoryDrawerProps {
    memory: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    people?: any[];
    onEdit?: () => void;
    readOnly?: boolean;
}

export function MemoryDrawer({ memory, open, onOpenChange, people = [], onEdit, readOnly = false }: MemoryDrawerProps) {
    const router = useRouter();
    const [isLiked, setIsLiked] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (memory) {
            setIsLiked(!!memory.isLiked);
        }
    }, [memory]);

    if (!memory) return null;

    const dateStr = new Date(memory.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const hasMedia = memory.media && memory.media.length > 0;

    // Resolve people
    const taggedPeople = memory.peopleIds 
        ? memory.peopleIds.map((id: string) => people.find(p => p.id === id)?.name).filter(Boolean)
        : [];

    const handleEdit = () => {
        if (onEdit) {
            onEdit();
        } else {
            router.push(`/memory/${memory.id}`);
        }
    };

    const handleLike = () => {
        if (readOnly) return;
        const wasLiked = isLiked;
        setIsLiked(!wasLiked); // Optimistic update

        startTransition(async () => {
            let result;
            if (memory.dataType === 'life_item') {
                 result = await toggleExperienceLike(memory.id);
            } else {
                 result = await toggleMemoryLike(memory.id);
            }

            if (result.error) {
                setIsLiked(wasLiked); // Revert
                toast.error(result.error);
            }
        });
    };

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="bg-[#F6F2EC]/45 backdrop-blur-xl border-t border-white/30 max-h-[96vh] h-full rounded-t-[32px] font-[Outfit]">
                
                 <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
                    <DrawerHeader className="p-0">
                         <DrawerTitle className="sr-only">{memory.title || "Memory Details"}</DrawerTitle>
                         <DrawerDescription className="sr-only">Details of your memory</DrawerDescription>

                         {/* Header Content */}
                         <div className="pt-6 px-6 pb-4 flex items-start justify-between">
                             <div className="flex-1 pr-4">
                                 <h1 className="text-[#556B5A] text-3xl font-bold leading-tight mb-2">{memory.title || "Untitled Memory"}</h1>
                                 <p className="text-[#556B5A]/80 text-sm leading-relaxed max-h-24 overflow-y-auto">{memory.description}</p>
                                 
                                   <div className="flex flex-wrap gap-2 mt-4">
                                    <div className="bg-[#D4C3D8]/40 px-3 py-1.5 rounded-lg text-[#556B5A] text-xs font-bold">
                                        {dateStr}
                                    </div>
                                    {memory.location && (
                                        <div className="bg-[#E6DED1] px-3 py-1.5 rounded-lg text-[#556B5A] text-xs font-bold flex items-center gap-1.5">
                                            <MapPin className="w-3 h-3" />
                                            {memory.location}
                                        </div>
                                    )}
                                    {memory.events && Array.isArray(memory.events) && memory.events.map((event: string, i: number) => (
                                        <div key={`event-${i}`} className="bg-[#E6DED1] px-3 py-1.5 rounded-lg text-[#556B5A] text-xs font-bold flex items-center gap-1.5">
                                            <Sparkles className="w-3 h-3" />
                                            {event}
                                        </div>
                                    ))}
                                    {taggedPeople.length > 0 && (
                                        <div className="bg-[#E6DED1] px-3 py-1.5 rounded-lg text-[#556B5A] text-xs font-bold flex items-center gap-1.5">
                                            <Users className="w-3 h-3" />
                                            {taggedPeople.join(", ")}
                                        </div>
                                    )}
                                 </div>
                             </div>
                             <div className="flex gap-3 shrink-0">
                                 {!readOnly && (
                                     <button onClick={handleEdit} className="w-12 h-12 rounded-full bg-[#E6DED1] flex items-center justify-center hover:bg-[#D4C3D8] transition-colors">
                                         <Edit2 className="w-6 h-6 text-[#556B5A]" />
                                     </button>
                                 )}
                                 
                                 <div className="relative">
                                    <button 
                                        onClick={handleLike}
                                        disabled={readOnly}
                                        className={`w-12 h-12 rounded-full border flex items-center justify-center transition-colors ${
                                            isLiked 
                                            ? "bg-[#F37B55] border-[#F37B55]" 
                                            : "bg-[#FFF5F0] border-[#E6DED1]"
                                        } ${readOnly ? "opacity-50 grayscale cursor-default" : ""}`}
                                    >
                                        <Heart className={`w-6 h-6 ${isLiked ? "text-white fill-white" : "text-[#F37B55]"}`} />
                                    </button>

                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowInfo(!showInfo);
                                        }}
                                        className="absolute -top-2 -right-2 w-8 h-8 bg-white border-2 border-[#E6DED1] rounded-full flex items-center justify-center shadow-md text-[#556B5A] hover:bg-gray-50 transition-all z-20 active:scale-90"
                                    >
                                        <Info className="w-4 h-4" />
                                    </button>

                                    <MotionAnimatePresence>
                                        {showInfo && (
                                            <>
                                                {/* Backdrop to close when clicking outside */}
                                                <motion.div 
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    onClick={() => setShowInfo(false)}
                                                    className="fixed inset-0 z-40 bg-black/5"
                                                />
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                                    className="absolute top-full right-0 mt-3 w-64 p-4 bg-white border-2 border-[#E6DED1] rounded-2xl shadow-2xl z-50 text-[12px] leading-relaxed text-[#556B5A]"
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="font-bold text-sm text-[#556B5A]">Feature This Memory</span>
                                                        <button onClick={() => setShowInfo(false)} className="p-1 -mr-1 hover:bg-gray-100 rounded-full transition-colors">
                                                            <X className="w-4 h-4 text-[#556B5A]/40" />
                                                        </button>
                                                    </div>
                                                    <p className="font-medium">
                                                        Liking a memory adds it to your **Public Showcase**. 
                                                    </p>
                                                    <p className="mt-2 text-[#556B5A]/70">
                                                        Anyone who scans your physical charm will see your featured memories first!
                                                    </p>
                                                    <div className="absolute bottom-full right-5 w-4 h-4 bg-white border-l-2 border-t-2 border-[#E6DED1] rotate-45 -mb-2.5" />
                                                </motion.div>
                                            </>
                                        )}
                                    </MotionAnimatePresence>
                                 </div>
                             </div>
                         </div>
                    </DrawerHeader>

                     {/* Media List */}
                     <div className="px-6 mt-4 space-y-6">
                        {hasMedia ? (
                            memory.media.map((media: any) => (
                                <div key={media.id} className="relative group">
                                    {media.type.startsWith('image') && (
                                        <div className="bg-white p-3 rounded-[32px] shadow-sm">
                                            <div className="relative aspect-square rounded-[24px] overflow-hidden bg-[#F6F2EC]">
                                                <Image 
                                                    src={getOptimizedUrl(media.url, 'image', 600)} 
                                                    alt="Memory" 
                                                    fill
                                                    className="object-cover" 
                                                    sizes="(max-width: 768px) 100vw, 600px"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {media.type.startsWith('video') && (
                                        <div className="bg-white p-3 rounded-[32px] shadow-sm">
                                            <div className="relative aspect-square rounded-[24px] overflow-hidden bg-black">
                                                <video 
                                                    src={getOptimizedUrl(media.url, 'video', 600)} 
                                                    className="w-full h-full object-cover" 
                                                    controls 
                                                    preload="metadata"
                                                    poster={media.posterUrl}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {media.type.startsWith('audio') && (
                                        <div className="bg-[#FFF5F0] p-4 rounded-[24px] shadow-sm border border-[#E6DED1]">
                                             <AudioPlayer src={media.url} className="w-full p-0! shadow-none bg-transparent!" />
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="w-full aspect-square rounded-[32px] bg-[#FFF5F0] border-2 border-dashed border-[#E6DED1] flex flex-col items-center justify-center text-[#A68CAB] gap-2">
                                <ImageIcon className="w-6 h-6" />
                                <span className="text-xs font-medium">No media added yet</span>
                            </div>
                        )}
                     </div>

                     <DrawerFooter className="px-6 mt-6 pb-8">
                         {!readOnly ? (
                            <button 
                                onClick={handleEdit}
                                className="w-full bg-[#7C9A86] py-4 rounded-full flex items-center justify-center gap-2 text-[#556B5A] font-bold text-sm shadow-lg hover:bg-[#95b330] transition-colors"
                            >
                                Edit Memory <Plus className="w-4 h-4 text-[#556B5A]" />
                            </button>
                         ) : (
                            <button 
                                onClick={() => onOpenChange(false)}
                                className="w-full bg-[#556B5A] py-4 rounded-full flex items-center justify-center gap-2 text-white font-bold text-sm shadow-lg hover:bg-[#4a2466] transition-colors"
                            >
                                Close
                            </button>
                         )}
                     </DrawerFooter>
                 </div>
            </DrawerContent>
        </Drawer>
    )
}

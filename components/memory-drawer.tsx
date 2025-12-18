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

// --- Icons (reused) ---
import { Edit2, Heart, Plus, Image as ImageIcon, Play } from "lucide-react";
import AudioPlayer from "@/app/components/AudioPlayer";


interface MemoryDrawerProps {
    memory: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isGuest?: boolean;
}

export function MemoryDrawer({ memory, open, onOpenChange, isGuest = false }: MemoryDrawerProps) {
    const router = useRouter();

    if (!memory) return null;

    const dateStr = new Date(memory.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const hasMedia = memory.media && memory.media.length > 0;
    const featuredMedia = hasMedia ? memory.media[0] : null;

    const handleEdit = () => {
        // Navigate to edit page
        router.push(`/memory/${memory.id}`);
    };

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="bg-[#FDF2EC]/45 backdrop-blur-xl border-t border-white/30 max-h-[96vh] h-full rounded-t-[32px] font-[Outfit]">
                
                 <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
                    <DrawerHeader className="p-0">
                         <DrawerTitle className="sr-only">{memory.title || "Memory Details"}</DrawerTitle>
                         <DrawerDescription className="sr-only">Details of your memory</DrawerDescription>

                         {/* Header Content */}
                         <div className="pt-6 px-6 pb-4 flex items-start justify-between">
                             <div className="flex-1 pr-4">
                                 <h1 className="text-[#5B2D7D] text-3xl font-bold leading-tight mb-2">{memory.title || "Untitled Memory"}</h1>
                                 <p className="text-[#5B2D7D]/80 text-sm leading-relaxed max-h-24 overflow-y-auto">{memory.description}</p>
                                 
                                 <div className="flex flex-wrap gap-2 mt-4">
                                    <div className="bg-[#D4C3D8]/40 px-3 py-1.5 rounded-lg text-[#5B2D7D] text-xs font-bold">
                                        {dateStr}
                                    </div>
                                    {memory.location && (
                                        <div className="bg-[#EADDDE] px-3 py-1.5 rounded-lg text-[#5B2D7D] text-xs font-bold">
                                            {memory.location}
                                        </div>
                                    )}
                                 </div>
                             </div>
                             <div className="flex gap-3 shrink-0">
                                 {!isGuest && (
                                     <button onClick={handleEdit} className="w-12 h-12 rounded-full bg-[#EADDDE] flex items-center justify-center hover:bg-[#D4C3D8] transition-colors">
                                         <Edit2 className="w-6 h-6 text-[#5B2D7D]" />
                                     </button>
                                 )}
                                 <button className="w-12 h-12 rounded-full bg-[#FFF5F0] border border-[#EADDDE] flex items-center justify-center">
                                     <Heart className="w-6 h-6 text-[#F37B55]" />
                                 </button>
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
                                            <div className="relative aspect-square rounded-[24px] overflow-hidden bg-[#FDF2EC]">
                                                <img 
                                                    src={media.url} 
                                                    alt="Memory" 
                                                    className="w-full h-full object-cover" 
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {media.type.startsWith('video') && (
                                        <div className="bg-white p-3 rounded-[32px] shadow-sm">
                                            <div className="relative aspect-square rounded-[24px] overflow-hidden bg-[#000]">
                                                <video 
                                                    src={media.url} 
                                                    className="w-full h-full object-cover" 
                                                    controls 
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {media.type.startsWith('audio') && (
                                        <div className="bg-[#FFF5F0] p-4 rounded-[24px] shadow-sm border border-[#EADDDE]">
                                             <AudioPlayer src={media.url} className="w-full p-0! shadow-none bg-transparent!" />
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="w-full aspect-square rounded-[32px] bg-[#FFF5F0] border-2 border-dashed border-[#EADDDE] flex flex-col items-center justify-center text-[#A68CAB] gap-2">
                                <ImageIcon className="w-6 h-6" />
                                <span className="text-xs font-medium">No media added yet</span>
                            </div>
                        )}
                     </div>

                     <DrawerFooter className="px-6 mt-6 pb-8">
                         {/* 'Add' Button (simplified as per design) */}
                         {!isGuest && (
                             <button 
                                onClick={handleEdit}
                                className="w-full bg-[#A4C538] py-4 rounded-full flex items-center justify-center gap-2 text-[#5B2D7D] font-bold text-sm shadow-lg hover:bg-[#95b330] transition-colors"
                            >
                                 Edit Memory <Plus className="w-4 h-4 text-[#5B2D7D]" />
                             </button>
                         )}
                     </DrawerFooter>
                 </div>
            </DrawerContent>
        </Drawer>
    )
}

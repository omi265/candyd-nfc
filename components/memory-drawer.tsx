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
import { useRef, useState } from "react";
import { addGuestMedia } from "@/app/actions/guest";
import { getCloudinarySignature } from "@/app/actions/upload";
import { toast } from "sonner";
import { Edit2, Heart, Plus, Image as ImageIcon, Play, Loader2, Upload, MapPin, User, Sparkles } from "lucide-react";
import AudioPlayer from "@/app/components/AudioPlayer";
import { getOptimizedUrl } from "@/lib/media-helper";

interface MemoryDrawerProps {
    memory: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isGuest?: boolean;
    guestToken?: string;
}

export function MemoryDrawer({ memory, open, onOpenChange, isGuest = false, guestToken }: MemoryDrawerProps) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    if (!memory) return null;

    const dateStr = new Date(memory.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const hasMedia = memory.media && memory.media.length > 0;

    const handleEdit = () => {
        router.push(`/memory/${memory.id}`);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        setIsUploading(true);
        const files = Array.from(e.target.files);
        const uploadedMedia: { url: string; type: string; size: number }[] = [];

        try {
            // 1. Upload to Cloudinary
            const signatureData = await getCloudinarySignature();
            const { signature, timestamp, folder, cloudName, apiKey } = signatureData;

            for (const file of files) {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("api_key", apiKey!);
                formData.append("timestamp", timestamp.toString());
                formData.append("signature", signature);
                formData.append("folder", folder);

                const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
                    method: "POST",
                    body: formData,
                });

                if (!response.ok) throw new Error("Upload failed");
                const data = await response.json();
                
                uploadedMedia.push({
                    url: data.secure_url,
                    type: file.type.startsWith('audio') ? 'audio' : data.resource_type,
                    size: data.bytes
                });
            }

            // 2. Save to DB via Server Action
            const result = await addGuestMedia(memory.id, uploadedMedia, guestToken);

            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Media added successfully!");
                // Close drawer or refresh? Drawer usually updates if parent updates.
                // We should probably close it to see the refresh or keep it open if the parent re-renders and passes new memory prop.
                // Since we used revalidatePath in action, the parent page will refresh.
                // However, the 'memory' prop here is likely from a list.
                // If the parent list refreshes, this drawer might close or update.
                // Let's keep it simple:
                onOpenChange(false); 
                router.refresh();
            }
        } catch (error) {
            console.error("Upload error", error);
            toast.error("Failed to upload media");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
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
                                        <div className="bg-[#EADDDE] px-3 py-1.5 rounded-lg text-[#5B2D7D] text-xs font-bold flex items-center gap-1.5">
                                            <MapPin className="w-3 h-3" />
                                            {memory.location}
                                        </div>
                                    )}
                                    {(memory.isGuest || memory.guestName) && (
                                        <div className="bg-[#EADDDE] px-3 py-1.5 rounded-lg text-[#5B2D7D] text-xs font-bold flex items-center gap-1.5">
                                            <User className="w-3 h-3" />
                                            By {memory.guestName || "Guest"}
                                        </div>
                                    )}
                                    {memory.events && Array.isArray(memory.events) && memory.events.map((event: string, i: number) => (
                                        <div key={`event-${i}`} className="bg-[#EADDDE] px-3 py-1.5 rounded-lg text-[#5B2D7D] text-xs font-bold flex items-center gap-1.5">
                                            <Sparkles className="w-3 h-3" />
                                            {event}
                                        </div>
                                    ))}
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
                                                    src={getOptimizedUrl(media.url, 'image', 600)} 
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
                                                    src={getOptimizedUrl(media.url, 'video', 600)} 
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
                         {!isGuest ? (
                             <button 
                                onClick={handleEdit}
                                className="w-full bg-[#A4C538] py-4 rounded-full flex items-center justify-center gap-2 text-[#5B2D7D] font-bold text-sm shadow-lg hover:bg-[#95b330] transition-colors"
                            >
                                 Edit Memory <Plus className="w-4 h-4 text-[#5B2D7D]" />
                            </button>
                         ) : (
                            <>
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="w-full bg-[#F37B55] py-4 rounded-full flex items-center justify-center gap-2 text-white font-bold text-sm shadow-lg hover:bg-[#e06a45] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                     {isUploading ? (
                                        <>Uploading <Loader2 className="w-4 h-4 animate-spin" /></>
                                     ) : (
                                        <>Add Media <Upload className="w-4 h-4" /></>
                                     )}
                                </button>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    multiple 
                                    accept="image/*,video/*,audio/*"
                                    onChange={handleFileUpload}
                                />
                            </>
                         )}
                     </DrawerFooter>
                 </div>
            </DrawerContent>
        </Drawer>
    )
}

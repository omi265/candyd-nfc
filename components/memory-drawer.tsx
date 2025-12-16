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
function EditIcon() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22H15C20 22 22 20 22 15V13" stroke="#5B2D7D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16.04 3.02001L8.16 10.9C7.86 11.2 7.56 11.79 7.5 12.22L7.07 15.23C6.91 16.32 7.68 17.08 8.77 16.93L11.78 16.5C12.2 16.44 12.79 16.14 13.09 15.84L20.97 7.96001C22.34 6.59001 22.98 5.00001 20.97 2.99001C18.96 0.980011 17.38 1.62001 16.04 3.02001Z" stroke="#5B2D7D" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    )
}

function HeartIcon() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12.62 20.81C12.28 20.93 11.72 20.93 11.38 20.81C8.48 19.82 2 15.69 2 8.68998C2 5.59998 4.49 3.09998 7.56 3.09998C9.38 3.09998 10.99 3.97998 12 5.33998C13.01 3.97998 14.63 3.09998 16.44 3.09998 16.44 3.09998 19.51 3.09998 22 5.59998 22 8.68998C22 15.69 15.52 19.82 12.62 20.81Z" stroke="#F37B55" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    )
}

function PlusIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 12H18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 18V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
function ImageIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth="2"/><circle cx="8.5" cy="8.5" r="1.5" strokeWidth="2"/><polyline points="21 15 16 10 5 21" strokeWidth="2"/></svg>; }


interface MemoryDrawerProps {
    memory: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function MemoryDrawer({ memory, open, onOpenChange }: MemoryDrawerProps) {
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
            <DrawerContent className="bg-[#FDF2EC]/85 backdrop-blur-xl border-t border-white/30 max-h-[96vh] h-full rounded-t-[32px] font-[Outfit]">
                
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
                                 <button onClick={handleEdit} className="w-12 h-12 rounded-full bg-[#EADDDE] flex items-center justify-center hover:bg-[#D4C3D8] transition-colors">
                                     <EditIcon />
                                 </button>
                                 <button className="w-12 h-12 rounded-full bg-[#FFF5F0] border border-[#EADDDE] flex items-center justify-center">
                                     <HeartIcon />
                                 </button>
                             </div>
                         </div>
                    </DrawerHeader>

                     {/* Media Section */}
                     <div className="px-6 mt-2">
                         <div className="w-full aspect-square rounded-[32px] overflow-hidden bg-[#FFF5F0] relative shadow-inner flex items-center justify-center">
                            {featuredMedia ? (
                                featuredMedia.type.startsWith('video') ? (
                                    <video src={featuredMedia.url} className="w-full h-full object-cover" controls />
                                ) : (
                                    <img src={featuredMedia.url} alt="Memory" className="w-full h-full object-cover" />
                                )
                            ) : (
                                <div className="flex flex-col items-center justify-center text-[#A68CAB] gap-2 p-10 text-center">
                                    <ImageIcon />
                                    <span className="text-xs font-medium">No media added yet</span>
                                </div>
                            )}
                         </div>
                     </div>

                     <DrawerFooter className="px-6 mt-6">
                        <div className="bg-[#EADDDE]/40 rounded-[32px] p-6 text-center space-y-4 backdrop-blur-sm border border-white/50 shadow-sm">
                             <div>
                                 <h3 className="text-[#5B2D7D] text-lg font-bold">Add to this <span className="italic">beautiful memory</span>!</h3>
                                 <p className="text-[#5B2D7D]/70 text-xs mt-1">Add other types of media like audio, video and text.</p>
                             </div>
                             
                             <button 
                                onClick={handleEdit}
                                className="w-full bg-[#A4C538] py-4 rounded-full flex items-center justify-center gap-2 text-[#5B2D7D] font-bold text-sm shadow-lg hover:bg-[#95b330] transition-colors"
                            >
                                 Add more media <PlusIcon />
                             </button>
                         </div>
                     </DrawerFooter>
                 </div>
            </DrawerContent>
        </Drawer>
    )
}

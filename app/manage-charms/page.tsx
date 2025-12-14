"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { getUserProducts } from "@/app/actions/memories";

// --- Icons ---
function BackIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 12H5" stroke="#22005D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 19L5 12L12 5" stroke="#22005D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function MenuIcon() {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 12H21" stroke="#5B2D7D" strokeWidth="2" strokeLinecap="round"/>
        <path d="M3 6H21" stroke="#5B2D7D" strokeWidth="2" strokeLinecap="round"/>
        <path d="M3 18H21" stroke="#5B2D7D" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    );
}

function CloudDownloadIcon() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
             <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="#5B2D7D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
             <path d="M7 10L12 15L17 10" stroke="#5B2D7D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
             <path d="M12 15V3" stroke="#5B2D7D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    )
}

function TrashIcon() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 6H21" stroke="#F44336" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M19 6V20C19 21 18 22 17 22H7C6 22 5 21 5 20V6" stroke="#F44336" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 6V4C8 3 9 2 10 2H14C15 2 16 3 16 4V6" stroke="#F44336" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="10" y1="11" x2="10" y2="17" stroke="#F44336" strokeWidth="2" strokeLinecap="round"/>
            <line x1="14" y1="11" x2="14" y2="17" stroke="#F44336" strokeWidth="2" strokeLinecap="round"/>
        </svg>
    )
}

function ChevronRightIcon() {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 18L15 12L9 6" stroke="#5B2D7D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
}

function ChevronRightRedIcon() {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 18L15 12L9 6" stroke="#F44336" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
}

function WarningIcon() {
    return (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#F44336" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 8V12" stroke="#F44336" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 16H12.01" stroke="#F44336" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    )
}

function CloseIcon() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18" stroke="#3E1C56" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6 6L18 18" stroke="#3E1C56" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    )
}

function ImageIcon() {
    return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5B2D7D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
}

function NfcIcon() {
    return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5B2D7D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16a2 2 0 0 0 2-2V12a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/><path d="M12 15v2"/></svg>
}

function UsersIcon() {
    return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5B2D7D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}


export default function ManageCharmsPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [products, setProducts] = useState<any[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteInput, setDeleteInput] = useState("");

    useEffect(() => {
        async function loadProducts() {
            if(!user) return;
            const prods = await getUserProducts();
            setProducts(prods);
            if (prods.length > 0) {
                setSelectedProduct(prods[0]);
            }
        }
        loadProducts();
    }, [user]);

    // Mock constants for UI
    const MEMORY_USED = 50;
    const MEMORY_TOTAL = 50;

    return (
        <div className="min-h-screen bg-[#FDF2EC] font-[Outfit] pb-12 relative">
             {/* Header */}
             <header className="flex items-center justify-between px-6 py-6">
                <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center -ml-2">
                    <BackIcon />
                </button>
                <div />
                <button className="w-10 h-10 flex items-center justify-center bg-[#FDF2EC] rounded-full shadow-sm border border-[#EADDDE]">
                   <MenuIcon />
                </button>
            </header>

            <main className="px-6">
                {/* Product Badge */}
                <div className="inline-block bg-[#D6CDE3] rounded-lg px-4 py-1 text-[#5B2D7D] text-sm font-medium mb-4">
                    {selectedProduct ? selectedProduct.name : "Charm XYZ"}
                </div>

                <h1 className="text-3xl font-bold mb-8 text-[#3E1C56]">Charm settings</h1>

                {/* Memory Usage Card */}
                <div className="bg-[#FFF9F6] rounded-[32px] p-6 mb-8 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-baseline gap-1">
                            <span className="text-5xl font-bold text-[#3E1C56]">100%</span>
                            <span className="text-[#9A92A6]">Memory used</span>
                        </div>
                        <button className="bg-[#C2D647] text-[#3E1C56] px-4 py-2 rounded-full font-semibold text-sm hover:bg-[#b0c43d] transition-colors">
                            Upgrade plan
                        </button>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="h-6 w-full bg-[#A2D5EA] rounded-full mb-4 relative overflow-hidden">
                        <div className="absolute top-0 left-0 h-full w-full bg-[#A2D5EA]" />
                        {/* If we had partial usage, we would adjust width. Here 100% */}
                    </div>

                    <p className="text-[#9A92A6] text-lg font-medium">{MEMORY_USED} of {MEMORY_TOTAL} memories used</p>
                    <p className="text-[#D6CDE3] text-sm mt-4 text-center">Plan valid until 14 June 2026</p>
                </div>


                {/* Actions */}
                <div className="space-y-6">
                    <div>
                        <button className="w-full bg-[#FFF9F6] rounded-2xl p-4 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-4">
                                <CloudDownloadIcon />
                                <span className="text-[#3E1C56] text-lg font-medium">Download data</span>
                            </div>
                            <ChevronRightIcon />
                        </button>
                        <p className="text-[#9A92A6] text-sm mt-3 px-1 leading-relaxed">
                            Backup all the media uploaded to this charm to your phone
                        </p>
                    </div>

                    <div className="h-px bg-[#EADDDE] w-full" />

                    <div>
                        <button 
                            onClick={() => setIsDeleteModalOpen(true)}
                            className="w-full bg-[#FFF9F6] rounded-2xl p-4 flex items-center justify-between shadow-sm"
                        >
                            <div className="flex items-center gap-4">
                                <TrashIcon />
                                <span className="text-[#F44336] text-lg font-medium">Delete Charm</span>
                            </div>
                            <ChevronRightRedIcon />
                        </button>
                        <p className="text-[#9A92A6] text-sm mt-3 px-1 leading-relaxed">
                            Warning: This will delete all shared memories for this charm.
                        </p>
                    </div>
                </div>

            </main>

            {/* Delete Modal */}
            <AnimatePresence>
                {isDeleteModalOpen && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black z-40"
                            onClick={() => setIsDeleteModalOpen(false)}
                        />
                        <motion.div 
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] p-8 z-50 h-[90vh] overflow-y-auto"
                        >
                             <div className="relative flex flex-col items-center">
                                {/* Close Button */}
                                <button 
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    className="absolute right-0 top-0"
                                >
                                    <CloseIcon />
                                </button>
                                
                                {/* Icon */}
                                <div className="w-24 h-24 rounded-full bg-[#FFE5E5] flex items-center justify-center mb-6 mt-4">
                                    <WarningIcon />
                                </div>

                                <h2 className="text-[#9A92A6] text-sm mb-2 self-start w-full">
                                    {selectedProduct ? selectedProduct.name : "Charm XYZ"}
                                </h2>
                                <h3 className="text-[#3E1C56] text-3xl font-bold mb-4 self-start w-full leading-tight">
                                    Unpair & Delete Charm Data
                                </h3>

                                <div className="w-full mb-6">
                                    <h4 className="text-[#9A92A6] font-bold mb-4">What you will lose:</h4>
                                    
                                    <div className="space-y-3">
                                        <div className="bg-[#FFF9F6] border border-[#EADDDE] rounded-2xl p-4 flex gap-4 items-center">
                                            <div className="w-10 h-10 bg-[#EAE0F0] rounded-lg flex items-center justify-center shrink-0">
                                                <ImageIcon />
                                            </div>
                                            <p className="text-[#9A92A6] text-sm">Every memory, photo, and story linked to this specific charm.</p>
                                        </div>

                                        <div className="bg-[#FFF9F6] border border-[#EADDDE] rounded-2xl p-4 flex gap-4 items-center">
                                            <div className="w-10 h-10 bg-[#EAE0F0] rounded-lg flex items-center justify-center shrink-0">
                                                <NfcIcon />
                                            </div>
                                            <p className="text-[#9A92A6] text-sm">The ability to tap the physical {selectedProduct ? selectedProduct.name : "Charm XYZ"} to access any data.</p>
                                        </div>

                                        <div className="bg-[#FFF9F6] border border-[#EADDDE] rounded-2xl p-4 flex gap-4 items-center">
                                            <div className="w-10 h-10 bg-[#EAE0F0] rounded-lg flex items-center justify-center shrink-0">
                                                <UsersIcon />
                                            </div>
                                            <p className="text-[#9A92A6] text-sm">
                                                All members who have access to this charm <span className="font-bold text-[#3E1C56]">[User 1], [User 2], and 3 others</span> will immediately lose access to its memories.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="w-full bg-[#FFE5E5] rounded-xl p-4 mb-8 text-center text-[#F44336] text-sm">
                                    The data cannot be recovered by you or any shared user.
                                </div>

                                <div className="w-full h-px bg-[#EADDDE] mb-6" />

                                <div className="w-full mb-6">
                                    <label className="block text-[#3E1C56] font-bold text-lg mb-4">Confirmation</label>
                                    <input 
                                        type="text" 
                                        value={deleteInput}
                                        onChange={(e) => setDeleteInput(e.target.value)}
                                        placeholder="Type the word delete to proceed"
                                        className="w-full bg-[#FFF9F6] border border-[#EADDDE] rounded-xl px-4 py-4 text-[#3E1C56] focus:outline-none focus:border-[#F44336]"
                                    />
                                </div>

                                <button 
                                    className={`w-full py-4 rounded-full font-bold text-white text-lg transition-colors ${deleteInput.toLowerCase() === 'delete' ? 'bg-[#F44336] hover:bg-[#d63a2f]' : 'bg-[#F44336] opacity-50 cursor-not-allowed'}`}
                                    disabled={deleteInput.toLowerCase() !== 'delete'}
                                >
                                    Delete Charm
                                </button>
                                
                                <button 
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    className="text-[#3E1C56] font-bold text-lg mt-6"
                                >
                                    Go back
                                </button>
                             </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { getUserProducts, deleteProduct } from "@/app/actions/memories";

// --- Icons ---
import { 
    ChevronLeft, 
    Menu, 
    CloudDownload, 
    Trash2, 
    ChevronRight, 
    AlertTriangle, 
    X,
    Image as ImageIcon,
    Nfc,
    Users
} from "lucide-react";


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

    const handleDeleteCharm = async () => {
        if (!selectedProduct) return;
        
        try {
            const result = await deleteProduct(selectedProduct.id);
            if (result.error) {
                console.error(result.error);
                // toast.error(result.error); // No toast imported?
            } else {
                router.push("/"); 
                // revalidatePath handled in action
            }
        } catch (e) {
            console.error(e);
        }
        setIsDeleteModalOpen(false);
    };

    // Mock constants for UI
    const MEMORY_USED = 50;
    const MEMORY_TOTAL = 50;

    return (
        <div className="min-h-screen bg-[#FDF2EC] font-[Outfit] pb-12 relative">
             {/* Header */}
             <header className="flex items-center justify-between px-6 py-6">
                <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center -ml-2">
                    <ChevronLeft className="w-6 h-6 text-[#22005D]" />
                </button>
                <div />
                <button className="w-10 h-10 flex items-center justify-center bg-[#FDF2EC] rounded-full shadow-sm border border-[#EADDDE]">
                   <Menu className="w-6 h-6 text-[#5B2D7D]" />
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
                                <CloudDownload className="w-6 h-6 text-[#5B2D7D]" />
                                <span className="text-[#3E1C56] text-lg font-medium">Download data</span>
                            </div>
                            <ChevronRight className="w-6 h-6 text-[#5B2D7D]" />
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
                                <Trash2 className="w-6 h-6 text-[#F44336]" />
                                <span className="text-[#F44336] text-lg font-medium">Delete Charm</span>
                            </div>
                            <ChevronRight className="w-6 h-6 text-[#F44336]" />
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
                                    <X className="w-6 h-6 text-[#3E1C56]" />
                                </button>
                                
                                {/* Icon */}
                                <div className="w-24 h-24 rounded-full bg-[#FFE5E5] flex items-center justify-center mb-6 mt-4">
                                    <AlertTriangle className="w-12 h-12 text-[#F44336]" />
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
                                                <ImageIcon className="w-6 h-6 text-[#5B2D7D]" />
                                            </div>
                                            <p className="text-[#9A92A6] text-sm">Every memory, photo, and story linked to this specific charm.</p>
                                        </div>

                                        <div className="bg-[#FFF9F6] border border-[#EADDDE] rounded-2xl p-4 flex gap-4 items-center">
                                            <div className="w-10 h-10 bg-[#EAE0F0] rounded-lg flex items-center justify-center shrink-0">
                                                <Nfc className="w-6 h-6 text-[#5B2D7D]" />
                                            </div>
                                            <p className="text-[#9A92A6] text-sm">The ability to tap the physical {selectedProduct ? selectedProduct.name : "Charm XYZ"} to access any data.</p>
                                        </div>

                                        <div className="bg-[#FFF9F6] border border-[#EADDDE] rounded-2xl p-4 flex gap-4 items-center">
                                            <div className="w-10 h-10 bg-[#EAE0F0] rounded-lg flex items-center justify-center shrink-0">
                                                <Users className="w-6 h-6 text-[#5B2D7D]" />
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
                                    onClick={handleDeleteCharm}
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

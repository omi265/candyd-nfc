"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { getManageCharmProducts, deleteProduct, getCharmStats, updateProductGuestUploads } from "@/app/actions/memories";
import { updateGuestUploadSettings } from "@/app/actions/life-charm";

import { ShareButton } from "@/components/ui/ShareButton";

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
    Users,
    Sparkles,
    ShieldCheck,
    Heart,
    Upload,
    Lock,
    Share2
} from "lucide-react";


export default function ManageCharmsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentCharmId = searchParams.get('charmId');
    const { user } = useAuth();
    const [products, setProducts] = useState<any[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteInput, setDeleteInput] = useState("");
    const [guestPassword, setGuestPassword] = useState("");

    // Stats state
    const [stats, setStats] = useState<{ memoryCount: number, totalSizeBytes: number, limit: number } | null>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(false);

    // Byte formatter
    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    useEffect(() => {
        async function loadProducts() {
            if(!user) return;
            const prods = await getManageCharmProducts();
            setProducts(prods);
            
            if (prods.length > 0) {
                const initialProduct = currentCharmId 
                    ? prods.find(p => p.id === currentCharmId) || prods[0]
                    : prods[0];
                setSelectedProduct(initialProduct);
            }
        }
        loadProducts();
    }, [user, currentCharmId]);

    useEffect(() => {
        if (!selectedProduct?.id) return;
        setGuestPassword(selectedProduct.guestUploadPassword || "");
        
        async function loadStats() {
            setIsLoadingStats(true);
            const data = await getCharmStats(selectedProduct.id);
            if (data && 'memoryCount' in data) {
                setStats(data as any);
            }
            setIsLoadingStats(false);
        }
        loadStats();
    }, [selectedProduct]);

    const handleCharmSelect = (product: any) => {
        setSelectedProduct(product);
        const params = new URLSearchParams(searchParams.toString());
        params.set('charmId', product.id);
        router.replace(`/manage-charms?${params.toString()}`);
    };

    const handleToggleGuestUploads = async () => {
        if (!selectedProduct) return;
        const newValue = !selectedProduct.allowGuestUploads;
        
        // Optimistic update
        setSelectedProduct({ ...selectedProduct, allowGuestUploads: newValue });
        setProducts(products.map(p => p.id === selectedProduct.id ? { ...p, allowGuestUploads: newValue } : p));

        try {
            const result = await updateProductGuestUploads(selectedProduct.id, newValue);
            if (result.error) {
                // Revert
                setSelectedProduct({ ...selectedProduct, allowGuestUploads: !newValue });
                setProducts(products.map(p => p.id === selectedProduct.id ? { ...p, allowGuestUploads: !newValue } : p));
                console.error(result.error);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleUpdateSettings = async (settings: any) => {
        if (!selectedProduct) return;
        
        // Optimistic update
        setSelectedProduct({ ...selectedProduct, ...settings });
        setProducts(products.map(p => p.id === selectedProduct.id ? { ...p, ...settings } : p));

        try {
            const result = await updateGuestUploadSettings(selectedProduct.id, settings);
            if (result.error) {
                // Revert
                const revertSettings: any = {};
                Object.keys(settings).forEach(key => {
                    revertSettings[key] = selectedProduct[key];
                });
                setSelectedProduct({ ...selectedProduct, ...revertSettings });
                setProducts(products.map(p => p.id === selectedProduct.id ? { ...p, ...revertSettings } : p));
                console.error(result.error);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handlePasswordBlur = () => {
        if (guestPassword !== selectedProduct?.guestUploadPassword) {
            handleUpdateSettings({ guestUploadPassword: guestPassword });
        }
    };

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

    const percentUsed = stats ? Math.min(Math.round((stats.memoryCount / stats.limit) * 100), 100) : 0;

    return (
        <div className="min-h-screen bg-transparent  pb-12 relative">
            <main className="px-6">
                {/* Charm Selector */}
                <div className="mb-8 w-full overflow-hidden">
                    <p className="text-[#9A92A6] text-xs font-bold uppercase tracking-wider mb-3 ml-1">Your Charms</p>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 px-1 snap-x snap-mandatory">
                        {products.map((product) => (
                            <div key={product.id} className="flex-shrink-0 flex items-center gap-1 bg-white border border-[#E6DED1] rounded-xl transition-all hover:border-[#556B5A]/30 p-1 pr-2 snap-start">
                                <button
                                    onClick={() => handleCharmSelect(product)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                                        selectedProduct?.id === product.id
                                            ? "bg-[#556B5A] text-white shadow-md shadow-[#556B5A]/20"
                                            : "bg-transparent text-[#556B5A]"
                                    }`}
                                >
                                    <Sparkles className={`w-4 h-4 ${selectedProduct?.id === product.id ? "text-white" : "text-[#556B5A]"}`} />
                                    <span className="font-medium text-sm whitespace-nowrap">{product.name}</span>
                                </button>
                                <div className="w-px h-6 bg-[#E6DED1]" />
                                <ShareButton token={product.token} charmName={product.name} variant="icon" />
                            </div>
                        ))}
                    </div>
                </div>

                <h1 className="text-3xl font-bold mb-8 text-[#3A4B3E]">Charm settings</h1>

                {/* Memory Usage Card */}
                <div className="bg-[#FFF9F6] rounded-[32px] p-6 mb-8 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-baseline gap-1">
                            <span className="text-5xl font-bold text-[#3A4B3E]">
                                {isLoadingStats ? "..." : `${percentUsed}%`}
                            </span>
                            <span className="text-[#9A92A6]">Memory used</span>
                        </div>
                        <button className="bg-[#C2D647] text-[#3A4B3E] px-4 py-2 rounded-full font-semibold text-sm hover:bg-[#b0c43d] transition-colors">
                            Upgrade plan
                        </button>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="h-6 w-full bg-[#E6DED1] rounded-full mb-4 relative overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percentUsed}%` }}
                            className="absolute top-0 left-0 h-full bg-[#A2D5EA]" 
                        />
                    </div>

                    <p className="text-[#9A92A6] text-lg font-medium">
                        {isLoadingStats ? "Calculating..." : `${stats?.memoryCount || 0} of ${stats?.limit || 50} memories used`}
                    </p>
                    <p className="text-[#9A92A6] text-sm mt-1">
                        {isLoadingStats ? "" : `Total storage: ${formatSize(stats?.totalSizeBytes || 0)}`}
                    </p>
                    <p className="text-[#D6CDE3] text-sm mt-4 text-center">Plan valid until 14 June 2026</p>
                </div>


                {/* Actions */}
                <div className="space-y-6">
                    <div>
                        <div className="bg-[#FFF9F6] rounded-2xl p-4 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-4">
                                <ShieldCheck className="w-6 h-6 text-[#556B5A]" />
                                <span className="text-[#3A4B3E] text-lg font-medium">Guest access</span>
                            </div>
                            <button 
                                onClick={handleToggleGuestUploads}
                                className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ${selectedProduct?.allowGuestUploads ? 'bg-[#D6CDE3]' : 'bg-gray-200'}`}
                            >
                                <motion.div 
                                    className="w-5 h-5 bg-white rounded-full shadow-sm"
                                    animate={{ x: selectedProduct?.allowGuestUploads ? 20 : 0 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                />
                            </button>
                        </div>
                        <p className="text-[#9A92A6] text-sm mt-3 px-1 leading-relaxed">
                            When enabled, anyone who scans this charm can upload a memory instantly.
                        </p>
                    </div>

                    <div className="h-px bg-[#E6DED1] w-full" />

                    <div>
                        <div className="bg-[#FFF9F6] rounded-2xl p-4 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-4">
                                <Heart className="w-6 h-6 text-[#556B5A]" />
                                <span className="text-[#3A4B3E] text-lg font-medium">Auto-Approve</span>
                            </div>
                            <button 
                                onClick={() => handleUpdateSettings({ autoApproveGuestUploads: !selectedProduct?.autoApproveGuestUploads })}
                                className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ${selectedProduct?.autoApproveGuestUploads ? 'bg-[#D6CDE3]' : 'bg-gray-200'}`}
                            >
                                <motion.div 
                                    className="w-5 h-5 bg-white rounded-full shadow-sm"
                                    animate={{ x: selectedProduct?.autoApproveGuestUploads ? 20 : 0 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                />
                            </button>
                        </div>
                        <p className="text-[#9A92A6] text-sm mt-3 px-1 leading-relaxed">
                            When enabled, guest uploads are automatically liked and shown in the public showcase.
                        </p>
                    </div>

                    <div className="h-px bg-[#E6DED1] w-full" />

                    <div>
                        <div className="bg-[#FFF9F6] rounded-2xl p-4 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-4">
                                <Upload className="w-6 h-6 text-[#556B5A]" />
                                <span className="text-[#3A4B3E] text-lg font-medium">Upload Button</span>
                            </div>
                            <button 
                                onClick={() => handleUpdateSettings({ enableGuestUploadButton: !selectedProduct?.enableGuestUploadButton })}
                                className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ${selectedProduct?.enableGuestUploadButton ? 'bg-[#D6CDE3]' : 'bg-gray-200'}`}
                            >
                                <motion.div 
                                    className="w-5 h-5 bg-white rounded-full shadow-sm"
                                    animate={{ x: selectedProduct?.enableGuestUploadButton ? 20 : 0 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                />
                            </button>
                        </div>
                        <p className="text-[#9A92A6] text-sm mt-3 px-1 leading-relaxed">
                            When enabled, a file upload button appears on the public gallery page.
                        </p>

                        <AnimatePresence>
                            {selectedProduct?.enableGuestUploadButton && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="mt-4 overflow-hidden"
                                >
                                    <div className="bg-[#FFF9F6] rounded-2xl p-4 shadow-sm border border-[#E6DED1]">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Lock className="w-4 h-4 text-[#556B5A]" />
                                            <span className="text-sm font-bold text-[#556B5A] uppercase tracking-wider">Upload Password</span>
                                        </div>
                                        <input 
                                            type="text" 
                                            value={guestPassword}
                                            onChange={(e) => setGuestPassword(e.target.value)}
                                            onBlur={handlePasswordBlur}
                                            placeholder="Set a password for guests..."
                                            className="w-full bg-white border border-[#E6DED1] rounded-xl px-4 py-3 text-[#556B5A] focus:outline-none focus:ring-2 focus:ring-[#556B5A]/20 transition-all"
                                        />
                                        <p className="text-[#9A92A6] text-[10px] mt-2 italic px-1">
                                            Guests must enter this password to use the upload button.
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="h-px bg-[#E6DED1] w-full" />

                    <div>
                        <div className="bg-[#FFF9F6] rounded-2xl p-4 shadow-sm">
                            <div className="flex items-center gap-4 mb-4">
                                <Share2 className="w-6 h-6 text-[#556B5A]" />
                                <span className="text-[#3A4B3E] text-lg font-medium">Share Charm</span>
                            </div>
                            <ShareButton 
                                token={selectedProduct?.token} 
                                charmName={selectedProduct?.name} 
                                variant="full" 
                            />
                        </div>
                        <p className="text-[#9A92A6] text-sm mt-3 px-1 leading-relaxed">
                            Share this link with others so they can view your showcase or upload memories.
                        </p>
                    </div>

                    <div className="h-px bg-[#E6DED1] w-full" />

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
                                    <X className="w-6 h-6 text-[#3A4B3E]" />
                                </button>
                                
                                {/* Icon */}
                                <div className="w-24 h-24 rounded-full bg-[#FFE5E5] flex items-center justify-center mb-6 mt-4">
                                    <AlertTriangle className="w-12 h-12 text-[#F44336]" />
                                </div>

                                <h2 className="text-[#9A92A6] text-sm mb-2 self-start w-full">
                                    {selectedProduct ? selectedProduct.name : "Charm XYZ"}
                                </h2>
                                <h3 className="text-[#3A4B3E] text-3xl font-bold mb-4 self-start w-full leading-tight">
                                    Unpair & Delete Charm Data
                                </h3>

                                <div className="w-full mb-6">
                                    <h4 className="text-[#9A92A6] font-bold mb-4">What you will lose:</h4>
                                    
                                    <div className="space-y-3">
                                        <div className="bg-[#FFF9F6] border border-[#E6DED1] rounded-2xl p-4 flex gap-4 items-center">
                                            <div className="w-10 h-10 bg-[#EAE0F0] rounded-lg flex items-center justify-center shrink-0">
                                                <ImageIcon className="w-6 h-6 text-[#556B5A]" />
                                            </div>
                                            <p className="text-[#9A92A6] text-sm">Every memory, photo, and story linked to this specific charm.</p>
                                        </div>

                                        <div className="bg-[#FFF9F6] border border-[#E6DED1] rounded-2xl p-4 flex gap-4 items-center">
                                            <div className="w-10 h-10 bg-[#EAE0F0] rounded-lg flex items-center justify-center shrink-0">
                                                <Nfc className="w-6 h-6 text-[#556B5A]" />
                                            </div>
                                            <p className="text-[#9A92A6] text-sm">The ability to tap the physical {selectedProduct ? selectedProduct.name : "Charm XYZ"} to access any data.</p>
                                        </div>

                                        <div className="bg-[#FFF9F6] border border-[#E6DED1] rounded-2xl p-4 flex gap-4 items-center">
                                            <div className="w-10 h-10 bg-[#EAE0F0] rounded-lg flex items-center justify-center shrink-0">
                                                <Users className="w-6 h-6 text-[#556B5A]" />
                                            </div>
                                            <p className="text-[#9A92A6] text-sm">
                                                All members who have access to this charm <span className="font-bold text-[#3A4B3E]">[User 1], [User 2], and 3 others</span> will immediately lose access to its memories.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="w-full bg-[#FFE5E5] rounded-xl p-4 mb-8 text-center text-[#F44336] text-sm">
                                    The data cannot be recovered by you or any shared user.
                                </div>

                                <div className="w-full h-px bg-[#E6DED1] mb-6" />

                                <div className="w-full mb-6">
                                    <label className="block text-[#3A4B3E] font-bold text-lg mb-4">Confirmation</label>
                                    <input 
                                        type="text" 
                                        value={deleteInput}
                                        onChange={(e) => setDeleteInput(e.target.value)}
                                        placeholder="Type the word delete to proceed"
                                        className="w-full bg-[#FFF9F6] border border-[#E6DED1] rounded-xl px-4 py-4 text-[#3A4B3E] focus:outline-none focus:border-[#F44336]"
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
                                    className="text-[#3A4B3E] font-bold text-lg mt-6"
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

"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

import { 
    ChevronLeft, 
    Menu, 
    Trash2, 
    ChevronRight, 
    AlertTriangle, 
    CloudDownload, 
    X,
} from "lucide-react";


export default function AccountSettingsPage() {
    const router = useRouter();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[#FDF2EC] font-[Outfit] text-[#5B2D7D] relative">
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
                <h1 className="text-3xl font-bold mb-2 text-[#3E1C56]">Account settings</h1>
                <p className="text-[#9A92A6] text-sm mb-8">Manage your account</p>

                {/* Delete Profile Button */}
                <button 
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="w-full bg-[#FFF9F6] rounded-3xl p-4 flex items-center gap-4 shadow-sm"
                >
                    <div className="w-12 h-12 rounded-full bg-[#FFE5E5] flex items-center justify-center">
                        <Trash2 className="w-6 h-6 text-[#F44336]" />
                    </div>
                    <div className="text-left flex-1">
                        <h3 className="text-[#F44336] font-medium text-lg">Delete profile</h3>
                        <p className="text-[#9A92A6] text-xs">You will lose access to all the charms added to this profile</p>
                    </div>
                     <ChevronRight className="w-6 h-6 text-[#F44336]" />
                </button>
            </main>
            
            {/* Delete Modal Overlay */}
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
                            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] p-8 z-50 h-[85vh] overflow-y-auto"
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

                                <h2 className="text-[#9A92A6] text-sm mb-2 self-start w-full">Deleting your profile</h2>
                                <h3 className="text-[#3E1C56] text-3xl font-bold mb-4 self-start w-full">Close account</h3>
                                <p className="text-[#9A92A6] mb-8 leading-relaxed">
                                    We're sorry to see you go. Closing your account is permanent and cannot be undone.
                                </p>

                                {/* Download Data Card */}
                                <div className="w-full bg-[#f3edf7] rounded-3xl p-6 mb-8 text-center">
                                    <h4 className="text-[#3E1C56] font-bold text-lg mb-2">Want to <span className="italic">save your files</span> first?</h4>
                                    <p className="text-[#9A92A6] text-sm mb-6 px-4">
                                        Before you go, we recommend downloading your memory library to your phone.
                                    </p>
                                    <button className="w-full bg-[#C2D647] text-[#3E1C56] font-semibold py-4 rounded-full flex items-center justify-center gap-2 hover:bg-[#b0c43d] transition-colors">
                                        <CloudDownload className="w-6 h-6 text-[#3E1C56]" />
                                        Download data
                                    </button>
                                </div>

                                <button className="text-[#F44336] font-semibold text-lg mb-6">
                                    Proceed to Delete
                                </button>
                                
                                <button 
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    className="text-[#3E1C56] font-bold text-lg"
                                >
                                    Go back
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}

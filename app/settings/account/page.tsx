"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

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

function CloudDownloadIcon() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
             <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="#5B2D7D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
             <path d="M7 10L12 15L17 10" stroke="#5B2D7D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
             <path d="M12 15V3" stroke="#5B2D7D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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


export default function AccountSettingsPage() {
    const router = useRouter();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[#FDF2EC] font-[Outfit] text-[#5B2D7D] relative">
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
                <h1 className="text-3xl font-bold mb-2 text-[#3E1C56]">Account settings</h1>
                <p className="text-[#9A92A6] text-sm mb-8">Manage your account</p>

                {/* Delete Profile Button */}
                <button 
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="w-full bg-[#FFF9F6] rounded-3xl p-4 flex items-center gap-4 shadow-sm"
                >
                    <div className="w-12 h-12 rounded-full bg-[#FFE5E5] flex items-center justify-center">
                        <TrashIcon />
                    </div>
                    <div className="text-left flex-1">
                        <h3 className="text-[#F44336] font-medium text-lg">Delete profile</h3>
                        <p className="text-[#9A92A6] text-xs">You will lose access to all the charms added to this profile</p>
                    </div>
                     <ChevronRightIcon />
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
                                    <CloseIcon />
                                </button>
                                
                                {/* Icon */}
                                <div className="w-24 h-24 rounded-full bg-[#FFE5E5] flex items-center justify-center mb-6 mt-4">
                                    <WarningIcon />
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
                                        <CloudDownloadIcon />
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

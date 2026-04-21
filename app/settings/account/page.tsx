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
    Loader2,
    Lock,
    Eye,
    EyeOff
} from "lucide-react";


import { deleteAccount, changePassword } from "@/app/actions/auth";
import { toast } from "sonner";


export default function AccountSettingsPage() {
    const router = useRouter();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Password change state
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [showPasswords, setShowPasswords] = useState({ current: false, new: false });

    const handleDelete = async () => {
        if (!confirm("Are you absolutely sure you want to delete your account? This action cannot be undone.")) return;
        
        setIsDeleting(true);
        try {
            const result = await deleteAccount();
            if (result?.success) {
                toast.success("Account deleted successfully");
                router.push("/login");
            } else {
                toast.error(result?.error || "Failed to delete account");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setIsDeleting(false);
        }
    }

    const handleExport = async () => {
        setIsExporting(true);
        toast.info("Preparing your data archive...");
        
        try {
            // Trigger download via window.location for simplicity with the ZIP stream
            window.location.href = "/api/user/export";
            
            // Wait a bit before resetting state as the browser handles the download
            setTimeout(() => {
                setIsExporting(false);
                toast.success("Export started!");
            }, 2000);
        } catch (error) {
            console.error("Export failed:", error);
            toast.error("Failed to start download");
            setIsExporting(false);
        }
    }

    const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsChangingPassword(true);
        const formData = new FormData(e.currentTarget);
        
        try {
            const result = await changePassword(null, formData);
            if (result?.success) {
                toast.success("Password changed successfully");
                setIsPasswordModalOpen(false);
                (e.target as HTMLFormElement).reset();
            } else {
                toast.error(result?.error || "Failed to change password");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setIsChangingPassword(false);
        }
    }

    return (
        <div className="min-h-screen bg-transparent font-[Outfit] text-[#5B2D7D] relative">
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

                <div className="space-y-4">
                    {/* Change Password Button */}
                    <button 
                        onClick={() => setIsPasswordModalOpen(true)}
                        className="w-full bg-[#FFF9F6] rounded-3xl p-4 flex items-center gap-4 shadow-sm text-left"
                    >
                        <div className="w-12 h-12 rounded-full bg-[#E8DCF0] flex items-center justify-center">
                            <Lock className="w-6 h-6 text-[#5B2D7D]" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-[#5B2D7D] font-medium text-lg">Change password</h3>
                            <p className="text-[#9A92A6] text-xs">Update your security credentials</p>
                        </div>
                        <ChevronRight className="w-6 h-6 text-[#5B2D7D]" />
                    </button>

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
                </div>
            </main>
            
            {/* Change Password Modal Overlay */}
            <AnimatePresence>
                {isPasswordModalOpen && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black z-40"
                            onClick={() => !isChangingPassword && setIsPasswordModalOpen(false)}
                        />
                        <motion.div 
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] p-8 z-50 h-[85vh] overflow-y-auto"
                        >
                            <div className="relative flex flex-col">
                                {/* Close Button */}
                                <button 
                                    onClick={() => !isChangingPassword && setIsPasswordModalOpen(false)}
                                    className="absolute right-0 top-0 disabled:opacity-50"
                                    disabled={isChangingPassword}
                                >
                                    <X className="w-6 h-6 text-[#3E1C56]" />
                                </button>
                                
                                <h2 className="text-[#9A92A6] text-sm mb-2">Security</h2>
                                <h3 className="text-[#3E1C56] text-3xl font-bold mb-8">Change password</h3>

                                <form onSubmit={handleChangePassword} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-[#5B2D7D] ml-1 uppercase tracking-wider">Current Password</label>
                                        <div className="relative">
                                            <input 
                                                name="currentPassword"
                                                type={showPasswords.current ? "text" : "password"}
                                                className="w-full bg-[#FDF2EC]/50 border border-[#5B2D7D]/10 rounded-2xl px-5 py-4 text-[#5B2D7D] focus:outline-none focus:ring-2 focus:ring-[#5B2D7D]/20"
                                                placeholder="••••••••"
                                                required
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => setShowPasswords(p => ({ ...p, current: !p.current }))}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5B2D7D]/40"
                                            >
                                                {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-[#5B2D7D] ml-1 uppercase tracking-wider">New Password</label>
                                        <div className="relative">
                                            <input 
                                                name="newPassword"
                                                type={showPasswords.new ? "text" : "password"}
                                                className="w-full bg-[#FDF2EC]/50 border border-[#5B2D7D]/10 rounded-2xl px-5 py-4 text-[#5B2D7D] focus:outline-none focus:ring-2 focus:ring-[#5B2D7D]/20"
                                                placeholder="••••••••"
                                                required
                                                minLength={6}
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => setShowPasswords(p => ({ ...p, new: !p.new }))}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5B2D7D]/40"
                                            >
                                                {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-[#5B2D7D] ml-1 uppercase tracking-wider">Confirm New Password</label>
                                        <input 
                                            name="confirmPassword"
                                            type={showPasswords.new ? "text" : "password"}
                                            className="w-full bg-[#FDF2EC]/50 border border-[#5B2D7D]/10 rounded-2xl px-5 py-4 text-[#5B2D7D] focus:outline-none focus:ring-2 focus:ring-[#5B2D7D]/20"
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>

                                    <button 
                                        type="submit"
                                        disabled={isChangingPassword}
                                        className="w-full bg-[#5B2D7D] text-white font-bold py-5 rounded-full shadow-lg shadow-[#5B2D7D]/20 flex items-center justify-center gap-2 hover:bg-[#4a2466] transition-all disabled:opacity-50 mt-4"
                                    >
                                        {isChangingPassword ? <Loader2 className="w-6 h-6 animate-spin" /> : "Update Password"}
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Delete Modal Overlay */}
            <AnimatePresence>
                {isDeleteModalOpen && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black z-40"
                            onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
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
                                    onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
                                    className="absolute right-0 top-0 disabled:opacity-50"
                                    disabled={isDeleting}
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
                                    We&apos;re sorry to see you go. Closing your account is permanent and cannot be undone.
                                </p>

                                {/* Download Data Card */}
                                <div className="w-full bg-[#f3edf7] rounded-3xl p-6 mb-8 text-center">
                                    <h4 className="text-[#3E1C56] font-bold text-lg mb-2">Want to <span className="italic">save your files</span> first?</h4>
                                    <p className="text-[#9A92A6] text-sm mb-6 px-4">
                                        Before you go, we recommend downloading your memory library to your phone.
                                    </p>
                                    <button 
                                        onClick={handleExport}
                                        disabled={isExporting}
                                        className="w-full bg-[#C2D647] text-[#3E1C56] font-semibold py-4 rounded-full flex items-center justify-center gap-2 hover:bg-[#b0c43d] transition-colors disabled:opacity-50"
                                    >
                                        {isExporting ? <Loader2 className="w-6 h-6 animate-spin" /> : <CloudDownload className="w-6 h-6 text-[#3E1C56]" />}
                                        {isExporting ? "Preparing..." : "Download data"}
                                    </button>
                                </div>

                                <button 
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="text-[#F44336] font-semibold text-lg mb-6 flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isDeleting && <Loader2 className="w-5 h-5 animate-spin" />}
                                    Proceed to Delete
                                </button>
                                
                                <button 
                                    onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
                                    className="text-[#3E1C56] font-bold text-lg disabled:opacity-50"
                                    disabled={isDeleting}
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

"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { logout } from "@/app/actions/auth";

// --- Icons ---

import { ChevronLeft, Menu, User, ChevronRight, Sliders, Lock, FileText, LogOut } from "lucide-react";

// --- Components ---

function MenuItem({ icon, label, onClick, isLink = false, href = "#", showToggle = false, isToggleOn = false, onToggle }: any) {
    const content = (
        <div className="flex items-center justify-between py-4 cursor-pointer" onClick={!isLink && !showToggle ? onClick : undefined}>
            <div className="flex items-center gap-4">
                {icon}
                <span className="text-[#556B5A] font-medium text-base">{label}</span>
            </div>
            {showToggle ? (
                 <div 
                    onClick={(e) => {
                        e.preventDefault();
                        onToggle && onToggle();
                    }}
                    className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ${isToggleOn ? 'bg-[#D6CDE3]' : 'bg-gray-200'}`}
                 >
                     <motion.div 
                        className="w-5 h-5 bg-white rounded-full shadow-sm"
                        animate={{ x: isToggleOn ? 20 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                     />
                 </div>
            ) : (
                <ChevronRight className="w-5 h-5 text-[#556B5A]" />
            )}
        </div>
    );

    if (isLink) {
        return <Link href={href} className="block">{content}</Link>;
    }
    return content;
}

export default function SettingsPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await logout();
        router.push("/login");
    }

    if (isLoading) return <div className="min-h-screen bg-transparent flex items-center justify-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-transparent ">
            <main className="px-6 pb-12">
                <h1 className="text-[#3A4B3E] text-3xl font-bold mb-8">Settings</h1>

                {/* Profile Card */}
                <div className="bg-[#FFF9F6] rounded-3xl p-4 flex items-center gap-4 mb-8 shadow-sm">
                    <div className="w-16 h-16 rounded-full bg-[#E6DED1] flex items-center justify-center text-2xl font-bold text-[#556B5A] overflow-hidden">
                        {/* Avatar Placeholder */}
                         <User className="w-8 h-8 text-[#9A92A6]" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-[#3A4B3E] font-semibold text-lg">{user?.name || "User"}</h2>
                        <Link href="/settings/profile" className="text-[#9A92A6] text-sm flex items-center gap-1">
                            Edit Profile <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>

                {/* Manage Section */}
                <div className="mb-8">
                    <h3 className="text-[#3A4B3E] font-semibold text-lg mb-4">Manage</h3>
                    <div className="bg-[#FFF9F6] rounded-3xl px-6 py-2 shadow-sm">
                        <MenuItem 
                            icon={<Sliders className="w-6 h-6 text-[#556B5A]" />} 
                            label="Account Settings" 
                            isLink 
                            href="/settings/account" 
                        />
                    </div>
                </div>

                {/* Help & Support Section */}
                <div className="mb-8">
                    <h3 className="text-[#3A4B3E] font-semibold text-lg mb-4">Help & Support</h3>
                    <div className="bg-[#FFF9F6] rounded-3xl px-6 py-2 shadow-sm space-y-0">
                        <MenuItem 
                            icon={<Lock className="w-6 h-6 text-[#556B5A]" />} 
                            label="Privacy policy" 
                            isLink
                            href="/help/privacy"
                        />
                         <div className="h-px bg-[#E6DED1] w-full" />
                        <MenuItem 
                            icon={<FileText className="w-6 h-6 text-[#556B5A]" />} 
                            label="Terms and conditions" 
                            isLink
                            href="/help/terms"
                        />
                    </div>
                </div>

                {/* Logout */}
                <div className="bg-[#FFF9F6] rounded-3xl px-6 py-2 shadow-sm">
                     <button onClick={handleLogout} className="w-full flex items-center gap-4 py-4 text-[#F44336] font-medium">
                        <LogOut className="w-6 h-6 text-[#F44336]" />
                        <span>Log out</span>
                        <div className="ml-auto">
                           <ChevronRight className="w-5 h-5" />
                        </div>
                     </button>
                </div>

            </main>
        </div>
    );
}

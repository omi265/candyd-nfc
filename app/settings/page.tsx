"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { useState } from "react";
import { logout } from "@/app/actions/auth";

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

function ProfileIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 21C20 19.6044 20 18.9067 19.8278 18.3389C19.44 17.0605 18.4395 16.06 17.1611 15.6722C16.5933 15.5 15.8956 15.5 14.5 15.5H9.5C8.10444 15.5 7.40665 15.5 6.83886 15.6722C5.56045 16.06 4.56004 17.0605 4.17224 18.3389C4 18.9067 4 19.6044 4 21" stroke="#9A92A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="9" r="4" stroke="#9A92A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 18L15 12L9 6" stroke="#5B2D7D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function NotificationIcon() {
  return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.02 2.90991C8.70997 2.90991 6.01997 5.59991 6.01997 8.90991V11.7999C6.01997 12.4099 5.75997 13.3399 5.45997 13.8599L4.29997 15.7999C3.58997 16.9899 4.07997 18.4899 5.37997 18.4899H18.65C19.96 18.4899 20.44 16.9899 19.73 15.7999L18.57 13.8599C18.28 13.3399 18.02 12.4099 18.02 11.7999V8.90991C18.02 5.60991 15.32 2.90991 12.02 2.90991Z" stroke="#5B2D7D" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round"/>
        <path d="M13.87 3.19994C13.56 3.10994 13.24 3.03994 12.91 2.99994C11.95 2.87994 11.03 2.94994 10.17 3.19994C10.46 2.45994 11.18 1.93994 12.02 1.93994C12.86 1.93994 13.58 2.45994 13.87 3.19994Z" stroke="#5B2D7D" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M15.02 19C15.02 20.65 13.67 22 12.02 22C10.37 22 9.02002 20.65 9.02002 19" stroke="#5B2D7D" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
  )
}

function SettingsSlidersIcon() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 7H4" stroke="#5B2D7D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M15 12H9" stroke="#5B2D7D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M17 17H7" stroke="#5B2D7D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="8" cy="7" r="2" fill="#FDF2EC" stroke="#5B2D7D" strokeWidth="2"/>
            <circle cx="16" cy="17" r="2" fill="#FDF2EC" stroke="#5B2D7D" strokeWidth="2"/>
            <circle cx="12" cy="12" r="2" fill="#FDF2EC" stroke="#5B2D7D" strokeWidth="2"/>
        </svg>
    )
}

function PrivacyIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5B2D7D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="8" r="3"/><path d="M12 11v3"/></svg> }
function TermsIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5B2D7D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> }
function FAQIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5B2D7D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> }
function ChatIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5B2D7D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg> }
function LogoutIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F44336" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> }

// --- Components ---

function MenuItem({ icon, label, onClick, isLink = false, href = "#", showToggle = false, isToggleOn = false, onToggle }: any) {
    const content = (
        <div className="flex items-center justify-between py-4 cursor-pointer" onClick={!isLink && !showToggle ? onClick : undefined}>
            <div className="flex items-center gap-4">
                {icon}
                <span className="text-[#5B2D7D] font-medium text-base">{label}</span>
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
                <ChevronRightIcon />
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
    const [pushNotifications, setPushNotifications] = useState(false);

    const handleLogout = async () => {
        await logout();
        router.push("/login");
    }

    if (isLoading) return <div className="min-h-screen bg-[#FDF2EC] flex items-center justify-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-[#FDF2EC] font-[Outfit]">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-6">
                <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center -ml-2">
                    <BackIcon />
                </button>
                <button className="w-10 h-10 flex items-center justify-center bg-[#FDF2EC] rounded-full shadow-sm border border-[#EADDDE]">
                   <MenuIcon />
                </button>
            </header>

            <main className="px-6 pb-12">
                <h1 className="text-[#3E1C56] text-3xl font-bold mb-8">Settings</h1>

                {/* Profile Card */}
                <div className="bg-[#FFF9F6] rounded-3xl p-4 flex items-center gap-4 mb-8 shadow-sm">
                    <div className="w-16 h-16 rounded-full bg-[#EADDDE] flex items-center justify-center text-2xl font-bold text-[#5B2D7D] overflow-hidden">
                        {/* Avatar Placeholder */}
                         <ProfileIcon />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-[#3E1C56] font-semibold text-lg">{user?.name || "User"}</h2>
                        <Link href="/settings/profile" className="text-[#9A92A6] text-sm flex items-center gap-1">
                            Edit Profile <ChevronRightIcon />
                        </Link>
                    </div>
                </div>

                {/* Manage Section */}
                <div className="mb-8">
                    <h3 className="text-[#3E1C56] font-semibold text-lg mb-4">Manage</h3>
                    <div className="bg-[#FFF9F6] rounded-3xl px-6 py-2 shadow-sm">
                        <MenuItem 
                            icon={<SettingsSlidersIcon />} 
                            label="Account Settings" 
                            isLink 
                            href="/settings/account" 
                        />
                        <div className="h-px bg-[#EADDDE] w-full" />
                        <MenuItem 
                            icon={<NotificationIcon />} 
                            label="Push Notifications" 
                            showToggle 
                            isToggleOn={pushNotifications}
                            onToggle={() => setPushNotifications(!pushNotifications)}
                        />
                    </div>
                    <p className="text-[#9A92A6] text-xs mt-3 px-4 leading-relaxed">
                        We recommend keeping your notifications on to stay updated
                    </p>
                </div>

                {/* Help & Support Section */}
                <div className="mb-8">
                    <h3 className="text-[#3E1C56] font-semibold text-lg mb-4">Help & Support</h3>
                    <div className="bg-[#FFF9F6] rounded-3xl px-6 py-2 shadow-sm space-y-0">
                        <MenuItem icon={<PrivacyIcon />} label="Privacy policy" />
                         <div className="h-px bg-[#EADDDE] w-full" />
                        <MenuItem icon={<TermsIcon />} label="Terms and conditions" />
                         <div className="h-px bg-[#EADDDE] w-full" />
                        <MenuItem icon={<FAQIcon />} label="FAQs" />
                         <div className="h-px bg-[#EADDDE] w-full" />
                        <MenuItem icon={<ChatIcon />} label="Chat Support" />
                    </div>
                </div>

                {/* Logout */}
                <div className="bg-[#FFF9F6] rounded-3xl px-6 py-2 shadow-sm">
                     <button onClick={handleLogout} className="w-full flex items-center gap-4 py-4 text-[#F44336] font-medium">
                        <LogoutIcon />
                        <span>Log out</span>
                        <div className="ml-auto">
                           <ChevronRightIcon />
                        </div>
                     </button>
                </div>

            </main>
        </div>
    );
}

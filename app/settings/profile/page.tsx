"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateProfile } from "@/app/actions/auth"; // We might need to create this

// --- Icons ---
import { ChevronLeft, Menu, UserCircle } from "lucide-react";

export default function ProfilePage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [name, setName] = useState(user?.name || "");
    const [contact, setContact] = useState(""); // We might need to add this to user model if it doesn't exist

    // Sync state once user loads
    useState(() => {
        if (user) setName(user.name || "");
    });

    if (isLoading) return <div className="min-h-screen bg-[#FDF2EC] flex items-center justify-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-[#FDF2EC] font-[Outfit] text-[#5B2D7D]">
             {/* Header */}
             <header className="flex items-center justify-between px-6 py-6">
                <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center -ml-2">
                    <ChevronLeft className="w-6 h-6 text-[#22005D]" />
                </button>
                <div /> 
                {/* Menu icon in design but maybe not needed here? Keeping layout consistent */}
                <button className="w-10 h-10 flex items-center justify-center bg-[#FDF2EC] rounded-full shadow-sm border border-[#EADDDE]">
                   <Menu className="w-6 h-6 text-[#5B2D7D]" />
                </button>
            </header>

            <main className="px-6">
                <h1 className="text-3xl font-bold mb-8 text-[#3E1C56]">Profile</h1>
                <p className="text-[#9A92A6] text-sm mb-8 leading-relaxed">
                    This information is visible to other members that are added in your charms.
                </p>

                {/* Profile Photo */}
                <div className="bg-[#FFF9F6] rounded-3xl p-4 flex items-center gap-4 mb-8 shadow-sm">
                    <UserCircle className="w-[60px] h-[60px] text-[#9A92A6]" />
                    <div>
                        <h2 className="text-[#3E1C56] font-semibold text-base mb-1">Profile photo</h2>
                        <button className="text-[#9A92A6] text-sm">Change photo</button>
                    </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-6">
                    <div>
                        <label className="block text-[#3E1C56] font-semibold mb-2">Name</label>
                        <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your Name"
                            className="w-full bg-[#FFF9F6] border border-[#EADDDE] rounded-xl px-4 py-3 text-[#3E1C56] focus:outline-none focus:border-[#5B2D7D]"
                        />
                    </div>

                    <div>
                        <label className="block text-[#3E1C56] font-semibold mb-2">Contact Information</label>
                         <input 
                            type="tel" 
                            value={contact}
                            onChange={(e) => setContact(e.target.value)}
                            placeholder="+1 234 567 8900"
                            className="w-full bg-[#FFF9F6] border border-[#EADDDE] rounded-xl px-4 py-3 text-[#3E1C56] focus:outline-none focus:border-[#5B2D7D]"
                        />
                    </div>
                </div>
            </main>
        </div>
    )
}

"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { updateProfile } from "@/app/actions/auth";
import { toast } from "sonner";

// --- Icons ---
import { ChevronLeft, Menu, UserCircle, Save, Loader2 } from "lucide-react";

export default function ProfilePage() {
    const { user, isLoading, updateSession } = useAuth();
    const router = useRouter();
    const [name, setName] = useState("");
    const [contact, setContact] = useState("");

    const [state, action, isPending] = useActionState(updateProfile, undefined);

    // Sync state once user loads
    useEffect(() => {
        if (user) {
            const u = user as any;
            setName(u.name || "");
            setContact(u.contact || "");
        }
    }, [user]);

    useEffect(() => {
        if (state?.success) {
            updateSession?.({ user: { name, contact } });
            toast.success("Profile updated successfully");
        } else if (state?.error) {
            toast.error(state.error);
        }
    }, [state]);

    if (isLoading) return <div className="min-h-screen bg-transparent flex items-center justify-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-transparent font-[Outfit] text-[#5B2D7D]">
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

            <main className="px-6 pb-20">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-[#3E1C56]">Profile</h1>
                </div>

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
                <form action={action} className="space-y-6">
                    <div>
                        <label className="block text-[#3E1C56] font-semibold mb-2">Name</label>
                        <input 
                            name="name"
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your Name"
                            className="w-full bg-[#FFF9F6] border border-[#EADDDE] rounded-xl px-4 py-3 text-[#3E1C56] focus:outline-none focus:border-[#5B2D7D]"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-[#3E1C56] font-semibold mb-2">Contact Information</label>
                         <input 
                            name="contact"
                            type="tel" 
                            value={contact}
                            onChange={(e) => setContact(e.target.value)}
                            placeholder="+1 234 567 8900"
                            className="w-full bg-[#FFF9F6] border border-[#EADDDE] rounded-xl px-4 py-3 text-[#3E1C56] focus:outline-none focus:border-[#5B2D7D]"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full bg-[#5B2D7D] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Save Changes
                    </button>
                </form>
            </main>
        </div>
    )
}

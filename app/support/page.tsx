"use client";

import { useState } from "react";
import { createTicket } from "@/app/actions/support";
import { toast } from "sonner";
import { Loader2, Send, LifeBuoy } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SupportPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        subject: "",
        email: "",
        message: ""
    });
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const result = await createTicket(formData);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Ticket submitted! We'll be in touch.");
                setFormData({ subject: "", email: "", message: "" });
                router.push("/");
            }
        } catch (error) {
            toast.error("Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDF2EC] flex flex-col items-center justify-center p-6 font-[Outfit]">
            <div className="max-w-md w-full bg-white rounded-[32px] p-8 shadow-sm">
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="w-16 h-16 bg-[#E8DCF0] rounded-full flex items-center justify-center mb-4 text-[#5B2D7D]">
                        <LifeBuoy className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-[#5B2D7D]">Help & Support</h1>
                    <p className="text-[#5B2D7D]/60 mt-2">Found a bug? Have a suggestion? Let us know.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-[#5B2D7D]/70 mb-1 ml-1">Subject</label>
                        <select 
                            value={formData.subject}
                            onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl bg-[#FDF2EC] border-transparent focus:bg-white focus:ring-2 focus:ring-[#5B2D7D]/20 outline-none transition-all text-[#5B2D7D]"
                            required
                        >
                            <option value="" disabled>Select a topic...</option>
                            <option value="Bug Report">Bug Report</option>
                            <option value="Feature Request">Feature Request</option>
                            <option value="Account Issue">Account Issue</option>
                            <option value="Feedback">General Feedback</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-[#5B2D7D]/70 mb-1 ml-1">Your Email</label>
                        <input 
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="Optional (if logged in)"
                            className="w-full px-4 py-3 rounded-xl bg-[#FDF2EC] border-transparent focus:bg-white focus:ring-2 focus:ring-[#5B2D7D]/20 outline-none transition-all text-[#5B2D7D]"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-[#5B2D7D]/70 mb-1 ml-1">Message</label>
                        <textarea 
                            value={formData.message}
                            onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                            placeholder="Describe your issue or idea..."
                            className="w-full px-4 py-3 rounded-xl bg-[#FDF2EC] border-transparent focus:bg-white focus:ring-2 focus:ring-[#5B2D7D]/20 outline-none transition-all text-[#5B2D7D] min-h-[120px]"
                            required
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full py-4 bg-[#5B2D7D] text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-[#4A246A] active:scale-95 transition-all disabled:opacity-70 mt-4"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Submit Ticket <Send className="w-4 h-4" /></>}
                    </button>
                </form>
            </div>
        </div>
    );
}

"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-transparent  text-[#556B5A] pb-12">
            <header className="sticky top-0 z-30 bg-[#F6F2EC]/80 backdrop-blur-xl border-b border-[#556B5A]/5 px-6 py-4 flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-[#E6DED1]"
                >
                    <ArrowLeft className="w-5 h-5 text-[#556B5A]" />
                </button>
                <h1 className="text-xl font-black text-[#556B5A] uppercase tracking-tight">Privacy Policy</h1>
            </header>

            <main className="px-6 py-8 max-w-2xl mx-auto space-y-8">
                <section className="space-y-4">
                    <h2 className="text-[#3A4B3E] text-2xl font-bold">Data Collection</h2>
                    <p className="text-[#556B5A]/80 leading-relaxed">
                        We collect information you provide directly to us when you create an account, upload media, or contact support. This may include your name, email address, and any media files (photos, videos, audio) you choose to store.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-[#3A4B3E] text-2xl font-bold">How We Use Data</h2>
                    <ul className="list-disc list-inside text-[#556B5A]/80 space-y-2">
                        <li>To provide, maintain, and improve our services.</li>
                        <li>To personalize your experience.</li>
                        <li>To communicate with you about updates and support.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-[#3A4B3E] text-2xl font-bold">Data Security</h2>
                    <p className="text-[#556B5A]/80 leading-relaxed">
                        We use industry-standard encryption and security measures to protect your data. Media files are stored securely using Cloudinary services.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-[#3A4B3E] text-2xl font-bold">Your Rights</h2>
                    <p className="text-[#556B5A]/80 leading-relaxed">
                        You have the right to access, correct, or delete your personal information at any time through your account settings.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-[#3A4B3E] text-2xl font-bold">Contact Us</h2>
                    <p className="text-[#556B5A]/80 leading-relaxed">
                        If you have any questions about this Privacy Policy, please contact us through the support form.
                    </p>
                </section>
            </main>
        </div>
    );
}

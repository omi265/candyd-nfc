"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-transparent font-[Outfit] text-[#556B5A] pb-12">
            <header className="sticky top-0 z-30 bg-[#F6F2EC]/80 backdrop-blur-xl border-b border-[#556B5A]/5 px-6 py-4 flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-[#E6DED1]"
                >
                    <ArrowLeft className="w-5 h-5 text-[#556B5A]" />
                </button>
                <h1 className="text-xl font-black text-[#556B5A] uppercase tracking-tight">Terms & Conditions</h1>
            </header>

            <main className="px-6 py-8 max-w-2xl mx-auto prose prose-purple">
                <div className="bg-[#556B5A] text-white p-6 rounded-3xl mb-8 shadow-lg">
                    <h2 className="text-white text-xl font-bold mb-2">Experimental Product Notice</h2>
                    <p className="opacity-90">
                        Our DVE is a new experimental product currently in development. Features, pricing, and functionality are subject to significant changes without prior notice.
                    </p>
                </div>

                <section className="space-y-6 text-[#556B5A]/80">
                    <h3 className="text-[#556B5A] text-xl font-bold">1. Acceptance of Terms</h3>
                    <p>By accessing and using Our DVE, you agree to be bound by these Terms and Conditions.</p>

                    <h3 className="text-[#556B5A] text-xl font-bold">2. Use of Service</h3>
                    <p>You agree to use the service for personal, non-commercial use only. You are responsible for maintaining the security of your account and any content you upload.</p>

                    <h3 className="text-[#556B5A] text-xl font-bold">3. Content and Privacy</h3>
                    <p>You retain all rights to the media you upload. However, you grant us a license to store and display this content specifically for your use of the service.</p>

                    <h3 className="text-[#556B5A] text-xl font-bold">4. Termination</h3>
                    <p>We reserve the right to terminate or suspend access to our service immediately, without prior notice or liability, for any reason whatsoever.</p>

                    <h3 className="text-[#556B5A] text-xl font-bold">5. Changes to Terms</h3>
                    <p>We may update our Terms and Conditions from time to time. We will notify you of any changes by posting the new Terms and Conditions on this page.</p>
                </section>
            </main>
        </div>
    );
}

"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { 
  Image as ImageIcon, 
  Heart, 
  Zap, 
  ArrowLeft, 
  ShoppingBag, 
  Sparkles,
  ChevronRight
} from "lucide-react";

function StarBullet({ className }: { className?: string }) {
  return (
    <div 
      className={`w-5 h-5 bg-current ${className}`}
      style={{
        maskImage: 'url(/Star.svg)',
        WebkitMaskImage: 'url(/Star.svg)',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskPosition: 'center',
        WebkitMaskPosition: 'center'
      }}
    />
  );
}

const CHARMS = [
  {
    id: "memory",
    name: "Memory Charm",
    type: "MEMORY",
    emoji: "📸",
    description: "Hold your most precious moments close. Store photos, videos, and audio notes directly on your jewelry.",
    features: ["Instant NFC Tap Access", "Photo & Video Galleries", "Audio Voice Notes", "Shared Guest Access"],
    bgColor: "bg-[#5B2D7D]",
    accentColor: "text-[#5B2D7D]",
    gradient: "from-[#5B2D7D] to-[#3A1D52]",
    shopifyUrl: "https://your-shopify-store.com/products/memory-charm",
    icon: (
        <div className="relative w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 bg-white/20 rounded-xl shadow-md border-2 border-white/30 -rotate-12 translate-x-[-15%] translate-y-[-5%] overflow-hidden">
                <img src="https://images.unsplash.com/photo-1518173946687-a4c8a9b746f5?auto=format&fit=crop&w=100&q=80" className="w-full h-full object-cover opacity-60" alt="" />
            </div>
            <div className="absolute inset-0 bg-white/20 rounded-xl shadow-md border-2 border-white/30 rotate-12 translate-x-[15%] translate-y-[5%] overflow-hidden">
                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80" className="w-full h-full object-cover opacity-60" alt="" />
            </div>
            <div className="relative z-10 w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                <ImageIcon className="w-8 h-8 text-[#5B2D7D]" />
            </div>
        </div>
    )
  },
  {
    id: "life",
    name: "Life Charm",
    type: "LIFE",
    emoji: "✨",
    description: "The ultimate bucket list for your journey. Track milestones, share experiences, and celebrate your growth.",
    features: ["Interactive Bucket Lists", "Shared Milestones", "Experience Reflections", "Achievement Badges"],
    bgColor: "bg-[#A4C538]",
    accentColor: "text-[#A4C538]",
    gradient: "from-[#A4C538] to-[#7A9B1E]",
    shopifyUrl: "https://your-shopify-store.com/products/life-charm",
    icon: <div className="w-20 h-20 bg-white rounded-[24px] flex items-center justify-center shadow-lg"><Heart className="w-10 h-10 text-[#A4C538] fill-[#A4C538]" /></div>
  },
  {
    id: "habit",
    name: "Habit Charm",
    type: "HABIT",
    emoji: "⚡",
    description: "Build a better version of yourself. Track daily rituals and maintain consistency with physical reminders.",
    features: ["Streak Tracking", "Focus Area Selection", "Daily Reminders", "Progress Analytics"],
    bgColor: "bg-[#EA580C]",
    accentColor: "text-[#EA580C]",
    gradient: "from-[#EA580C] to-[#9A3412]",
    shopifyUrl: "https://your-shopify-store.com/products/habit-charm",
    icon: <div className="w-20 h-20 bg-white rounded-[24px] flex items-center justify-center shadow-lg"><Zap className="w-10 h-10 text-[#EA580C] fill-[#EA580C]" /></div>
  }
];

export default function ProductsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#FDF2EC] font-[Outfit] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#FDF2EC]/80 backdrop-blur-xl border-b border-[#5B2D7D]/5 px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-[#EADDDE]"
        >
          <ArrowLeft className="w-5 h-5 text-[#5B2D7D]" />
        </button>
        <h1 className="text-xl font-black text-[#5B2D7D] uppercase tracking-tight">Explore Charms</h1>
        <div className="w-10" /> {/* Spacer */}
      </header>

      {/* Hero */}
      <section className="px-6 pt-12 pb-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#5B2D7D]/5 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-[#5B2D7D]" />
            <span className="text-xs font-bold text-[#5B2D7D] uppercase tracking-wider">Magic in every tap</span>
          </div>
          <h2 className="text-4xl font-black text-[#5B2D7D] leading-none uppercase mb-4 tracking-tighter">
            Choose Your <br/><span className="text-[#A4C538]">Digital Companion</span>
          </h2>
          <p className="text-[#5B2D7D]/60 text-lg leading-relaxed">
            Our physical charms connect your style to your stories. Pick the one that fits your journey best.
          </p>
        </motion.div>
      </section>

      {/* Product Grid */}
      <section className="px-6 space-y-12 max-w-5xl mx-auto mt-8 pb-20">
        {CHARMS.map((charm, index) => (
          <motion.div
            key={charm.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="group relative overflow-hidden bg-white rounded-[48px] shadow-2xl border border-[#EADDDE] flex flex-col md:flex-row p-4 gap-4"
          >
            {/* Visual Side */}
            <div className={`w-full md:w-2/5 min-h-[350px] py-16 flex items-center justify-center bg-gradient-to-br ${charm.gradient} relative overflow-hidden rounded-[36px]`}>
                {/* Decorative Blurs */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl transform -translate-x-10 translate-y-10" />
                
                <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="relative z-10"
                >
                    {charm.icon}
                </motion.div>
            </div>

            {/* Info Side */}
            <div className="w-full md:w-3/5 p-6 md:p-10 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">{charm.emoji}</span>
                    <span className={`text-xs font-black uppercase tracking-widest ${charm.accentColor}`}>
                        {charm.type}
                    </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#5B2D7D]/5 flex items-center justify-center">
                    <Sparkles className={`w-4 h-4 ${charm.accentColor}`} />
                </div>
              </div>
              
              <h3 className="text-4xl font-black text-[#5B2D7D] uppercase tracking-tighter mb-4 leading-none">
                {charm.name}
              </h3>
              
              <p className="text-[#5B2D7D]/70 text-lg leading-relaxed mb-8 font-medium">
                {charm.description}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
                {charm.features.map(feature => (
                    <div key={feature} className="flex items-start gap-3 bg-[#FDF2EC]/50 p-3 rounded-2xl border border-[#EADDDE]/50">
                        <div className={`mt-0.5 shrink-0 ${charm.accentColor}`}>
                            <StarBullet />
                        </div>
                        <span className="text-[11px] font-black text-[#5B2D7D] uppercase leading-tight">{feature}</span>
                    </div>
                ))}
              </div>

              <div className="mt-auto pt-8 border-t border-[#EADDDE]/50">
                <a
                    href={charm.shopifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full py-6 px-8 ${charm.bgColor} text-white rounded-[24px] font-black text-xl flex items-center justify-center gap-3 shadow-xl hover:brightness-110 transition-all active:scale-[0.98] group/btn uppercase tracking-tight`}
                >
                    <ShoppingBag className="w-6 h-6" />
                    Get yours on Shopify
                    <ChevronRight className="w-6 h-6 group-hover/btn:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Footer Branding */}
      <section className="px-6 py-20 text-center">
          <div className="w-12 h-12 mx-auto mb-6 opacity-30">
              <img src="/Candyd_logo.svg" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <p className="text-[#5B2D7D]/40 text-sm font-bold uppercase tracking-widest">
              Crafted with magic by Candyd
          </p>
      </section>
    </div>
  );
}
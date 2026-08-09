import { Loader2, Sparkles } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex h-dvh w-full flex-col items-center justify-center bg-[#F6F2EC]">
      <div className="flex flex-col items-center gap-6">
        <div className="relative w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl">
            <Loader2 className="w-10 h-10 text-[#556B5A] animate-spin" />
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 shadow-sm animate-bounce">
                <Sparkles className="w-4 h-4" />
            </div>
        </div>
        <div className="text-center">
            <h2 className="text-xl font-bold text-[#556B5A] mb-1">Checking Your Rituals</h2>
            <p className="text-xs text-[#556B5A]/40 uppercase font-black tracking-widest">Just a moment...</p>
        </div>
      </div>
    </div>
  );
}

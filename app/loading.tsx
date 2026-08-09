export default function Loading() {
  return (
    <div className="h-dvh bg-[#F6F2EC] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-[#556B5A]/20 border-t-[#556B5A] rounded-full animate-spin" />
        <p className="text-[#556B5A]/40 text-xs font-bold uppercase tracking-widest">
          Loading
        </p>
      </div>
    </div>
  );
}

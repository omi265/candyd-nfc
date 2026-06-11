export default function Loading() {
  return (
    <div className="h-dvh bg-[#FDF2EC] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-[#5B2D7D]/20 border-t-[#5B2D7D] rounded-full animate-spin" />
        <p className="text-[#5B2D7D]/40 text-xs font-bold uppercase tracking-widest">
          Loading
        </p>
      </div>
    </div>
  );
}

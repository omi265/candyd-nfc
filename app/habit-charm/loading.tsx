export default function Loading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-transparent">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#5B2D7D]/20 border-t-[#5B2D7D]" />
        <p className="text-sm font-bold text-[#5B2D7D] animate-pulse">Loading Habits...</p>
      </div>
    </div>
  );
}

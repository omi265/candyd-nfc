export default function Loading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-transparent">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#556B5A]/20 border-t-[#556B5A]" />
        <p className="text-sm font-bold text-[#556B5A] animate-pulse">Loading Life List...</p>
      </div>
    </div>
  );
}

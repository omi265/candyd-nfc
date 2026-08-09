import { getMemories } from "@/app/actions/memories";
import { getPeople } from "@/app/actions/people";
import HomeContent from "@/app/components/home-content";
import { Suspense } from "react";

// Auth guard is handled by middleware in proxy.ts — no need for auth() here.
export default async function MemoriesPage() {
  const [memories, allPeople] = await Promise.all([
    getMemories(),
    getPeople(),
  ]).catch(() => [[], []] as [any[], any[]]);

  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-transparent text-[#556B5A]">Loading...</div>}>
      <HomeContent
        initialMemories={memories}
        people={allPeople}
      />
    </Suspense>
  );
}

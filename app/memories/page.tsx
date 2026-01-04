import { auth } from "@/auth";
import { getMemories } from "@/app/actions/memories";
import { getPeople } from "@/app/actions/people";
import { redirect } from "next/navigation";
import HomeContent from "@/app/components/home-content";
import { Suspense } from "react";

export default async function MemoriesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Fetch memories and people in parallel
  let memories: any[] = [];
  let allPeople: any[] = [];

  try {
     const [fetchedMemories, fetchedPeople] = await Promise.all([
        getMemories(),
        getPeople()
     ]);

     memories = fetchedMemories;
     allPeople = fetchedPeople;

  } catch (error) {
     console.error("Failed to fetch data on server", error);
  }

  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#FDF2EC] text-[#5B2D7D]">Loading...</div>}>
      <HomeContent
        initialMemories={memories}
        people={allPeople}
        user={session.user}
      />
    </Suspense>
  );
}

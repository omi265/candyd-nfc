import { auth } from "@/auth";
import { getMemories, getUserProducts } from "@/app/actions/memories";
import { getProductById } from "@/app/actions/life-charm";
import { getPeople } from "@/app/actions/people";
import { redirect } from "next/navigation";
import HomeContent from "@/app/components/home-content";
import { Suspense } from "react";

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const resolvedSearchParams = await searchParams;
  const charmId = typeof resolvedSearchParams?.charmId === 'string' ? resolvedSearchParams.charmId : undefined;

  // Check if the selected charm is a Life Charm and redirect if so
  if (charmId) {
    const product = await getProductById(charmId);
    if (product && product.type === "LIFE") {
      redirect(`/life-charm?charmId=${charmId}`);
    }
  }

  console.log("HOME: Session User ID:", session?.user?.id);
  
  // Fetch memories, products, and people in parallel
  let memories: any[] = [];
  let lifeCharms: any[] = [];
  let allPeople: any[] = [];

  try {
     const [fetchedMemories, allProducts, fetchedPeople] = await Promise.all([
        getMemories(charmId),
        getUserProducts(),
        getPeople()
     ]);
     
     memories = fetchedMemories;
     allPeople = fetchedPeople;
     
     // Filter for active Life Charms
     if (!charmId) {
         lifeCharms = allProducts.filter((p: any) => p.type === 'LIFE');
     }

     console.log("HOME: Fetched Memories Count:", memories.length);
     console.log("HOME: Life Charms Count:", lifeCharms.length);

  } catch (error) {
     console.error("Failed to fetch data on server", error);
  }

  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#FDF2EC] text-[#5B2D7D]">Loading...</div>}>
      <HomeContent 
        initialMemories={memories} 
        lifeCharms={lifeCharms}
        people={allPeople}
        user={session.user} 
      />
    </Suspense>
  );
}

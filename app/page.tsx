import { auth } from "@/auth";
import { getMemories } from "@/app/actions/memories";
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

  console.log("HOME: Session User ID:", session?.user?.id);
  let memories: any[] = [];
  try {
     memories = await getMemories(charmId);
     console.log("HOME: Fetched Memories Count:", memories.length);
     console.log("HOME: Fetched Memories Data:", JSON.stringify(memories, null, 2));
  } catch (error) {
     console.error("Failed to fetch memories on server", error);
     // We can continue with empty memories or handle error
  }

  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#FDF2EC] text-[#5B2D7D]">Loading...</div>}>
      <HomeContent initialMemories={memories} user={session.user} />
    </Suspense>
  );
}

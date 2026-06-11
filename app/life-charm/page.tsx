import { redirect } from "next/navigation";
import { getLifeList, getProductSummaryById } from "@/app/actions/life-charm";
import { getPeople } from "@/app/actions/people";
import { getMemories } from "@/app/actions/memories";
import LifeCharmContent from "./life-charm-content";

interface PageProps {
  searchParams: Promise<{ charmId?: string }>;
}

// Auth guard is handled by middleware in proxy.ts — no need for auth() here.
export default async function LifeCharmPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const charmId = resolvedParams?.charmId;

  if (!charmId) {
    redirect("/");
  }

  // Get product to verify it's a Life Charm
  const product = await getProductSummaryById(charmId);

  if (!product) {
    redirect("/");
  }

  if (product.type !== "LIFE") {
    if (product.type === "MEMORY") {
      redirect(`/memories?charmId=${charmId}`);
    }
    redirect("/");
  }

  // Fetch data in parallel
  const [lifeList, people, memories] = await Promise.all([
    getLifeList(charmId),
    getPeople(),
    getMemories(charmId)
  ]);

  // If no life list exists, redirect to setup
  if (!lifeList) {
    redirect(`/life-charm/setup?charmId=${charmId}`);
  }

  return (
    <LifeCharmContent
      lifeList={lifeList}
      product={product}
      people={people}
      memories={memories}
    />
  );
}

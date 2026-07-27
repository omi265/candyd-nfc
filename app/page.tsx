import { redirect } from "next/navigation";
import { getLifeList, getProductSummaryById, getOrCreateLifeCharm } from "@/app/actions/life-charm";
import { getPeople } from "@/app/actions/people";
import { getMemories } from "@/app/actions/memories";
import LifeCharmContent from "@/app/life-charm/life-charm-content";

interface PageProps {
  searchParams: Promise<{ charmId?: string }>;
}

// Auth guard is handled by middleware in proxy.ts — no need for auth() here.
export default async function Dashboard({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  let charmId = resolvedParams?.charmId;

  let product = charmId ? await getProductSummaryById(charmId) : null;

  if (!product) {
    product = await getOrCreateLifeCharm();
    if (!product) {
      redirect("/login");
    }
    charmId = product.id;
  }

  const [lifeList, people, memories] = await Promise.all([
    getLifeList(product.id),
    getPeople(),
    getMemories(product.id)
  ]);

  return (
    <LifeCharmContent
      lifeList={lifeList}
      product={product}
      people={people}
      memories={memories}
    />
  );
}

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLifeList, getProductById } from "@/app/actions/life-charm";
import { getPeople } from "@/app/actions/people";
import { getMemories } from "@/app/actions/memories";
import LifeCharmContent from "./life-charm-content";

interface PageProps {
  searchParams: Promise<{ charmId?: string }>;
}

export default async function LifeCharmPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const resolvedParams = await searchParams;
  const charmId = resolvedParams?.charmId;

  if (!charmId) {
    redirect("/");
  }

  // Get product to verify it's a Life Charm
  const product = await getProductById(charmId);

  if (!product) {
    redirect("/");
  }

  if (product.type !== "LIFE") {
    // Redirect to appropriate page based on type
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
      user={session.user}
      memories={memories}
    />
  );
}

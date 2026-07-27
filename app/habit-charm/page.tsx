import { redirect } from "next/navigation";
import { getProductSummaryById, getOrCreateHabitCharm } from "@/app/actions/life-charm";
import { getHabits } from "@/app/actions/habit";
import HabitSetup from "./habit-setup";
import HabitDashboard from "./habit-dashboard";

export const dynamic = "force-dynamic";

// Auth guard is handled by middleware in proxy.ts — no need for auth() here.
export default async function HabitCharmPage({
  searchParams,
}: {
  searchParams: Promise<{ charmId?: string }>;
}) {
  const resolvedParams = await searchParams;
  let charmId = resolvedParams?.charmId;

  let product = charmId ? await getProductSummaryById(charmId) : null;

  if (!product) {
    product = await getOrCreateHabitCharm();
    if (!product) {
      redirect("/");
    }
    charmId = product.id;
  }

  if (product.type !== "HABIT") {
      if (product.type === "LIFE") {
          redirect(`/life-charm?charmId=${charmId}`);
      }
      redirect("/");
  }

  // 2. Check for existing active habits
  const habits = await getHabits(product.id);

  // 3. Render Setup or Dashboard
  if (!habits || habits.length === 0) {
      return <HabitSetup product={product} />;
  }

  return <HabitDashboard habits={habits} product={product} />;
}

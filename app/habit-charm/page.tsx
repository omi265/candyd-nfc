import { redirect } from "next/navigation";
import { getProductSummaryById } from "@/app/actions/life-charm";
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
  const { charmId } = await searchParams;

  if (!charmId) {
    redirect("/");
  }

  // 1. Verify Product Ownership & Type
  const product = await getProductSummaryById(charmId);
  
  if (!product) {
      redirect("/");
  }
  
  if (product.type !== "HABIT") {
      if (product.type === "LIFE") {
          redirect(`/life-charm?charmId=${charmId}`);
      }
      redirect("/");
  }

  // 2. Check for existing active habits
  const habits = await getHabits(charmId);

  // 3. Render Setup or Dashboard
  if (!habits || habits.length === 0) {
      return <HabitSetup product={product} />;
  }

  return <HabitDashboard habits={habits} product={product} />;
}

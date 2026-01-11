import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getProductById } from "@/app/actions/life-charm";
import { getHabits } from "@/app/actions/habit";
import HabitSetup from "./habit-setup";
import HabitDashboard from "./habit-dashboard";

export default async function HabitCharmPage({
  searchParams,
}: {
  searchParams: Promise<{ charmId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { charmId } = await searchParams;

  if (!charmId) {
    redirect("/");
  }

  // 1. Verify Product Ownership & Type
  const product = await getProductById(charmId);
  
  if (!product) {
      redirect("/"); // Or 404
  }
  
  if (product.type !== "HABIT") {
      // If it's a Life Charm, redirect there
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

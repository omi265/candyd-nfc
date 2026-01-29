import { auth } from "@/auth";
import { getDashboardProducts } from "@/app/actions/memories";
import { redirect } from "next/navigation";
import DashboardContent from "@/app/components/dashboard-content";

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const products = await getDashboardProducts();

  return (
    <div className="h-dvh bg-[#FDF2EC]">
        <DashboardContent products={products} />
    </div>
  );
}

import { getDashboardProducts } from "@/app/actions/memories";
import DashboardContent from "@/app/components/dashboard-content";

// Auth guard is handled by middleware in proxy.ts — no need for auth() here.
export default async function Dashboard() {
  const products = await getDashboardProducts();

  return (
    <div className="h-dvh bg-transparent">
        <DashboardContent products={products} />
    </div>
  );
}

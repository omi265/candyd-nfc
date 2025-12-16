import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMemory, getUserProducts } from "@/app/actions/memories";
import MemoryClientPage from "./client";

export default async function MemoryPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
      redirect("/login");
  }

  const { id } = await params;
  if (!id) redirect("/");

  const memory = await getMemory(id);
  // Security check: getMemory checks ownership, returns null if not found/owned
  if (!memory) {
      redirect("/");
  }

  const products = await getUserProducts();

  return <MemoryClientPage memory={memory} products={products} />;
}

import { redirect } from "next/navigation";

export default async function MemoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ charmId?: string }>;
}) {
  const { charmId } = await searchParams;
  redirect(charmId ? `/life-charm?charmId=${charmId}` : "/life-charm");
}

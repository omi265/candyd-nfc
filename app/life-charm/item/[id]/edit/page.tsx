import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getListItem } from "@/app/actions/life-charm";
import { getPeople } from "@/app/actions/people";
import EditItemClient from "./client";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ charmId?: string }>;
}

export default async function EditItemPage({ params, searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const itemId = resolvedParams.id;
  const charmId = resolvedSearchParams?.charmId;

  if (!charmId) {
    redirect("/");
  }

  const item = await getListItem(itemId);

  if (!item) {
    redirect(`/life-charm?charmId=${charmId}`);
  }

  // If item is already lived, redirect to experience edit or detail
  if (item.status === "lived") {
    redirect(`/life-charm/experience/${item.id}/edit?charmId=${charmId}`);
  }

  const people = await getPeople();

  return (
    <EditItemClient
      item={item}
      people={people}
      charmId={charmId}
    />
  );
}

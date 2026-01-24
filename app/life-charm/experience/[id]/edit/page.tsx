import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getExperience } from "@/app/actions/life-charm";
import { getPeople } from "@/app/actions/people";
import EditExperienceClient from "./client";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ charmId?: string }>;
}

export default async function EditExperiencePage({ params, searchParams }: PageProps) {
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

  const experience = await getExperience(itemId);

  if (!experience) {
    // If no experience exists, maybe redirect to create one?
    // Or back to item detail
    redirect(`/life-charm/item/${itemId}?charmId=${charmId}`);
  }

  const people = await getPeople();

  return (
    <EditExperienceClient
      experience={experience}
      people={people}
      charmId={charmId}
    />
  );
}

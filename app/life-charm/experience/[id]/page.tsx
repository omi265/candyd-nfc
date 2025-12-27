import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getExperience } from "@/app/actions/life-charm";
import { getPeople } from "@/app/actions/people";
import ExperienceClient from "./client";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ charmId?: string }>;
}

export default async function ExperiencePage({ params, searchParams }: PageProps) {
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
    redirect(`/life-charm/item/${itemId}?charmId=${charmId}`);
  }

  const people = await getPeople();

  return (
    <ExperienceClient
      experience={experience}
      people={people}
      charmId={charmId}
    />
  );
}

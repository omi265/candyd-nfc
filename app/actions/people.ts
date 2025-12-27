"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

// ===========================================
// PEOPLE CRUD
// ===========================================

export async function createPerson(data: { name: string; avatarUrl?: string }) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const person = await db.person.create({
      data: {
        name: data.name,
        avatarUrl: data.avatarUrl,
        userId: session.user.id,
      },
    });

    revalidatePath(`/life-charm`);
    return { success: true, personId: person.id, person };
  } catch (error: any) {
    console.error("Create Person Error:", error);
    return { error: error.message };
  }
}

export async function getPeople() {
  const session = await auth();
  if (!session?.user?.id) return [];

  try {
    const people = await db.person.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
    });

    return people;
  } catch (error) {
    console.error("Failed to fetch people:", error);
    return [];
  }
}

export async function getPerson(personId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  try {
    const person = await db.person.findUnique({
      where: { id: personId },
    });

    if (!person || person.userId !== session.user.id) return null;
    return person;
  } catch (error) {
    console.error("Failed to fetch person:", error);
    return null;
  }
}

export async function getPersonsByIds(personIds: string[]) {
  const session = await auth();
  if (!session?.user?.id) return [];

  try {
    const people = await db.person.findMany({
      where: {
        id: { in: personIds },
        userId: session.user.id,
      },
      orderBy: { name: "asc" },
    });

    return people;
  } catch (error) {
    console.error("Failed to fetch people by ids:", error);
    return [];
  }
}

export async function updatePerson(
  personId: string,
  data: { name?: string; avatarUrl?: string | null }
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const person = await db.person.findUnique({
      where: { id: personId },
      select: { userId: true },
    });

    if (!person || person.userId !== session.user.id) {
      return { error: "Unauthorized" };
    }

    const updated = await db.person.update({
      where: { id: personId },
      data: {
        name: data.name,
        avatarUrl: data.avatarUrl,
      },
    });

    revalidatePath(`/life-charm`);
    return { success: true, person: updated };
  } catch (error: any) {
    console.error("Update Person Error:", error);
    return { error: error.message };
  }
}

export async function deletePerson(personId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const person = await db.person.findUnique({
      where: { id: personId },
      select: { userId: true },
    });

    if (!person || person.userId !== session.user.id) {
      return { error: "Unauthorized" };
    }

    await db.person.delete({ where: { id: personId } });

    revalidatePath(`/life-charm`);
    return { success: true };
  } catch (error: any) {
    console.error("Delete Person Error:", error);
    return { error: error.message };
  }
}

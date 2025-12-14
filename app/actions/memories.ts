"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createMemorySchema = z.object({
  title: z.string().min(1, "Title is required").max(15, "Title too long"),
  description: z.string().min(1, "Description is required"),
  date: z.string(), // We will parse this to Date object
  time: z.string().optional(),
  location: z.string().optional(),
  emotions: z.string().optional(), // Comma separated or JSON string
  mood: z.string().optional(),
});

export async function createMemory(prevState: { error?: string; success?: boolean } | undefined, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const validatedFields = createMemorySchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return { error: "Invalid fields: " + validatedFields.error.issues.map((i) => i.message).join(", ") };
  }

  const { title, description, date, time, location, emotions, mood } = validatedFields.data;

  // content-type check for date if needed, assuming ISO or valid string for now
  // For this app, the date format from frontend might need parsing "DD-MM-YYYY" -> ISO
  // Let's assume frontend sends something parseable or we handle it here.
  // Given "17-06-2025" from frontend default:
  
  let parsedDate = new Date();
  try {
      const [day, month, year] = date.split("-");
      if (day && month && year) {
          parsedDate = new Date(`${year}-${month}-${day}`);
      } else {
          parsedDate = new Date(date);
      }
  } catch (e) {
      console.error("Date parsing error", e);
  }

  try {
    const emotionsArray = emotions ? emotions.split(",") : [];

    await db.memory.create({
      data: {
        title,
        description,
        date: parsedDate,
        time,
        location,
        emotions: emotionsArray,
        mood,
        userId: session.user.id,
        // Media is skipped for now as per user request
      },
    });

    revalidatePath("/"); // Update home page
    return { success: true };
  } catch (error) {
    console.error("Database Error:", error);
    return { error: "Failed to create memory." };
  }
}

export async function getMemories() {
  const session = await auth();
  if (!session?.user?.id) return [];

  try {
    const memories = await db.memory.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        media: true, // Will be empty for now
      }
    });
    return memories;
  } catch (error) {
    console.error("Failed to fetch memories:", error);
    return [];
  }
}

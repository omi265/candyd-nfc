"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import cloudinary from "@/lib/cloudinary";

const createMemorySchema = z.object({
  title: z.string().min(1, "Title is required").max(15, "Title too long"),
  description: z.string().min(1, "Description is required"),
  date: z.string(), // We will parse this to Date object
  time: z.string().optional(),
  location: z.string().optional(),
  emotions: z.string().optional(), // Comma separated or JSON string
  mood: z.string().optional(),
  productId: z.string().optional(),
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


  const { title, description, date, time, location, emotions, mood, productId } = validatedFields.data;

  // content-type check for date if needed
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

  // Handle Media Uploads
  const mediaFiles = formData.getAll("media") as File[];
  const uploadedMedia = [];

  try {
    // 1. Create Memory
    const emotionsArray = emotions ? emotions.split(",") : [];
    
    const memory = await db.memory.create({
      data: {
        title,
        description,
        date: parsedDate,
        time,
        location,
        emotions: emotionsArray,
        mood,
        userId: session.user.id,
        productId: productId || undefined,
      },
    });

    // 2. Upload Media if present
    if (mediaFiles && mediaFiles.length > 0) {
        for (const file of mediaFiles) {
            if (file instanceof File && file.size > 0) {
                try {
                    const arrayBuffer = await file.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    
                    // Determine resource type based on mime type or just auto
                    // Simple heuristic:
                    const type = file.type.startsWith('video') ? 'video' : 
                                 file.type.startsWith('audio') ? 'video' : // Cloudinary treats audio as video usually or distinct, 'auto' is safest
                                 'image';

                    const uploadResult: any = await new Promise((resolve, reject) => {
                        cloudinary.uploader.upload_stream(
                           { 
                             resource_type: "auto",
                             folder: "candyd_memories"
                           },
                           (error, result) => {
                               if (error) reject(error);
                               else resolve(result);
                           }
                        ).end(buffer);
                    });

                    if (uploadResult?.secure_url) {
                        await db.media.create({
                            data: {
                                url: uploadResult.secure_url,
                                type: uploadResult.resource_type, // 'image', 'video', 'raw'
                                size: file.size,
                                memoryId: memory.id
                            }
                        });
                    }
                } catch (uploadError) {
                    console.error("Failed to upload file:", file.name, uploadError);
                    // Continue with other files? Or throw?
                    // Let's continue but maybe log warning
                }
            }
        }
    }

    revalidatePath("/"); // Update home page
    return { success: true };
  } catch (error) {
    console.error("Database/Upload Error:", error);
    return { error: "Failed to create memory." };
  }
}

export async function getMemories(productId?: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  try {
    const whereClause: any = {
        userId: session.user.id,
    };

    if (productId) {
        whereClause.productId = productId;
    }

    const memories = await db.memory.findMany({
      where: whereClause,
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

export async function getUserProducts() {
    const session = await auth();
    if (!session?.user?.id) return [];

    try {
        const products = await db.product.findMany({
            where: {
                userId: session.user.id,
                active: true,
            },
            orderBy: {
                createdAt: "desc",
            }
        });
        return products;
    } catch (error) {
        console.error("Failed to fetch user products:", error);
        return [];
    }
}

export async function getProductIdFromToken(token: string) {
    try {
        const product = await db.product.findUnique({
            where: { token },
            select: { id: true }
        });
        return product?.id || null;
    } catch (error) {
        console.error("Failed to get product from token:", error);
        return null;
    }
}

"use server";

import { signIn, signOut, auth } from "@/auth";
import { db } from "@/lib/db";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { revalidatePath } from "next/cache";
import { deleteFromCloudinary, extractPublicId } from "@/lib/cloudinary-helper";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const updateProfileSchema = z.object({
    name: z.string().min(1, "Name is required"),
    contact: z.string().optional(),
});

export async function authenticate(prevState: string | undefined, formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid credentials.";
        default:
          return "Something went wrong.";
      }
    }
    throw error;
  }
}

export async function registerUser(prevState: { error?: string, success?: boolean } | undefined, formData: FormData) {
     const validatedFields = registerSchema.safeParse(Object.fromEntries(formData.entries()));

     if (!validatedFields.success) {
         return { error: "Invalid fields: " + validatedFields.error.issues.map(i => i.message).join(", ") };
     }

     const { email, password, name } = validatedFields.data;

     // Check if user exists
     const existingUser = await db.user.findUnique({
         where: { email }
     });

     if (existingUser) {
         return { error: "Email already in use!" };
     }

     const hashedPassword = await bcrypt.hash(password, 10);

     await db.user.create({
         data: {
             name,
             email,
             password: hashedPassword,
         },
     });

     return { success: true };
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}

export async function updateProfile(prevState: any, formData: FormData) {
    const session = await auth(); 
    if (!session?.user?.id) return { error: "Not authenticated" };
    
    const validatedFields = updateProfileSchema.safeParse({
        name: formData.get("name"),
        contact: formData.get("contact"),
    });

    if (!validatedFields.success) {
        return { error: "Invalid fields" };
    }

    const { name, contact } = validatedFields.data;

    try {
        await db.user.update({
            where: { id: session.user.id },
            data: { name, contact }
        });
        
        revalidatePath("/settings");
        revalidatePath("/settings/profile");
        return { success: true };
    } catch (error) {
        return { error: "Failed to update profile" };
    }
}

export async function deleteAccount() {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };

    try {
        const userId = session.user.id;

        // 1. Gather all media from user's memories
        const memories = await db.memory.findMany({
            where: { userId },
            include: { media: true }
        });

        const publicIds: string[] = [];
        memories.forEach(mem => {
            mem.media.forEach(m => {
                const pid = extractPublicId(m.url);
                if (pid) publicIds.push(pid);
            });
        });

        // 2. Gather media from experiences
        const experiences = await db.experience.findMany({
            where: {
                item: {
                    lifeList: {
                        userId
                    }
                }
            },
            include: { media: true }
        });

        experiences.forEach(exp => {
            exp.media.forEach(m => {
                const pid = extractPublicId(m.url);
                if (pid) publicIds.push(pid);
            });
        });

        // 3. Delete from Cloudinary
        if (publicIds.length > 0) {
            await deleteFromCloudinary(publicIds);
        }

        // 4. Delete user (Cascades will handle DB cleanup)
        await db.user.delete({
            where: { id: userId }
        });

        return { success: true };
    } catch (error) {
        console.error("Delete Account Error:", error);
        return { error: "Failed to delete account" };
    }
}

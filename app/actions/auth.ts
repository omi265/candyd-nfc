"use server";

import { signIn, signOut, auth } from "@/auth";
import { db } from "@/lib/db";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { revalidatePath } from "next/cache";
import { deleteFromCloudinary, extractPublicId } from "@/lib/cloudinary-helper";
import { changePasswordSchema } from "@/lib/schemas";
import { sendPasswordResetEmail } from "@/lib/mail";
import { v4 as uuidv4 } from "uuid";

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

export async function changePassword(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };

    const rawData = Object.fromEntries(formData.entries());
    const validatedFields = changePasswordSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return { error: "Invalid fields: " + validatedFields.error.issues.map(i => i.message).join(", ") };
    }

    const { currentPassword, newPassword } = validatedFields.data;

    try {
        const user = await db.user.findUnique({
            where: { id: session.user.id }
        });

        if (!user || !user.password) {
            return { error: "User not found" };
        }

        // Verify current password
        const passwordMatch = await bcrypt.compare(currentPassword, user.password);
        if (!passwordMatch) {
            return { error: "Current password is incorrect" };
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await db.user.update({
            where: { id: session.user.id },
            data: { password: hashedPassword }
        });

        return { success: true };
    } catch (error) {
        console.error("Change Password Error:", error);
        return { error: "Failed to change password" };
    }
}

export async function forgotPassword(email: string) {
    if (!email) return { error: "Email is required" };

    try {
        const user = await db.user.findUnique({
            where: { email }
        });

        if (!user) {
            // For security, don't reveal if user exists
            return { success: true };
        }

        // Generate token
        const token = uuidv4();
        const expires = new Date(new Date().getTime() + 3600 * 1000); // 1 hour

        // Upsert token
        const existingToken = await db.passwordResetToken.findFirst({
            where: { email }
        });

        if (existingToken) {
            await db.passwordResetToken.delete({
                where: { id: existingToken.id }
            });
        }

        await db.passwordResetToken.create({
            data: {
                email,
                token,
                expires
            }
        });

        // Send email
        await sendPasswordResetEmail(email, token);

        return { success: true };
    } catch (error) {
        console.error("Forgot Password Error:", error);
        return { error: "Something went wrong" };
    }
}

export async function resetPassword(token: string, password: string) {
    if (!token || !password) return { error: "Token and password are required" };

    try {
        const resetToken = await db.passwordResetToken.findUnique({
            where: { token }
        });

        if (!resetToken || resetToken.expires < new Date()) {
            return { error: "Token invalid or expired" };
        }

        const user = await db.user.findUnique({
            where: { email: resetToken.email }
        });

        if (!user) {
            return { error: "User not found" };
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });

        // Delete token
        await db.passwordResetToken.delete({
            where: { id: resetToken.id }
        });

        return { success: true };
    } catch (error) {
        console.error("Reset Password Error:", error);
        return { error: "Something went wrong" };
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

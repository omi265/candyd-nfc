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

async function logActivity(action: string, details?: string, userId?: string) {
    try {
        await db.activityLog.create({
            data: {
                action,
                details,
                userId
            }
        });
    } catch (error) {
        console.error("Activity logging failed:", error);
    }
}

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
  const email = formData.get("email") as string;
  try {
    await signIn("credentials", {
      email,
      password: formData.get("password"),
      redirectTo: "/",
    });
    // Log success (Note: in reality, signIn might redirect before this line executes in some NextAuth versions)
    await logActivity("LOGIN_SUCCESS", `User ${email} logged in`);
  } catch (error) {
    if (error instanceof AuthError) {
      await logActivity("LOGIN_FAILED", `Failed login attempt for ${email}: ${error.type}`);
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

        await logActivity("PASSWORD_CHANGED", "User changed their password", session.user.id);

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

        // Generate 6-digit OTP
        const token = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(new Date().getTime() + 15 * 60 * 1000); // 15 minutes

        // Send email
        await sendPasswordResetEmail(email, token);

        return { success: true };
    } catch (error) {
        console.error("Forgot Password Error:", error);
        return { error: "Something went wrong" };
    }
}

export async function resetPassword(email: string, token: string, password: string) {
    if (!email || !token || !password) return { error: "Email, code, and password are required" };

    try {
        const resetToken = await db.passwordResetToken.findFirst({
            where: { 
                email,
                token
            }
        });

        if (!resetToken || resetToken.expires < new Date()) {
            return { error: "Invalid or expired reset code" };
        }

        const user = await db.user.findUnique({
            where: { email }
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

        // Gather all Public IDs for Cloudinary cleanup
        const publicIds: string[] = [];

        // 1. User Profile Image
        const user = await db.user.findUnique({
            where: { id: userId },
            select: { image: true }
        });
        if (user?.image) {
            const pid = extractPublicId(user.image);
            if (pid) publicIds.push(pid);
        }

        // 2. Memory Media
        const memories = await db.memory.findMany({
            where: { userId },
            include: { media: true }
        });
        memories.forEach(mem => {
            mem.media.forEach(m => {
                const pid = extractPublicId(m.url);
                if (pid) publicIds.push(pid);
            });
        });

        // 3. Experience Media
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

        // 4. Habit Log Images
        const habitLogs = await db.habitLog.findMany({
            where: {
                habit: {
                    userId
                },
                imageUrl: { not: null }
            },
            select: { imageUrl: true }
        });
        habitLogs.forEach(log => {
            if (log.imageUrl) {
                const pid = extractPublicId(log.imageUrl);
                if (pid) publicIds.push(pid);
            }
        });

        // 5. Person Avatars
        const people = await db.person.findMany({
            where: { userId },
            select: { avatarUrl: true }
        });
        people.forEach(p => {
            if (p.avatarUrl) {
                const pid = extractPublicId(p.avatarUrl);
                if (pid) publicIds.push(pid);
            }
        });

        // 6. Delete from Cloudinary
        if (publicIds.length > 0) {
            await deleteFromCloudinary(publicIds);
        }

        // 7. Delete user (Cascades will handle DB cleanup)
        await db.user.delete({
            where: { id: userId }
        });

        await logActivity("ACCOUNT_DELETED", `Account ${userId} deleted`);

        return { success: true };
    } catch (error) {
        console.error("Delete Account Error:", error);
        return { error: "Failed to delete account" };
    }
}

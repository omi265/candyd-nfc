"use server";

import { signIn, signOut, auth } from "@/auth";
import { db } from "@/lib/db";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { z } from "zod";

import { revalidatePath } from "next/cache";
import { deleteStoredMedia } from "@/lib/media-storage";
import { changePasswordSchema } from "@/lib/schemas";
import { sendPasswordResetEmail, sendRegistrationVerificationEmail } from "@/lib/mail";

const REGISTRATION_CODE_TTL_MS = 15 * 60 * 1000;
const REGISTRATION_RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_REGISTRATION_ATTEMPTS = 5;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function generateRegistrationCode() {
  return randomInt(100000, 1000000).toString();
}

function hashRegistrationCode(email: string, code: string) {
  const configuredSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!configuredSecret && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is required for registration verification");
  }
  const secret = configuredSecret || "our-dve-development-secret";
  return createHmac("sha256", secret).update(`${email}:${code}`).digest("hex");
}

function registrationCodeMatches(expectedHash: string, email: string, code: string) {
  const suppliedHash = hashRegistrationCode(email, code);
  return timingSafeEqual(Buffer.from(expectedHash, "hex"), Buffer.from(suppliedHash, "hex"));
}

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
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  contact: z.string().optional(),
});

const registrationCodeSchema = z.string().regex(/^\d{6}$/, "Enter the 6-digit verification code");

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

export async function requestRegistrationVerification(formData: FormData) {
     const validatedFields = registerSchema.safeParse(Object.fromEntries(formData.entries()));

     if (!validatedFields.success) {
         return { error: "Invalid fields: " + validatedFields.error.issues.map(i => i.message).join(", ") };
     }

     const { email, password, name, contact } = validatedFields.data;

     const existingUser = await db.user.findUnique({
         where: { email }
     });

     if (existingUser) {
         return { error: "Email already in use!" };
     }

     const pendingVerification = await db.registrationVerification.findUnique({
         where: { email },
         select: { updatedAt: true }
     });

     if (
         pendingVerification &&
         Date.now() - pendingVerification.updatedAt.getTime() < REGISTRATION_RESEND_COOLDOWN_MS
     ) {
         return { error: "A verification code was sent recently. Please wait a minute before trying again." };
     }

     const code = generateRegistrationCode();
     const tokenHash = hashRegistrationCode(email, code);
     const passwordHash = await bcrypt.hash(password, 10);
     const expiresAt = new Date(Date.now() + REGISTRATION_CODE_TTL_MS);

     await db.registrationVerification.upsert({
         where: { email },
         create: { email, name, contact: contact || null, passwordHash, tokenHash, expiresAt },
         update: {
             name,
             contact: contact || null,
             passwordHash,
             tokenHash,
             expiresAt,
             attempts: 0
         }
     });

     try {
         await sendRegistrationVerificationEmail(email, code);
     } catch (error) {
         console.error("Registration verification email failed:", error);
         await db.registrationVerification.deleteMany({ where: { email, tokenHash } });
         return { error: "We couldn't send the verification email. Please try again." };
     }

     await logActivity("REGISTRATION_CODE_SENT", `Registration verification sent to ${email}`);

     return { success: true, email };
}

export async function resendRegistrationVerification(rawEmail: string) {
    const parsedEmail = z.string().trim().toLowerCase().email().safeParse(rawEmail);
    if (!parsedEmail.success) return { error: "Invalid email address" };

    const email = normalizeEmail(parsedEmail.data);
    const pendingVerification = await db.registrationVerification.findUnique({ where: { email } });

    if (!pendingVerification) {
        return { error: "Registration request not found. Please start again." };
    }

    if (Date.now() - pendingVerification.updatedAt.getTime() < REGISTRATION_RESEND_COOLDOWN_MS) {
        return { error: "Please wait a minute before requesting another code." };
    }

    const code = generateRegistrationCode();
    const tokenHash = hashRegistrationCode(email, code);

    try {
        await sendRegistrationVerificationEmail(email, code);
        await db.registrationVerification.update({
            where: { email },
            data: {
                tokenHash,
                attempts: 0,
                expiresAt: new Date(Date.now() + REGISTRATION_CODE_TTL_MS)
            }
        });
        return { success: true };
    } catch (error) {
        console.error("Registration verification resend failed:", error);
        return { error: "We couldn't resend the verification email. Please try again." };
    }
}

export async function verifyRegistrationCode(rawEmail: string, rawCode: string) {
    const emailResult = z.string().trim().toLowerCase().email().safeParse(rawEmail);
    const codeResult = registrationCodeSchema.safeParse(rawCode.trim());

    if (!emailResult.success || !codeResult.success) {
        return { error: "Enter the valid 6-digit code sent to your email." };
    }

    const email = normalizeEmail(emailResult.data);
    const code = codeResult.data;
    const pendingVerification = await db.registrationVerification.findUnique({ where: { email } });

    if (!pendingVerification) {
        return { error: "Registration request not found. Please start again." };
    }

    if (pendingVerification.expiresAt.getTime() <= Date.now()) {
        await db.registrationVerification.delete({ where: { email } });
        return { error: "This verification code has expired. Please start again." };
    }

    if (pendingVerification.attempts >= MAX_REGISTRATION_ATTEMPTS) {
        return { error: "Too many incorrect attempts. Please request a new code." };
    }

    if (!registrationCodeMatches(pendingVerification.tokenHash, email, code)) {
        await db.registrationVerification.update({
            where: { email },
            data: { attempts: { increment: 1 } }
        });
        return { error: "Incorrect verification code." };
    }

    try {
        const user = await db.$transaction(async (tx) => {
            const existingUser = await tx.user.findUnique({ where: { email }, select: { id: true } });
            if (existingUser) throw new Error("EMAIL_ALREADY_REGISTERED");

            const createdUser = await tx.user.create({
                data: {
                    name: pendingVerification.name,
                    email,
                    password: pendingVerification.passwordHash,
                    contact: pendingVerification.contact
                },
                select: { id: true }
            });
            await tx.registrationVerification.delete({ where: { email } });
            return createdUser;
        });

        await logActivity("ACCOUNT_CREATED", `Verified account created for ${email}`, user.id);
        return { success: true };
    } catch (error) {
        if (error instanceof Error && error.message === "EMAIL_ALREADY_REGISTERED") {
            return { error: "Email already in use!" };
        }
        console.error("Registration verification failed:", error);
        return { error: "Failed to create account. Please try again." };
    }
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}

export async function updateProfile(_prevState: unknown, formData: FormData) {
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
    } catch {
        return { error: "Failed to update profile" };
    }
}

export async function changePassword(_prevState: unknown, formData: FormData) {
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

        // Delete any existing tokens for this email
        await db.passwordResetToken.deleteMany({
            where: { email }
        });

        // Save new token to DB
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

        const mediaUrlsToDelete: string[] = [];

        const user = await db.user.findUnique({
            where: { id: userId },
            select: {
                image: true,
                products: { select: { id: true } }
            }
        });
        if (!user) return { error: "Account not found" };

        if (user?.image) mediaUrlsToDelete.push(user.image);
        const productIds = user.products.map(product => product.id);
        const ownedContentFilter = {
            OR: [
                { userId },
                ...(productIds.length > 0 ? [{ productId: { in: productIds } }] : [])
            ]
        };

        const memories = await db.memory.findMany({
            where: ownedContentFilter,
            include: { media: true }
        });
        memories.forEach(mem => {
            mem.media.forEach((media) => mediaUrlsToDelete.push(media.url));
        });

        const experiences = await db.experience.findMany({
            where: {
                item: {
                    lifeList: {
                        OR: ownedContentFilter.OR
                    }
                }
            },
            include: { media: true }
        });
        experiences.forEach(exp => {
            exp.media.forEach((media) => mediaUrlsToDelete.push(media.url));
        });

        const habitLogs = await db.habitLog.findMany({
            where: {
                habit: {
                    OR: ownedContentFilter.OR
                },
                imageUrl: { not: null }
            },
            select: { imageUrl: true }
        });
        habitLogs.forEach(log => {
            if (log.imageUrl) mediaUrlsToDelete.push(log.imageUrl);
        });

        const people = await db.person.findMany({
            where: { userId },
            select: { avatarUrl: true }
        });
        people.forEach(p => {
            if (p.avatarUrl) mediaUrlsToDelete.push(p.avatarUrl);
        });

        // Explicitly remove content linked through products before deleting the user.
        // LifeList and Habit product relations use RESTRICT, so relying only on the
        // user cascade can fail depending on the database's constraint order.
        await db.$transaction(async (tx) => {
            await tx.lifeList.deleteMany({ where: ownedContentFilter });
            await tx.habit.deleteMany({ where: ownedContentFilter });
            await tx.memory.deleteMany({ where: ownedContentFilter });
            await tx.person.deleteMany({ where: { userId } });
            await tx.product.deleteMany({ where: { userId } });
            await tx.user.delete({ where: { id: userId } });
        });

        await logActivity("ACCOUNT_DELETED", `Account ${userId} deleted`);

        // Storage cleanup must not prevent account deletion. Any failed objects can
        // be retried separately, while the user's account and personal data are gone.
        try {
            await deleteStoredMedia([...new Set(mediaUrlsToDelete)]);
        } catch (error) {
            console.error("Deleted account but failed to clean up some media:", error);
        }

        return { success: true };
    } catch (error) {
        console.error("Delete Account Error:", error);
        return { error: "Failed to delete account" };
    }
}

"use server";

import { signIn, signOut } from "@/auth";
import { db } from "@/lib/db";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function authenticate(prevState: string | undefined, formData: FormData) {
  try {
    await signIn("credentials", formData);
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

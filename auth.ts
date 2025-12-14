import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { authConfig } from "@/auth.config";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        token: { label: "Token", type: "text" },
      },
      authorize: async (credentials) => {
        try {
            // 1. Check for Token Login
            if (credentials.token && typeof credentials.token === 'string') {
              const product = await db.product.findUnique({
                where: { token: credentials.token },
                include: { user: true }
              });

              if (product && product.active && product.user) {
                return product.user;
              }
              return null;
            }

            // 2. Standard Email/Password Login
            const parsedCredentials = await loginSchema.safeParseAsync(credentials);
            
            if (!parsedCredentials.success) return null;

            const { email, password } = parsedCredentials.data;

            const user = await db.user.findUnique({
                where: { email },
            });

            if (!user) return null;

            const passwordsMatch = await bcrypt.compare(password, user.password);

            if (passwordsMatch) return user;
            
            return null;
        } catch (error) {
           return null;
        }
      },
    }),
  ],
});

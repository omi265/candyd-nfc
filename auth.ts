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
            // 1. Check for Token Login (Magic Link / NFC)
            // Ensure token is a non-empty string and not "undefined"
            if (credentials.token && typeof credentials.token === 'string' && credentials.token !== "undefined" && credentials.token.length > 5) {
              const product = await db.product.findUnique({
                where: { token: credentials.token },
                include: { user: true }
              });

              if (product && product.active && product.user) {
                return {
                    id: product.user.id,
                    email: product.user.email,
                    name: product.user.name,
                    role: product.user.role,
                };
              }
              return null;
            }

            // 2. Standard Email/Password Login
            const parsedCredentials = await loginSchema.safeParseAsync(credentials);
            
            if (!parsedCredentials.success) {
                return null;
            }

            const { email, password } = parsedCredentials.data;

            const user = await db.user.findUnique({
                where: { email },
            });

            if (!user || !user.password) {
                return null;
            }

            const passwordsMatch = await bcrypt.compare(password, user.password);

            if (passwordsMatch) {
                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                };
            }
            
            return null;
        } catch (error) {
           console.error("Authentication error:", error);
           return null;
        }
      },
    }),
  ],
});

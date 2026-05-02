import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { authConfig } from "@/auth.config";

const loginSchema = z.object({
  email: z.string().min(3, "Email is too short"),
  password: z.string().min(1, "Password is required"),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  debug: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        token: { label: "Token", type: "text" },
      },
      authorize: async (credentials) => {
        try {
            console.log("[AUTH] Authorizing with credentials:", { ...credentials, password: "REDACTED" });
            
            const tokenVal = (credentials.token && typeof credentials.token === 'string' && credentials.token !== "undefined" && credentials.token.length > 5) ? credentials.token : null;
            const passwordVal = (credentials.password && typeof credentials.password === 'string') ? credentials.password : null;
            const emailVal = (credentials.email && typeof credentials.email === 'string') ? credentials.email : null;

            // 1. Token + Password Login (Verifying owner password on new device)
            if (tokenVal && passwordVal) {
                console.log("[AUTH] Token + Password login attempt:", tokenVal);
                const product = await db.product.findUnique({
                    where: { token: tokenVal },
                    include: { user: true }
                });

                if (!product || !product.active || !product.user || !product.user.password) {
                    console.log("[AUTH] Token + Password failed: Invalid product or user");
                    return null;
                }

                const passwordsMatch = await bcrypt.compare(passwordVal, product.user.password);
                if (passwordsMatch) {
                    console.log("[AUTH] Token + Password success for:", product.user.email);
                    return {
                        id: product.user.id,
                        email: product.user.email,
                        name: product.user.name,
                        role: product.user.role,
                        contact: product.user.contact,
                    };
                }
                console.log("[AUTH] Token + Password failed: Incorrect password");
                return null;
            }

            // 2. Token-only Login (Magic Link / NFC Trusted)
            if (tokenVal && !passwordVal) {
              console.log("[AUTH] Token login attempt:", tokenVal);
              const product = await db.product.findUnique({
                where: { token: tokenVal },
                include: { user: true }
              });

              if (product && product.active && product.user) {
                console.log("[AUTH] Token login success for user:", product.user.email);
                return {
                    id: product.user.id,
                    email: product.user.email,
                    name: product.user.name,
                    role: product.user.role,
                    contact: product.user.contact,
                };
              }
              console.log("[AUTH] Token login failed");
              return null;
            }

            // 3. Standard Email/Password Login
            if (emailVal && passwordVal) {
                const parsedCredentials = await loginSchema.safeParseAsync(credentials);
                
                if (!parsedCredentials.success) {
                    console.log("[AUTH] Password login failed: Invalid schema", parsedCredentials.error);
                    return null;
                }

                const { email, password } = parsedCredentials.data;
                console.log("[AUTH] Password login attempt for:", email);

                const user = await db.user.findUnique({
                    where: { email },
                });

                if (user && user.password) {
                    const passwordsMatch = await bcrypt.compare(password, user.password);

                    if (passwordsMatch) {
                        if (user.setupRequired) {
                            console.log("[AUTH] Password login failed: Setup required");
                            return null;
                        }

                        console.log("[AUTH] Password login success for user:", user.email);
                        return {
                            id: user.id,
                            email: user.email,
                            name: user.name,
                            role: user.role,
                            contact: user.contact,
                        };
                    }
                }
                console.log("[AUTH] Password login failed");
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

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import ClientLayout from "./components/ClientLayout";
import { InstallBanner } from "./components/InstallBanner";
import { Toaster } from "sonner";
import { auth } from "@/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Candyd | Relive Your Memories",
  description: "Unbox a moment. Relive a memory. Candyd uses NFC technology to link your physical products to digital experiences.",
  keywords: ["NFC", "Memories", "Digital Experiences", "Candyd", "Memory Management"],
  authors: [{ name: "Candyd Team" }],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Candyd",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#5B2D7D",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
    const session = await auth();
  
  return (
    <html lang="en" className={`${outfit.variable} ${geistSans.variable} ${geistMono.variable} ${outfit.className} antialiased`}>
      <body>
        <AuthProvider session={session}>
            <ClientLayout>{children}</ClientLayout>
            <InstallBanner />
            <Toaster position="top-center" />
        </AuthProvider>
      </body>
    </html>
  );
}

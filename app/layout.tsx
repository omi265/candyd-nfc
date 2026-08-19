import type { Metadata, Viewport } from "next";
import { Geist, Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import ClientLayout from "./components/ClientLayout";
import { Toaster } from "sonner";
import { auth } from "@/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Our Dve | Relive Your Experiences",
  description: "Our Dve uses NFC technology to link physical products to digital experiences.",
  keywords: ["Our Dve", "NFC", "Memories", "Digital Experiences", "Bucket List"],
  authors: [{ name: "Our Dve Team" }],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Our Dve",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
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
  themeColor: "#556B5A",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
    const session = await auth();
  
  return (
    <html lang="en" className={`${outfit.variable} ${geistSans.variable} ${outfit.className} antialiased`}>
      <body>
        <AuthProvider session={session}>
            <ClientLayout>{children}</ClientLayout>
            <Toaster position="top-center" />
        </AuthProvider>
      </body>
    </html>
  );
}

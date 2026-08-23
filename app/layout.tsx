import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import ClientLayout from "./components/ClientLayout";
import { Toaster } from "sonner";
import { auth } from "@/auth";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const allrounderMonument = localFont({
  src: [
    {
      path: "../public/fonts/allroundermonumenttest-regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/allroundermonumenttest-book.otf",
      weight: "350",
      style: "normal",
    },
    {
      path: "../public/fonts/allroundermonumenttest-medium.otf",
      weight: "500",
      style: "normal",
    },
  ],
  variable: "--font-allrounder",
  display: "swap",
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
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
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
    <html lang="en" className={`${poppins.variable} ${allrounderMonument.variable} ${poppins.className} antialiased`}>
      <body>
        <AuthProvider session={session}>
            <ClientLayout>{children}</ClientLayout>
            <Toaster position="top-center" />
        </AuthProvider>
      </body>
    </html>
  );
}

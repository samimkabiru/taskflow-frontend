import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { MobileNavProvider } from "@/contexts/MobileNavContext";
import { Toaster } from "@/components/ui/sonner";
import NavigationProgressBar from "@/components/layout/NavigationProgressBar";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TaskFlow — Team Task Manager",
  description:
    "A Trello-style team task manager with the Serene Workflow design system. Organize your boards, tasks, and team collaboration in one calm, focused workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`h-full ${plusJakartaSans.variable} ${inter.variable} ${ibmPlexMono.variable}`}
    >
      <body className="h-full h-dvh bg-background text-foreground antialiased overflow-hidden">
        <NavigationProgressBar />
        <ThemeProvider>
          <AuthProvider>
            <MobileNavProvider>
              {children}
              <Toaster position="bottom-right" />
            </MobileNavProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

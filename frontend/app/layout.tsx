import type { Metadata } from "next";
import "../styles/globals.css";
import PwaStatus from "@/components/PwaStatus";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Attendance",
  description: "Employee attendance and live location tracking",
  applicationName: "Attendance",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Attendance",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen text-gray-900">
        <ThemeProvider>
          <PwaStatus />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

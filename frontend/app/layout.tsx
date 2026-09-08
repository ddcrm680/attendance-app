import type { Metadata } from "next";
import "../styles/globals.css";
import PwaStatus from "@/components/PwaStatus";
import { ThemeProvider } from "@/components/ThemeProvider";
import { appBrand } from "@/lib/brand";

export const metadata: Metadata = {
  title: appBrand.name,
  description: "Employee attendance and live location tracking",
  applicationName: appBrand.name,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: appBrand.name,
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

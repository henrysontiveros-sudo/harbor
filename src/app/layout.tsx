import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import VersionBadge from "@/components/VersionBadge";
import FeedbackButton from "@/components/FeedbackButton";

const gotham = localFont({
  src: [
    { path: "../../public/fonts/Gotham-Light.otf", weight: "300", style: "normal" },
    { path: "../../public/fonts/Gotham-Book.otf", weight: "400", style: "normal" },
    { path: "../../public/fonts/Gotham-Medium.otf", weight: "500", style: "normal" },
    { path: "../../public/fonts/Gotham-Bold.otf", weight: "700", style: "normal" },
    { path: "../../public/fonts/Gotham-Black.otf", weight: "900", style: "normal" },
  ],
  variable: "--font-gotham",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Harbor · Mariners Church",
  description: "Space requests & event scheduling for Mariners Church",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={gotham.variable}>
      <body className="font-sans antialiased bg-[#F7F9FB] text-ink min-h-screen pb-16 print:pb-0">
        {children}
        <VersionBadge />
        <FeedbackButton />
      </body>
    </html>
  );
}

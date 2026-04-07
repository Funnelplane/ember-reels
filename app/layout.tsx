import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/ui/Sidebar";

export const metadata: Metadata = {
  title: "EMBER REELS",
  description: "Elite Instagram Reel Script Generator",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0A0A0A] text-[#F5F5F0] antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 ml-[220px] min-h-screen overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

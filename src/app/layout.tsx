import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "ATHLIX — Sports Academy Operating System & Talent Radar",
  description:
    "Production-ready multi-tenant SaaS for independent sports academies, coach management, practice attendance locking, match performance tracking, and automated talent trial scouting.",
  icons: {
    icon: "/images/app-icon.png",
    apple: "/images/app-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#F4F3EE] text-[#101820] min-h-screen antialiased font-sans selection:bg-[#C6F432] selection:text-[#101820]">
        {children}
        <Toaster
          position="top-right"
          theme="light"
          toastOptions={{
            style: {
              background: "#FFFFFF",
              border: "1px solid #DCE1E3",
              color: "#101820",
            },
          }}
        />
      </body>
    </html>
  );
}

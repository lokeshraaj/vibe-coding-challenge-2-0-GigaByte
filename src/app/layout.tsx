import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "ATHLIX — Multi-Tenant Sports Academy Management & Scouting Platform",
  description:
    "Production-ready multi-tenant SaaS for independent sports academies, coach management, practice attendance locking, match performance tracking, and automated talent trial scouting.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-athletic-black text-white min-h-screen antialiased font-sans selection:bg-athletic-lime selection:text-athletic-black">
        {children}
        <Toaster
          position="top-right"
          theme="dark"
          toastOptions={{
            style: {
              background: "#151817",
              border: "1px solid #292E2B",
              color: "#FFFFFF",
            },
          }}
        />
      </body>
    </html>
  );
}

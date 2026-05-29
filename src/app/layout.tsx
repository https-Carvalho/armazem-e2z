import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { UserProvider } from "@/context/UserContext";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Armazém E2Z",
  description: "Sistema de Gestão de Stock",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" className={`${plusJakartaSans.variable} h-full`} suppressHydrationWarning>
      <body className="flex h-screen overflow-hidden bg-[#EFF6FF] font-sans antialiased" suppressHydrationWarning>
        <UserProvider>
          <Sidebar />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </UserProvider>
      </body>
    </html>
  );
}

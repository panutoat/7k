import type { Metadata } from "next";
import "./globals.css";
import { UnitsProvider } from "@/lib/units-context";

export const metadata: Metadata = {
  title: "7k-combo",
  description: "ตัวช่วยจัดทีมเคาน์เตอร์ (clone)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <UnitsProvider>{children}</UnitsProvider>
      </body>
    </html>
  );
}

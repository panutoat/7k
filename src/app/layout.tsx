import type { Metadata } from "next";
import "./globals.css";
import { UnitsProvider } from "@/lib/units-context";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "7k-เสือ",
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
        {/* Apply saved theme before paint to avoid a flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.theme==='dark')document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
      </head>
      <body>
        <AuthProvider>
          <UnitsProvider>{children}</UnitsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

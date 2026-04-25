import "@/app/globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body className={`${inter.className} bg-white antialiased`}>
        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}

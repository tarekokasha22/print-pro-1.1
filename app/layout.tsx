import type { Metadata } from "next";
import { Cairo, Tajawal } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  variable: "--font-tajawal",
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Print Pro | منصة الطباعة الذكية",
  description: "منصة متكاملة للطباعة وإدارة الملفات بتقنية الذكاء الاصطناعي",
  keywords: "طباعة، PDF، تحويل ملفات، ماسح ضوئي، ذكاء اصطناعي",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={`${cairo.variable} ${tajawal.variable} font-cairo antialiased`}>
        {/* Background decorative orbs */}
        <div className="bg-orb bg-orb-gold" aria-hidden="true" />
        <div className="bg-orb bg-orb-electric" aria-hidden="true" />
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}

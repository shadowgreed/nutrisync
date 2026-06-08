import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NutriSync",
  description: "Track every micronutrient. See what your crew eats.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${geist.className} min-h-full bg-stone-950 text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}

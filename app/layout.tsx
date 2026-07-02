import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import SplashScreen from "@/components/SplashScreen";
import { I18nProvider } from "@/components/I18nProvider";
import { htmlLang } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";

const geist = Geist({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "NutriSync",
  description: "Track every micronutrient. See what your crew eats.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NutriSync",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Locale comes from the preference cookie (see lib/i18n). Reading it here
  // makes every route dynamic — acceptable: the app's core routes already are,
  // and it's what lets <html lang> and all client text render in the user's
  // language server-side with no hydration flash.
  const locale = await getLocale();
  return (
    <html lang={htmlLang(locale)} className="h-full">
      <body className={`${geist.className} min-h-full bg-stone-950 text-white antialiased`}>
        <SplashScreen />
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}

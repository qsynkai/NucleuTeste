import { AppProviders } from "@/components/providers/app-providers";
import { APP_NAME, LOGO_PATH } from "@/lib/constants/brand";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "@/app/globals.css";

const sans = Geist({
  subsets: ["latin"],
  variable: "--font-sans-ui",
  display: "swap",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono-ui",
  display: "swap",
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Central de comando de conteúdo com IA para redes sociais",
  icons: {
    icon: LOGO_PATH,
    apple: LOGO_PATH,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${mono.variable}`}>
      <body suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

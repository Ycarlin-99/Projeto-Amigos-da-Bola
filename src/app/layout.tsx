import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Amigos da Bola",
  description: "O app da pelada: calendário, presença e sorteio dos times.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Amigos da Bola",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#454a9e",
  width: "device-width",
  initialScale: 1,
  // Não bloqueia o zoom: parte do público precisa aumentar a letra.
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

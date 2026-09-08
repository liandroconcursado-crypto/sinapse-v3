import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: { default: "SINAPSE", template: "%s · SINAPSE" },
  description: "Seu vault Markdown conectado.",
  applicationName: "SINAPSE",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "SINAPSE" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0f14",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Unbounded, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";

const display = Unbounded({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600"],
  variable: "--font-display",
});
const text = Schibsted_Grotesk({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-text",
});

export const metadata: Metadata = {
  title: "Webvisit360 · 360° virtualni sprehodi",
  description:
    "360° virtualni sprehodi za občine, hotele, vinarje in trgovine. Sprehodite se, preden pridete.",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: "#081230",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sl" className={`${display.variable} ${text.variable}`}>
      <body>{children}</body>
    </html>
  );
}

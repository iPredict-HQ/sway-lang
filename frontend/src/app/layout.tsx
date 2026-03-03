import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import dynamic from "next/dynamic";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

// Dynamic import with SSR disabled — Fuel connectors require browser APIs
const Providers = dynamic(() => import("./providers").then((m) => m.Providers), {
  ssr: false,
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: "iPredict — Prediction Market on Fuel Network",
  description:
    "Predict. Win or Lose — You Always Earn. Decentralized prediction market on Fuel Network with near-zero fees and sub-second finality.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://ipredict-fuel.vercel.app"
  ),
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "iPredict — Prediction Market on Fuel Network",
    description:
      "Predict. Win or Lose — You Always Earn. Decentralized prediction market with near-zero fees.",
    images: ["/og-image.svg"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "iPredict — Prediction Market on Fuel Network",
    description:
      "Predict. Win or Lose — You Always Earn. Decentralized prediction market with near-zero fees.",
    images: ["/og-image.svg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-screen flex flex-col bg-surface text-slate-100 antialiased">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}

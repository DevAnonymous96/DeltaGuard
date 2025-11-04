import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "DeltaGuard - Predictive Impermanent Loss Management",
  description: "The first DeFi system that predicts Impermanent Loss using Black-Scholes options pricing theory and automatically protects DAO treasuries.",
  keywords: ["DeFi", "Impermanent Loss", "IL Prediction", "DAO Treasury", "Uniswap V4", "Octant", "Black-Scholes"],
  authors: [{ name: "DeltaGuard Team" }],
  openGraph: {
    title: "DeltaGuard - Predictive IL Management",
    description: "Stop losing money to impermanent loss. 73% prediction accuracy using research-grade mathematics.",
    type: "website",
    url: "https://deltaguard.xyz",
  },
  twitter: {
    card: "summary_large_image",
    title: "DeltaGuard - Predictive IL Management",
    description: "Stop losing money to impermanent loss. 73% prediction accuracy.",
    creator: "@IntelligentPOL",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
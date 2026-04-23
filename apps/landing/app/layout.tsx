import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "hyperliquid-radar — agent-native intelligence for Hyperliquid",
  description:
    "Ask Claude / Cursor / Eliza anything about Hyperliquid — liquidation risks, funding divergence, whale flows, market structure. Open source, MIT, zero user data.",
  openGraph: {
    title: "hyperliquid-radar",
    description: "The agent-native intelligence terminal for Hyperliquid. Part of cexagent.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

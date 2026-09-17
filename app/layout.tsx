import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Decomp — pair-architect a decomposition round",
  description:
    "Paste a vague ask. Co-create the board across three assessed areas on a 60-minute budget.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

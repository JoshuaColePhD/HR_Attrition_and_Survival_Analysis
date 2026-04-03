import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Executive Attrition Risk Dashboard",
  description:
    "Aggregated attrition risk dashboard for executive and HR decision support.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { Anton, DM_Sans } from "next/font/google";
import "./globals.css";

const anton = Anton({ variable: "--font-anton", weight: "400", subsets: ["latin"] });
const dmSans = DM_Sans({ variable: "--font-dm-sans", weight: ["500", "700"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Part Time Kiln Watcher",
  description: "Is the kiln firing, full or empty?",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${anton.variable} ${dmSans.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}

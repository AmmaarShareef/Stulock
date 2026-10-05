import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StuLock",
  description: "A self-imposed study proctor.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

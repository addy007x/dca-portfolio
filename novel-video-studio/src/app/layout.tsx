import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Novel Video Studio",
  description: "แปลงนิยายเป็นเสียง ซับ และวิดีโอแนวตั้งด้วย AI",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body>{children}</body></html>;
}

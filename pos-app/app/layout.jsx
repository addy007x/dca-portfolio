import "./globals.css";

export const metadata = {
  title: "SiamFolio Grocery POS",
  description: "ระบบขายหน้าร้านและจัดการสต๊อกสำหรับร้านขายของชำ"
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}

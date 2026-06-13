import "./globals.css";

export const metadata = {
  title: "SiamFolio Cashier",
  description: "ระบบแคชเชียร์ ขายหน้าร้าน และจัดการสต๊อกสำหรับร้านขายของชำ"
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}

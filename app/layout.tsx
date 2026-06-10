import "./globals.css";

export const metadata = {
  title: "Sowers Monster",
  description: "Sowers育成アプリ"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

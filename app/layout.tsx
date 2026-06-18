import "./globals.css";

export const metadata = {
  title: "たねもん",
  description: "sowers たねもん（育成アプリ）",
  manifest: undefined,
  appleWebApp: { capable: true, title: "たねもん", statusBarStyle: "default" as const },
  icons: {
    icon: "/icon-512.png",
    apple: "/apple-touch-icon.png"
  }
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

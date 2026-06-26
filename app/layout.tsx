import "./globals.css";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const
};

export const metadata = {
  title: "たねもん",
  description: "sowers たねもん（育成アプリ）",
  manifest: "/manifest.webmanifest",
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://rybsturojrcqjdklbaih.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://rybsturojrcqjdklbaih.supabase.co" />
        <link
          href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'ERTH Document Vault',
  description: 'Central Corporate Multi-Vertical Operating Vault',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ERTH',
  },
};

export const viewport: Viewport = {
  themeColor: '#166534',
  width: 1024,
  initialScale: 0.38,
  maximumScale: 2,
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon.png" />
      </head>
      <body className="antialiased min-w-[1024px] bg-slate-100">{children}</body>
    </html>
  );
}

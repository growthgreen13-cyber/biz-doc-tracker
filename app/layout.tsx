import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Earth Document Vault',
  description: 'Enterprise compliance & multi-vertical criteria tracker',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Earth Vault',
  },
};

// Setting a desktop-scale viewport width so phones display the full desktop layout
export const viewport: Viewport = {
  themeColor: '#0f172a',
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
        <link rel="apple-touch-icon" href="https://cdn-icons-png.flaticon.com/512/2991/2991108.png" />
      </head>
      <body className="antialiased min-w-[1024px] bg-slate-100">{children}</body>
    </html>
  );
}

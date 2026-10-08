import './globals.css';

export const metadata = {
  title: 'Business Document Tracker',
  description: 'Compliance & document readiness tracker',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

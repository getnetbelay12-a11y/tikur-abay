import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tikur Abay Customer Portal',
  description: 'Customer shipments, agreements, payments, and support',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

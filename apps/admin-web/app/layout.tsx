import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Tikur Abay Transport Operations Platform',
  description: 'Admin operations console for freight, dispatch, tracking, and compliance.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}


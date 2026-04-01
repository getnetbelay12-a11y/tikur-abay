import './globals.css';
import 'leaflet/dist/leaflet.css';
import type { Metadata } from 'next';
import { Manrope, IBM_Plex_Sans } from 'next/font/google';
import { ConsoleShell } from '../components/console-shell';
import { TrackingStoreSync } from '../components/tracking-store-sync';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tikur Abay Manager Console',
  description: 'Shipment-first corridor console from China supplier handoff to Djibouti release, inland delivery, customer approval, and empty return.',
  icons: {
    icon: '/branding/tikur-abay-logo.png',
    shortcut: '/branding/tikur-abay-logo.png',
    apple: '/branding/tikur-abay-logo.png',
  },
};

const fontSans = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const fontDisplay = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fontSans.variable} ${fontDisplay.variable}`}>
      <body>
        <TrackingStoreSync />
        <ConsoleShell>{children}</ConsoleShell>
      </body>
    </html>
  );
}

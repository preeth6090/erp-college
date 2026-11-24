import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'College ERP', template: '%s — College ERP' },
  description: 'Complete 30-module Indian college & higher-education management system (NEP 2020, NAAC ready).',
  authors: [{ name: 'Timestamp India' }],
  creator: 'Timestamp India',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-slate-50 font-sans text-slate-800 antialiased">{children}</body>
    </html>
  );
}

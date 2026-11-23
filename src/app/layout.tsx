import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'College ERP', template: '%s — College ERP' },
  description: 'Complete 30-module Indian college & higher-education management system (NEP 2020, NAAC ready).',
  authors: [{ name: 'Timestamp India' }],
  creator: 'Timestamp India',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-800 antialiased">{children}</body>
    </html>
  );
}

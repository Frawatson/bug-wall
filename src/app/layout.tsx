import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bug Wall — by grapple-pr',
  description: 'A wall of the worst, weirdest, and most embarrassing bugs ever shipped.',
  openGraph: {
    title: 'Bug Wall',
    description: 'A wall of the worst, weirdest, and most embarrassing bugs ever shipped.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-mono antialiased">{children}</body>
    </html>
  );
}

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Code Battle',
  description: 'Fast-paced friendly coding battles.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-neutral-950 text-neutral-50 selection:bg-emerald-500/30">
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/contexts/Providers';

export const metadata: Metadata = {
  title: 'Report Collection',
  description: 'Report Collection for SparksAI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}



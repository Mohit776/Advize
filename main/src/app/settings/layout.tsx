'use client';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <div className="min-h-screen bg-background">
        <PublicHeader />
        <main className="container py-6 md:py-10 px-4 md:px-8">{children}</main>
        <PublicFooter />
    </div>
  );
}

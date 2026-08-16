import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';

export default function PublicProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-dvh bg-background">
      <PublicHeader />

      {/* Main content */}
      <main className="flex-1 container py-6 md:py-10 px-4 md:px-8 max-w-screen-xl mx-auto">
        {children}
      </main>

      <PublicFooter />
    </div>
  );
}

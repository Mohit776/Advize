import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { Sidebar } from '@/components/layout/sidebar';

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-dvh bg-background">
      <PublicHeader />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 container py-6 md:py-10 px-4 md:px-8 flex flex-col overflow-auto">
          {children}
        </main>
      </div>
      <PublicFooter />
    </div>
  );
}

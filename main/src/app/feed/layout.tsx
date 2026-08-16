'use client';

import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { Sidebar } from '@/components/layout/sidebar';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function FeedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isUserLoading) return;

    if (!user) {
      // Not logged in at all — send to login
      router.replace('/login');
      return;
    }

    if (!user.emailVerified) {
      // Logged in but email not verified — send to verification
      router.replace('/auth/verify-email');
      return;
    }
  }, [user, isUserLoading, router]);

  // Show loading spinner while auth state is resolving
  if (isUserLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
        </div>
      </div>
    );
  }

  // While redirect is in-flight, show nothing
  if (!user || !user.emailVerified) {
    return null;
  }

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

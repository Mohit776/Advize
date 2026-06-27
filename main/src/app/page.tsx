'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { Sidebar } from '@/components/layout/sidebar';
import { HeroSection } from './_components/hero-section';
import { HowItWorks } from './_components/how-it-works';
import { Testimonials } from './_components/testimonials';
import { Faq } from './_components/faq';
import { Mission } from './_components/mission';
import { Ecosystem } from './_components/ecosystem';
import { ForCreators } from './_components/for-creators';
import { ForBrands } from './_components/for-brands';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && user) {
      // Use window.location.replace as primary redirect — this works on mobile
      // (including PWA standalone mode & Safari) even before full hydration.
      // router.replace is kept as a fallback for environments without window.
      if (typeof window !== 'undefined') {
        window.location.replace('/feed');
      } else {
        router.replace('/feed');
      }
    }
  }, [user, isUserLoading, router]);

  // While Firebase is checking auth state, show a full-screen spinner.
  // This prevents the landing page from flashing for logged-in users,
  // and gives non-logged-in users instant visual feedback.
  if (isUserLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
        </div>
      </div>
    );
  }

  // Already authenticated — redirect is in-flight via useEffect above
  if (user) return null;

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <HeroSection />
          <HowItWorks />
          <Mission />
          <Ecosystem />
          <ForCreators />
          <ForBrands />
          <Testimonials />
          <Faq />
        </main>
      </div>
      <PublicFooter />
    </div>
  );
}

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

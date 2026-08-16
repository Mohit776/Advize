'use client';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MoveRight } from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export function HeroSection() {
  const heroImage = PlaceHolderImages.find(p => p.id === 'hero-image');

  return (
    <section className="relative bg-background">
      <div className="container relative z-10 grid md:grid-cols-2 items-center gap-8 md:gap-12 py-8 px-4 sm:px-6 md:py-28">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 overflow-hidden"
        >
          <div className="absolute left-0 top-0 h-[48rem] w-full bg-[radial-gradient(100%_40%_at_50%_0%,hsl(var(--primary)/0.1),transparent)]"></div>
        </div>
        <div className="max-w-xl text-center md:text-left">
          <h1 className="text-3xl font-bold tracking-tighter text-foreground font-headline sm:text-4xl md:text-5xl lg:text-6xl">
            Connect Brands with Verified Creators
          </h1>
          <p className="mt-6 text-lg text-muted-foreground md:text-xl">
            Transparent, data-driven influencer campaigns built on trust.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row md:justify-start">
            <Button size="lg" asChild className="btn-primary w-full sm:w-auto">
              <Link href="/signup?role=creator">
                Join as Creator
                <MoveRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
              <Link href="/signup?role=business">
                Join as Business
              </Link>
            </Button>
          </div>
        </div>
        <div className="relative hidden md:block">
          {heroImage && (
            <Image
              src={heroImage.imageUrl}
              alt="Advize platform illustration"
              width={600}
              height={600}
              className="rounded-xl shadow-2xl shadow-primary/10"
              data-ai-hint={heroImage.imageHint}
            />
          )}
        </div>
      </div>
    </section>
  );
}

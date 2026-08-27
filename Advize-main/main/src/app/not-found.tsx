import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/layout/public-header';
import { FileQuestion, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <div className="flex aspect-square w-20 items-center justify-center rounded-full bg-primary/10 mb-8 shadow-sm">
          <FileQuestion className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-foreground">
          404
        </h1>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Page not found
        </h2>
        <p className="mt-4 max-w-md text-base text-muted-foreground sm:text-lg">
          Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Button asChild size="lg" className="rounded-full shadow-md transition-transform hover:scale-105 active:scale-95">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

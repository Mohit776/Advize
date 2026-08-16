'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('[GlobalError boundary]', error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-6 text-center">
      <div className="max-w-md w-full">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center ring-4 ring-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">
          Something went wrong
        </h1>
        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
          An unexpected error occurred. This is usually temporary — try refreshing the page.
        </p>

        {/* Error detail (dev only) */}
        {process.env.NODE_ENV === 'development' && (
          <p className="text-xs text-destructive/70 font-mono bg-destructive/5 border border-destructive/10 rounded-xl px-4 py-3 mb-6 text-left break-all">
            {error?.message ?? 'Unknown error'}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={reset}
            className="gap-2 rounded-xl"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
          <Button asChild variant="outline" className="gap-2 rounded-xl">
            <Link href="/">
              <Home className="h-4 w-4" />
              Go home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

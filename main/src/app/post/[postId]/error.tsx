'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function PostError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('[PostPage error boundary]', error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-6 text-center">
      <div className="max-w-md w-full">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Couldn&apos;t load this post
        </h1>
        <p className="text-muted-foreground text-sm mb-8">
          There was a problem loading this post. It may have been deleted or is temporarily unavailable.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} className="gap-2 rounded-xl">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
          <Button asChild variant="outline" className="gap-2 rounded-xl">
            <Link href="/feed">
              <ArrowLeft className="h-4 w-4" />
              Back to feed
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

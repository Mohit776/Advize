'use client';

import { useEffect } from 'react';

/**
 * Root-level error boundary that catches errors in the root layout itself
 * (FirebaseClientProvider, FCMProvider, etc.).
 *
 * Next.js shows "Application error: a client-side exception has occurred"
 * when there is NO global-error.tsx to handle layout-level crashes.
 * This component replaces that opaque message with a recoverable UI.
 *
 * NOTE: global-error.tsx must provide its own <html> and <body> tags
 * because the root layout is NOT rendered when this error boundary activates.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0f',
          color: '#e4e4e7',
          fontFamily:
            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center', padding: 24 }}>
          {/* Icon */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(239,68,68,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </div>

          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              margin: '0 0 8px',
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: 14,
              color: '#a1a1aa',
              lineHeight: 1.6,
              margin: '0 0 32px',
            }}
          >
            An unexpected error occurred. This is usually temporary — try
            refreshing the page.
          </p>

          <div
            style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={reset}
              style={{
                padding: '12px 24px',
                borderRadius: 12,
                border: 'none',
                background: '#7c3aed',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <button
              onClick={() => (window.location.href = '/')}
              style={{
                padding: '12px 24px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent',
                color: '#e4e4e7',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Go home
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

'use client';

import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

interface GoogleAuthButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  text?: string;
}

export function GoogleAuthButton({
  onClick,
  isLoading = false,
  disabled = false,
  text = 'Continue with ',
}: GoogleAuthButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full relative bg-background hover:bg-muted flex items-center justify-center gap-2"
      onClick={onClick}
      disabled={disabled || isLoading}
    >
      {isLoading && <Loader2 className="h-6 w-6 animate-spin" />}
      
      {!isLoading && (
        <>
          <span>{text}</span>
          <div className="relative h-16 w-16">
            <Image
              src="/Google-Logo.png"
              alt="Google Logo"
              fill
              className="object-contain"
            />
          </div>
        </>
      )}
    </Button>
  );
}

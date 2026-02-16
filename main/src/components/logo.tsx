
import Link from 'next/link';
import { cn } from '@/lib/utils';

type LogoProps = {
  className?: string;
};

export function Logo({ className }: LogoProps) {
  return (
    <Link href="/" className={cn("flex items-center", className)}>
      <span className="text-2xl font-bold font-headline tracking-tighter">
        <span className="text-primary">Ad</span>
        <span>vize</span>
      </span>
    </Link>
  );
}

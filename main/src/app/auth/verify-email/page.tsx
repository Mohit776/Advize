
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/firebase';
import { Loader2, MailCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function VerifyEmailPage() {
  const auth = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Periodically check the user's verification status
    const interval = setInterval(async () => {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          clearInterval(interval);
          const storedRole = localStorage.getItem('signupRole') || 'creator';
          router.replace(`/login?role=${storedRole}`);
        }
      }
    }, 3000); // Check every 3 seconds

    // Initial check in case the user is already verified when landing here
    if (auth.currentUser && auth.currentUser.emailVerified) {
      clearInterval(interval);
      const storedRole = localStorage.getItem('signupRole') || 'creator';
      router.replace(`/login?role=${storedRole}`);
    } else {
      setIsChecking(false);
    }

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [auth, router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4">
      <div className="flex flex-1 items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="items-center text-center">
            <MailCheck className="h-12 w-12 text-green-500" />
            <CardTitle className="font-headline text-2xl pt-4">Verify Your Email</CardTitle>
            <CardDescription>
              A verification link has been sent to your registered email address.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-muted-foreground">
              Please click the link in the email to activate your account. This page will automatically redirect after you've been verified.
            </p>

            <div className="flex items-center justify-center space-x-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Waiting for verification...</span>
            </div>

            <Button asChild className="w-full" variant="outline">
              <Link href="/login">
                Back to Login
              </Link>
            </Button>

            <p className="text-xs text-muted-foreground pt-4">
              Didn't receive an email? Check your spam folder or try signing up again.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

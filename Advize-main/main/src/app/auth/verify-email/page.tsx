
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth, useUser } from '@/firebase';
import { Loader2, MailCheck, ShieldCheck, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export default function VerifyEmailPage() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown timer for resend button
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Redirect if already verified
  useEffect(() => {
    if (user && user.emailVerified) {
      const storedRole = localStorage.getItem('signupRole') || 'creator';
      router.replace(`/login?role=${storedRole}`);
    }
  }, [user, router]);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    setErrorMsg('');
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      handleVerify();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pastedData) return;

    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);
    setErrorMsg('');

    // Focus the next empty input or the last one
    const nextEmpty = newOtp.findIndex((v) => !v);
    const focusIndex = nextEmpty === -1 ? OTP_LENGTH - 1 : nextEmpty;
    inputRefs.current[focusIndex]?.focus();
  };

  const handleVerify = useCallback(async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== OTP_LENGTH) {
      setErrorMsg('Please enter the complete 6-digit code.');
      return;
    }

    if (!user) {
      setErrorMsg('No user session found. Please sign up again.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg('');

    try {
      const functions = getFunctions(undefined, 'us-central1');
      const verifyOtpFn = httpsCallable(functions, 'verifyOtp');
      await verifyOtpFn({ uid: user.uid, otp: otpValue });

      setIsVerified(true);
      toast({
        title: 'Email Verified!',
        description: 'Your account has been verified successfully.',
      });

      // Reload user to pick up emailVerified = true, then redirect
      await user.reload();
      const storedRole = localStorage.getItem('signupRole') || 'creator';
      setTimeout(() => {
        router.replace(`/login?role=${storedRole}`);
      }, 1500);
    } catch (error: any) {
      const message = error?.message || 'Verification failed. Please try again.';
      setErrorMsg(message);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  }, [otp, user, router, toast]);

  const handleResend = async () => {
    if (cooldown > 0 || !user) return;

    setIsResending(true);
    setErrorMsg('');

    try {
      const functions = getFunctions(undefined, 'us-central1');
      const sendOtpFn = httpsCallable(functions, 'sendOtp');
      await sendOtpFn({ uid: user.uid });

      setCooldown(RESEND_COOLDOWN);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();

      toast({
        title: 'Code Resent',
        description: 'A new verification code has been sent to your email.',
      });
    } catch (error: any) {
      const message = error?.message || 'Failed to resend code. Please try again.';
      setErrorMsg(message);
    } finally {
      setIsResending(false);
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4">
      <div className="flex flex-1 items-center justify-center w-full">
        <Card className="w-full max-w-md">
          <CardHeader className="items-center text-center">
            {isVerified ? (
              <ShieldCheck className="h-12 w-12 text-green-500" />
            ) : (
              <MailCheck className="h-12 w-12 text-primary" />
            )}
            <CardTitle className="font-headline text-2xl pt-4">
              {isVerified ? 'Email Verified!' : 'Verify Your Email'}
            </CardTitle>
            <CardDescription>
              {isVerified
                ? 'Redirecting you to login...'
                : `Enter the 6-digit code sent to ${user?.email || 'your email'}.`}
            </CardDescription>
          </CardHeader>

          {!isVerified && (
            <CardContent className="space-y-6">
              {/* OTP Input Boxes */}
              <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    autoFocus={index === 0}
                    disabled={isVerifying}
                    className={`
                      w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold
                      rounded-lg border-2 bg-background
                      transition-all duration-200 outline-none
                      focus:border-primary focus:ring-2 focus:ring-primary/20
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${errorMsg ? 'border-destructive' : 'border-border'}
                    `}
                  />
                ))}
              </div>

              {/* Error message */}
              {errorMsg && (
                <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/10 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>{errorMsg}</p>
                </div>
              )}

              {/* Verify button */}
              <Button
                onClick={handleVerify}
                disabled={isVerifying || otp.join('').length !== OTP_LENGTH}
                className="w-full"
                size="lg"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...
                  </>
                ) : (
                  'Verify Email'
                )}
              </Button>

              {/* Resend section */}
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Didn&apos;t receive a code?
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResend}
                  disabled={cooldown > 0 || isResending}
                >
                  {isResending ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" /> Sending...
                    </>
                  ) : cooldown > 0 ? (
                    `Resend in ${cooldown}s`
                  ) : (
                    'Resend Code'
                  )}
                </Button>
              </div>

              <div className="flex justify-center">
                <Button asChild variant="outline" size="sm">
                  <Link href="/login">Back to Login</Link>
                </Button>
              </div>
            </CardContent>
          )}

          {isVerified && (
            <CardContent className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}

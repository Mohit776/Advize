
'use client';

import { Suspense } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Star, Briefcase, Loader2 } from 'lucide-react';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { useEffect, useState } from "react";
import { useAuth, useFirestore, useUser, setDocumentNonBlocking } from '@/firebase';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, sendEmailVerification } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { doc, getDoc, serverTimestamp } from 'firebase/firestore';

const formSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
});

type Role = 'creator' | 'business';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();

  const initialRole = searchParams.get('role') === 'business' ? 'business' : 'creator';
  const [role, setRole] = useState<Role>(initialRole);
  const [isLoading, setIsLoading] = useState(false);

  // This effect will run when the user state changes to logged in.
  useEffect(() => {
    const handleRedirect = async () => {
      if (user && !isUserLoading) {
        if (!user.emailVerified) {
          await sendEmailVerification(user);
          await auth.signOut(); // Log the user out immediately after sending the link
          router.replace('/auth/verify-email'); // Redirect to the verification page
          return;
        }

        setIsLoading(true); // Show loading spinner while we fetch role
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          // User exists, this is a subsequent login.
          const userRole = userDoc.data().role;
          if (userRole === 'business') {
            router.replace('/business/profile');
          } else { // 'creator'
            router.replace(`/creator/profile/${user.uid}`);
          }
        } else {
          // This is a new, verified user's first login. Create their profile documents.
          // Check localStorage first (set during signup), then URL param, then default
          const storedRole = localStorage.getItem('signupRole');
          const urlRole = searchParams.get('role');
          const userRoleFromUrl = storedRole || urlRole || 'creator';

          // Debug logging
          console.log('=== New User Role Detection ===');
          console.log('storedRole from localStorage:', storedRole);
          console.log('urlRole from searchParams:', urlRole);
          console.log('Final role assigned:', userRoleFromUrl);

          // Clear the stored role after reading it
          if (storedRole) {
            localStorage.removeItem('signupRole');
          }

          // Create main user document
          await setDocumentNonBlocking(userDocRef, {
            id: user.uid,
            email: user.email,
            name: user.displayName || user.email, // Fallback name
            role: userRoleFromUrl,
            createdAt: serverTimestamp(),
          }, { merge: true });

          // Create role-specific profile and redirect to the setup page
          if (userRoleFromUrl === 'business') {
            const profileRef = doc(firestore, `users/${user.uid}/businessProfile`, user.uid);
            await setDocumentNonBlocking(profileRef, {
              id: user.uid,
              userId: user.uid,
            }, { merge: true });
            router.replace('/business/setup-profile');
          } else { // 'creator'
            const profileRef = doc(firestore, `users/${user.uid}/creatorProfile`, user.uid);
            await setDocumentNonBlocking(profileRef, {
              id: user.uid,
              userId: user.uid,
            }, { merge: true });
            router.replace('/creator/profile/edit');
          }
        }
      }
    };

    handleRedirect();
  }, [user, isUserLoading, router, firestore, auth, toast, searchParams]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      // The useEffect hook will handle redirection once the user state is updated.

    } catch (error: any) {
      console.error("Login failed:", error);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.code === 'auth/invalid-credential' ? 'Account not found for this email. Please check and try again.' : 'An unexpected error occurred.',
      });
      setIsLoading(false);
    }
  }

  useEffect(() => {
    form.reset();
  }, [role, form]);

  if (isUserLoading || (user && isLoading)) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <h2 className="text-2xl font-semibold tracking-tight">
            Just a moment...
          </h2>
          <p className="text-muted-foreground">
            Preparing your dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center py-12 px-4 md:px-8">
      {isLoading ? (
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <h2 className="text-2xl font-semibold tracking-tight">
            Logging you in...
          </h2>
          <p className="text-muted-foreground">
            Please wait while we prepare your dashboard.
          </p>
        </div>
      ) : (
        <Tabs value={role} onValueChange={(value) => setRole(value as Role)} className="w-full max-w-xl">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="creator">
              <Star className="mr-2 h-4 w-4" /> Creator Login
            </TabsTrigger>
            <TabsTrigger value="business">
              <Briefcase className="mr-2 h-4 w-4" /> Business Login
            </TabsTrigger>
          </TabsList>
          <TabsContent value="creator">
            <Card>
              <CardHeader>
                <CardTitle className="font-headline">Creator Login</CardTitle>
                <CardDescription>Access your creator dashboard.</CardDescription>
              </CardHeader>
              <CardContent>
                <AuthForm form={form} onSubmit={onSubmit} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="business">
            <Card>
              <CardHeader>
                <CardTitle className="font-headline">Business Login</CardTitle>
                <CardDescription>Access your business dashboard.</CardDescription>
              </CardHeader>
              <CardContent>
                <AuthForm form={form} onSubmit={onSubmit} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function AuthForm({ form, onSubmit }: { form: any; onSubmit: (values: any) => void }) {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');
  const role = roleParam === 'business' ? 'business' : 'creator';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="name@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="********" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex items-center justify-between">
          <Button type="submit" className="w-full">Login</Button>
        </div>
        <div className="text-center text-sm">
          <Link href="/forgot-password" className="underline text-muted-foreground hover:text-primary">
            Forgot password?
          </Link>
        </div>
        <div className="mt-4 text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link href={`/signup?role=${role}`} className="underline hover:text-primary">
            Sign up
          </Link>
        </div>
      </form>
    </Form>
  );
}

function LoginSkeleton() {
  return (
    <div className="w-full max-w-md">
      <div className="grid grid-cols-2 gap-x-2 mb-2 p-1 rounded-md bg-muted h-10">
        <Skeleton className="h-full w-full rounded-sm" />
        <Skeleton className="h-full w-full rounded-sm" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-3/4 mx-auto" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <PublicHeader />
      <main className="flex flex-1 flex-col items-center justify-center">
        <Suspense fallback={<LoginSkeleton />}>
          <LoginContent />
        </Suspense>
      </main>
      <PublicFooter />
    </div>
  );
}

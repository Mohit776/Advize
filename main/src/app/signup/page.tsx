
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
import { Star, Briefcase } from 'lucide-react';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { useEffect, useState } from 'react';
import { useAuth } from '@/firebase';
import { createUserWithEmailAndPassword, setPersistence, browserLocalPersistence, sendEmailVerification, updateProfile } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';

const passwordSchema = z.string().min(8, 'Password must be at least 8 characters.');

const creatorFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Invalid email address.'),
  password: passwordSchema,
  confirmPassword: passwordSchema,
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and privacy policy.',
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const businessFormSchema = z.object({
  brandName: z.string().min(2, 'Brand name must be at least 2 characters.'),
  email: z.string().email('Invalid email address.'),
  password: passwordSchema,
  confirmPassword: passwordSchema,
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and privacy policy.',
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type Role = 'creator' | 'business';

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const { toast } = useToast();
  const initialRole = searchParams.get('role') === 'business' ? 'business' : 'creator';
  const [role, setRole] = useState<Role>(initialRole);
  const [isLoading, setIsLoading] = useState(false);

  const creatorForm = useForm<z.infer<typeof creatorFormSchema>>({
    resolver: zodResolver(creatorFormSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '', acceptTerms: false },
  });

  const businessForm = useForm<z.infer<typeof businessFormSchema>>({
    resolver: zodResolver(businessFormSchema),
    defaultValues: { brandName: '', email: '', password: '', confirmPassword: '', acceptTerms: false },
  });

  useEffect(() => {
    creatorForm.reset();
    businessForm.reset();
  }, [role, creatorForm, businessForm]);

  async function onCreatorSubmit(values: z.infer<typeof creatorFormSchema>) {
    setIsLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: values.name });
      await sendEmailVerification(user);

      // Store the intended role for after email verification
      localStorage.setItem('signupRole', 'creator');
      router.push(`/auth/verify-email`);

    } catch (error: any) {
      console.error('Creator signup failed:', error);
      if (error.code === 'auth/email-already-in-use') {
        toast({
          variant: 'destructive',
          title: 'Email Already Registered',
          description: 'This email is already in use. Please log in or use a different email.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Signup Failed',
          description: error.message || 'An unexpected error occurred.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function onBusinessSubmit(values: z.infer<typeof businessFormSchema>) {
    setIsLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: values.brandName });
      await sendEmailVerification(user);

      // Store the intended role for after email verification
      localStorage.setItem('signupRole', 'business');
      router.push('/auth/verify-email');

    } catch (error: any) {
      console.error('Business signup failed:', error);
      if (error.code === 'auth/email-already-in-use') {
        toast({
          variant: 'destructive',
          title: 'Email Already Registered',
          description: 'This email is already in use. Please log in or use a different email.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Signup Failed',
          description: error.message || 'An unexpected error occurred.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center py-12 px-4 md:px-8">
      <Tabs value={role} onValueChange={(value) => setRole(value as Role)} className="w-full max-w-xl">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="creator"><Star className="mr-2 h-4 w-4" /> Creator Signup</TabsTrigger>
          <TabsTrigger value="business"><Briefcase className="mr-2 h-4 w-4" /> Business Signup</TabsTrigger>
        </TabsList>
        <TabsContent value="creator">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Create a Creator Account</CardTitle>
              <CardDescription>Join our network of talented creators.</CardDescription>
            </CardHeader>
            <CardContent>
              <CreatorSignupForm form={creatorForm} onSubmit={onCreatorSubmit} isLoading={isLoading} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Create a Business Account</CardTitle>
              <CardDescription>Find the perfect creators for your brand.</CardDescription>
            </CardHeader>
            <CardContent>
              <BusinessSignupForm form={businessForm} onSubmit={onBusinessSubmit} isLoading={isLoading} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CreatorSignupForm({ form, onSubmit, isLoading }: { form: any; onSubmit: any; isLoading: boolean; }) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="Aisha Sharma" {...field} disabled={isLoading} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="aisha.sharma@example.com" {...field} disabled={isLoading} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="password" render={({ field }) => (
            <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} disabled={isLoading} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="confirmPassword" render={({ field }) => (
            <FormItem><FormLabel>Confirm Password</FormLabel><FormControl><Input type="password" {...field} disabled={isLoading} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <FormField
          control={form.control}
          name="acceptTerms"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isLoading}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  I agree to the{' '}
                  <Link href="/terms" className="underline hover:text-primary" target="_blank">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="underline hover:text-primary" target="_blank">
                    Privacy Policy
                  </Link>
                  .
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? "Creating Account..." : "Create Account"}</Button>
        <div className="mt-4 text-center text-sm">
          Already have an account? <Link href="/login?role=creator" className="underline hover:text-primary">Login</Link>
        </div>
      </form>
    </Form>
  );
}

function BusinessSignupForm({ form, onSubmit, isLoading }: { form: any; onSubmit: any; isLoading: boolean; }) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="brandName" render={({ field }) => (
          <FormItem><FormLabel>Brand Name</FormLabel><FormControl><Input placeholder="Your Company Inc." {...field} disabled={isLoading} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem><FormLabel>Business Email</FormLabel><FormControl><Input placeholder="work@company.com" {...field} disabled={isLoading} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="password" render={({ field }) => (
            <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} disabled={isLoading} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="confirmPassword" render={({ field }) => (
            <FormItem><FormLabel>Confirm Password</FormLabel><FormControl><Input type="password" {...field} disabled={isLoading} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <FormField
          control={form.control}
          name="acceptTerms"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isLoading}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  I agree to the{' '}
                  <Link href="/terms" className="underline hover:text-primary" target="_blank">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="underline hover:text-primary" target="_blank">
                    Privacy Policy
                  </Link>
                  .
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? "Creating Account..." : "Create Account & Setup Profile"}</Button>
        <div className="mt-4 text-center text-sm">
          Already have an account? <Link href="/login?role=business" className="underline hover:text-primary">Login</Link>
        </div>
      </form>
    </Form>
  );
}

function SignupSkeleton() {
  return (
    <div className="w-full max-w-lg">
      <div className="grid grid-cols-2 gap-x-2 mb-2 p-1 rounded-md bg-muted h-10">
        <Skeleton className="h-full w-full rounded-sm" />
        <Skeleton className="h-full w-full rounded-sm" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-10 w-full" /></div>
            <div className="space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-10 w-full" /></div>
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-3/4 mx-auto" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <PublicHeader />
      <main className="flex flex-1 flex-col items-center justify-center">
        <Suspense fallback={<SignupSkeleton />}>
          <SignupContent />
        </Suspense>
      </main>
      <PublicFooter />
    </div>
  );
}


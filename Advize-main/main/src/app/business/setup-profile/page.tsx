'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, setDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect } from 'react';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';

const profileFormSchema = z.object({
  brandName: z.string().min(2, 'Brand name is too short'),
  tagline: z.string().max(100, 'Tagline is too long').optional(),
  industry: z.string().min(2, 'Industry is required'),
  location: z.string().min(2, 'Location is required'),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  about: z.string().max(500, 'About section is too long').optional(),
  email: z.string().email('Invalid email address'),
  twitter: z.string().optional(),
  instagram: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function SetupBusinessProfilePage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const businessProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, `users/${user.uid}/businessProfile`, user.uid) : null),
    [user, firestore]
  );
  
  const { data: businessProfileData, isLoading: isProfileLoading } = useDoc<any>(businessProfileRef);
  
  const userRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userData, isLoading: isUserDocLoading } = useDoc<any>(userRef);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      brandName: '',
      email: '',
      tagline: '',
      industry: '',
      location: '',
      website: '',
      about: '',
      twitter: '',
      instagram: '',
    },
    mode: 'onChange',
  });

  useEffect(() => {
    if (businessProfileData && userData) {
      form.reset({
        brandName: userData.name || '',
        email: userData.email || '',
        tagline: businessProfileData.tagline || '',
        industry: businessProfileData.industryType || '',
        location: businessProfileData.location || '',
        website: businessProfileData.companyWebsite || '',
        about: businessProfileData.about || '',
        twitter: businessProfileData.twitter || '',
        instagram: businessProfileData.instagram || '',
      });
    } else if (userData) { // Pre-fill from user doc if profile doc isn't ready
      form.reset({
        ...form.getValues(),
        brandName: userData.name || '',
        email: userData.email || '',
      })
    }
  }, [businessProfileData, userData, form]);


  async function onSubmit(data: ProfileFormValues) {
    if (!user) {
        toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
        return;
    }
    
    const userDocRef = doc(firestore, 'users', user.uid);
    setDocumentNonBlocking(userDocRef, {
        name: data.brandName,
        email: data.email,
    }, { merge: true });

    const profileDocRef = doc(firestore, `users/${user.uid}/businessProfile`, user.uid);
    setDocumentNonBlocking(profileDocRef, {
        userId: user.uid,
        tagline: data.tagline,
        industryType: data.industry,
        location: data.location,
        companyWebsite: data.website,
        about: data.about,
        twitter: data.twitter,
        instagram: data.instagram,
    }, { merge: true });

    toast({
      title: 'Profile Saved!',
      description: 'Your business profile has been created successfully.',
    });
    router.push('/business/profile');
  }

  const isLoading = isUserLoading || isProfileLoading || isUserDocLoading;
  
  if (isLoading) {
    return (
        <div className="flex flex-col min-h-dvh">
            <PublicHeader />
            <main className="flex-1 flex items-center justify-center">
                <div className="w-full max-w-4xl mx-auto space-y-6 p-4">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                    <Skeleton className="h-96 w-full" />
                    <Skeleton className="h-96 w-full" />
                    <div className="flex justify-end">
                        <Skeleton className="h-10 w-40" />
                    </div>
                </div>
            </main>
            <PublicFooter />
        </div>
    )
  }
  
  if (!isUserLoading && !user) {
     router.replace('/login');
     return null;
  }

  return (
    <div className="flex flex-col min-h-dvh">
     <PublicHeader />
     <main className="flex-1 flex items-center justify-center py-12">
        <div className="w-full max-w-4xl mx-auto space-y-6 px-4">
          <div>
            <h1 className="text-3xl font-bold font-headline">Setup Your Business Profile</h1>
            <p className="text-muted-foreground">Complete your profile to start connecting with creators.</p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Brand Information</CardTitle>
                  <CardDescription>This is how your brand will appear to creators.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="brandName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brand Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your Company" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tagline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tagline</FormLabel>
                        <FormControl>
                          <Input placeholder="A short, catchy phrase for your brand" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="about"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>About Your Brand</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell creators about your brand's mission and values"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Details & Links</CardTitle>
                  <CardDescription>Provide more context and ways for creators to connect.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Fashion, Technology, SaaS" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., San Francisco, CA" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://yourcompany.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email</FormLabel>
                        <FormControl>
                          <Input placeholder="partners@yourcompany.com" {...field} />
                        </FormControl>
                        <FormDescription>This email will be visible for collaborations.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

               <Card>
                <CardHeader>
                  <CardTitle>Social Media</CardTitle>
                  <CardDescription>Add your social media handles.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="twitter"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Twitter</FormLabel>
                        <FormControl>
                          <Input placeholder="@YourBrand" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="instagram"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instagram</FormLabel>
                        <FormControl>
                          <Input placeholder="@YourBrand" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              
              <div className="flex justify-end gap-2">
                <Button type="submit">Complete Profile & View Dashboard</Button>
              </div>
            </form>
          </Form>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

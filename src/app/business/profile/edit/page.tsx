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
import { ArrowLeft, UploadCloud, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, setDocumentNonBlocking, useMemoFirebase, useStorage } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { generateSlug } from '@/lib/username-utils';

const profileFormSchema = z.object({
  brandName: z.string().min(2, 'Brand name is too short'),
  tagline: z.string().max(100, 'Tagline is too long').optional(),
  industry: z.string().min(2, 'Industry is required'),
  location: z.string().min(2, 'Location is required'),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  about: z.string().refine(val => !val || val.trim().split(/\s+/).filter(Boolean).length <= 2000, 'About section cannot exceed 2000 words').optional(),
  email: z.string().email('Invalid email address'),
  twitter: z.string().optional(),
  instagram: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function EditBusinessProfilePage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [isBannerUploading, setIsBannerUploading] = useState(false);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

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
      if (userData.logoUrl) {
        setAvatarPreview(userData.logoUrl);
      }
      if (businessProfileData.bannerUrl) {
        setBannerPreview(businessProfileData.bannerUrl);
      }
    }
  }, [businessProfileData, userData, form]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !user) {
      return;
    }
    const file = event.target.files[0];
    setIsUploading(true);

    const storageRef = ref(storage, `profile-images/${user.uid}/${file.name}`);

    try {
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      setAvatarPreview(downloadURL);

      const userDocRef = doc(firestore, 'users', user.uid);
      await setDocumentNonBlocking(userDocRef, { logoUrl: downloadURL }, { merge: true });

      toast({ title: "Avatar updated successfully!" });
    } catch (error) {
      console.error("Upload failed", error);
      toast({ variant: "destructive", title: "Upload Failed", description: "Could not upload your avatar." });
    } finally {
      setIsUploading(false);
    }
  };

  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !user) {
      return;
    }
    const file = event.target.files[0];
    setIsBannerUploading(true);

    const storageRef = ref(storage, `profile-banners/${user.uid}/${file.name}`);

    try {
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      setBannerPreview(downloadURL);

      const profileDocRef = doc(firestore, `users/${user.uid}/businessProfile`, user.uid);
      await setDocumentNonBlocking(profileDocRef, { bannerUrl: downloadURL }, { merge: true });

      toast({ title: 'Banner updated successfully!' });
    } catch (error) {
      console.error('Upload failed', error);
      toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload your banner.' });
    } finally {
      setIsBannerUploading(false);
    }
  };


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

    // Generate username if business doesn't have one yet
    let username: string | null = userData?.username || null;
    if (!username) {
      try {
        const slug = generateSlug(data.brandName);
        let candidate = slug;
        let suffix = 2;
        while (true) {
          const snap = await getDoc(doc(firestore, 'usernames', candidate));
          if (!snap.exists()) {
            username = candidate;
            break;
          }
          const existingUid = snap.data()?.uid;
          if (existingUid === user.uid) {
            username = candidate;
            break;
          }
          candidate = `${slug}_${suffix}`;
          suffix++;
        }
        const { writeBatch } = await import('firebase/firestore');
        const batch = writeBatch(firestore);
        batch.set(doc(firestore, 'users', user.uid), { username }, { merge: true });
        batch.set(doc(firestore, 'usernames', username!), { uid: user.uid });
        await batch.commit();
      } catch (err) {
        console.warn('[username] Could not claim username:', err);
        username = null;
      }
    }

    const profileDocRef = doc(firestore, `users/${user.uid}/businessProfile`, user.uid);
    setDocumentNonBlocking(profileDocRef, {
        tagline: data.tagline,
        industryType: data.industry,
        location: data.location,
        companyWebsite: data.website,
        about: data.about,
        twitter: data.twitter,
        instagram: data.instagram,
    }, { merge: true });

    toast({
      title: 'Profile Updated',
      description: 'Your business profile has been saved successfully.',
    });
    router.push('/business/profile');
  }

  const isLoading = isUserLoading || isProfileLoading || isUserDocLoading;

  if (isLoading) {
    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10" />
                <div>
                    <Skeleton className="h-7 w-64" />
                    <Skeleton className="h-4 w-48 mt-2" />
                </div>
            </div>
             <Skeleton className="h-96 w-full" />
             <Skeleton className="h-96 w-full" />
             <Skeleton className="h-64 w-full" />
             <div className="flex justify-end gap-2">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-32" />
             </div>
        </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/business/profile">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold font-headline">Edit Business Profile</h1>
          <p className="text-muted-foreground">Update your brand's information.</p>
        </div>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Brand Information</CardTitle>
              <CardDescription>This is how your brand will appear to creators.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarUpload}
                    accept="image/png, image/jpeg, image/gif"
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="h-24 w-24 rounded-full bg-muted flex items-center justify-center cursor-pointer overflow-hidden group relative"
                  >
                    {avatarPreview ? (
                      <Image src={avatarPreview} alt="Avatar Preview" fill style={{ objectFit: 'cover' }} />
                    ) : (
                      <UploadCloud className="h-8 w-8 text-muted-foreground" />
                    )}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <UploadCloud className="h-8 w-8 text-white" />
                    </div>
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold">Brand Logo / Profile Picture</h3>
                  <p className="text-sm text-muted-foreground">Click the icon to upload a PNG or JPG.</p>
                  <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    Change Avatar
                  </Button>
                </div>
              </div>

              {/* Banner upload */}
              <div className="flex flex-col gap-4">
                <div className="space-y-1">
                  <h3 className="font-semibold">Brand Banner</h3>
                  <p className="text-sm text-muted-foreground">Recommended size: 1200x400px (PNG or JPG).</p>
                </div>
                <div className="relative w-full h-40 rounded-xl bg-muted overflow-hidden group cursor-pointer" onClick={() => bannerInputRef.current?.click()}>
                  <input
                    type="file"
                    ref={bannerInputRef}
                    onChange={handleBannerUpload}
                    accept="image/png, image/jpeg, image/gif"
                    className="hidden"
                  />
                  {bannerPreview ? (
                    <Image src={bannerPreview} alt="Banner Preview" fill style={{ objectFit: 'cover' }} />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <UploadCloud className="h-8 w-8 mb-2" />
                      <span>Upload Banner</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <UploadCloud className="h-8 w-8 text-white mb-2" />
                    <span className="text-white font-medium">Change Banner</span>
                  </div>
                  {isBannerUploading && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-white" />
                    </div>
                  )}
                </div>
              </div>

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
             <Button type="button" variant="ghost" asChild>
                <Link href="/business/profile">Cancel</Link>
            </Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

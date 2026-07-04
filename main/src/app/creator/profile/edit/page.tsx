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
import { ArrowLeft, X, UploadCloud, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, setDocumentNonBlocking, useMemoFirebase, useStorage } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { generateSlug } from '@/lib/username-utils';
import { SearchableMultiSelect } from '@/components/ui/searchable-multi-select';
import { NICHES, CREATOR_TYPES } from '@/lib/creator-niches';

const profileFormSchema = z.object({
  name: z.string().min(2, 'Name is too short'),
  email: z.string().email('Invalid email address'),
  bio: z.string().max(500, 'Bio is too long').optional(),
  // Location split into 3 required fields
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State / Province is required'),
  country: z.string().min(1, 'Country is required'),
  // Age — required
  age: z.coerce
    .number({ invalid_type_error: 'Age is required' })
    .min(13, 'You must be at least 13 years old')
    .max(120, 'Please enter a valid age'),
  // Niche — 1 to 3, required
  categories: z
    .array(z.string())
    .min(1, 'Please select at least 1 niche')
    .max(3, 'You can select up to 3 niches'),
  // Creator type — up to 2 allowed
  creatorType: z
    .array(z.string())
    .min(1, 'Please select at least 1 creator type')
    .max(2, 'You can select up to 2 creator types'),
  // Social links
  instagramUrls: z.array(z.string().url('Please enter a valid URL')).optional(),
  youtubeUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  twitterUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function EditCreatorProfilePage() {
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

  const creatorProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, `users/${user.uid}/creatorProfile`, user.uid) : null),
    [user, firestore]
  );
  const { data: creatorProfileData, isLoading: isProfileLoading } = useDoc<any>(creatorProfileRef);

  const userRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userData, isLoading: isUserDocLoading } = useDoc<any>(userRef);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '',
      email: '',
      bio: '',
      city: '',
      state: '',
      country: '',
      age: undefined,
      categories: [],
      creatorType: [],
      instagramUrls: [],
      youtubeUrl: '',
      twitterUrl: '',
    },
    mode: 'onChange',
  });

  const [isInitialSetup, setIsInitialSetup] = useState(false);
  const [instaInput, setInstaInput] = useState('');
  const instagramUrls = form.watch('instagramUrls') || [];
  const categories = form.watch('categories') || [];
  const creatorTypeValue = form.watch('creatorType');

  useEffect(() => {
    if (creatorProfileData && !creatorProfileData.bio && !creatorProfileData.city) {
      setIsInitialSetup(true);
    } else {
      setIsInitialSetup(false);
    }
  }, [creatorProfileData]);

  useEffect(() => {
    if (userData?.logoUrl) {
      setAvatarPreview(userData.logoUrl);
    }
  }, [userData]);

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

      toast({ title: 'Avatar updated successfully!' });
    } catch (error) {
      console.error('Upload failed', error);
      toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload your avatar.' });
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

      const profileDocRef = doc(firestore, `users/${user.uid}/creatorProfile`, user.uid);
      await setDocumentNonBlocking(profileDocRef, { bannerUrl: downloadURL }, { merge: true });

      toast({ title: 'Banner updated successfully!' });
    } catch (error) {
      console.error('Upload failed', error);
      toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload your banner.' });
    } finally {
      setIsBannerUploading(false);
    }
  };

  useEffect(() => {
    if (creatorProfileData && userData) {
      const platformLinks = creatorProfileData.platformLinks || [];
      form.reset({
        name: userData.name || '',
        email: userData.email || '',
        bio: creatorProfileData.bio || '',
        city: creatorProfileData.city || '',
        state: creatorProfileData.state || '',
        country: creatorProfileData.country || '',
        age: creatorProfileData.age ?? undefined,
        categories: creatorProfileData.categories || [],
        creatorType: Array.isArray(creatorProfileData.creatorType)
          ? creatorProfileData.creatorType
          : (creatorProfileData.creatorType ? [creatorProfileData.creatorType] : []),
        instagramUrls: platformLinks.filter((l: string) => l.includes('instagram.com')),
        youtubeUrl: platformLinks.find((l: string) => l.includes('youtube.com')) || '',
        twitterUrl: platformLinks.find((l: string) => l.includes('twitter.com') || l.includes('x.com')) || '',
      });
      if (userData.logoUrl) {
        setAvatarPreview(userData.logoUrl);
      }
      if (creatorProfileData.bannerUrl) {
        setBannerPreview(creatorProfileData.bannerUrl);
      }
    }
  }, [creatorProfileData, userData, form]);

  async function onSubmit(data: ProfileFormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
      return;
    }

    const userDocRef = doc(firestore, 'users', user.uid);
    await setDocumentNonBlocking(userDocRef, {
      name: data.name,
      email: data.email,
    }, { merge: true });

    const profileDocRef = doc(firestore, `users/${user.uid}/creatorProfile`, user.uid);
    const platformLinks = [...(data.instagramUrls || []), data.youtubeUrl, data.twitterUrl].filter(Boolean);
    const newInstagramUrls = (data.instagramUrls || []).filter(Boolean);

    await setDocumentNonBlocking(profileDocRef, {
      bio: data.bio,
      platformLinks,
      city: data.city,
      state: data.state,
      country: data.country,
      age: data.age,
      categories: data.categories,
      creatorType: data.creatorType,
    }, { merge: true });

    // Clean up analytics entries for removed Instagram accounts
    const existingAnalyticsMulti = creatorProfileData?.instagramAnalyticsMulti || {};
    const staleUsernames = Object.keys(existingAnalyticsMulti).filter(
      username => !newInstagramUrls.some(url => url.includes(username))
    );
    if (staleUsernames.length > 0) {
      try {
        const { deleteField } = await import('firebase/firestore');
        const staleUpdate: Record<string, any> = {};
        staleUsernames.forEach(u => { staleUpdate[`instagramAnalyticsMulti.${u}`] = deleteField(); });
        await updateDoc(profileDocRef, staleUpdate);
      } catch (e) {
        console.warn('[instagram] Could not clean up stale analytics:', e);
      }
    }

    // Generate username if creator doesn't have one yet
    let username: string | null = userData?.username || null;
    if (!username) {
      try {
        const slug = generateSlug(data.name);
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
        console.warn('[username] Could not claim username — deploy firestore.rules to enable this feature:', err);
        username = null;
      }
    }

    toast({
      title: 'Profile Saved!',
      description: 'Your creator profile has been updated successfully.',
    });
    router.push(`/creator/profile/${user.uid}`);
  }

  const isLoading = isUserLoading || isProfileLoading || isUserDocLoading;

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
        </div>
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
        <div className="flex justify-end gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-4">
        {!isInitialSetup && (
          <Button variant="outline" size="icon" asChild>
            <Link href={`/creator/profile/${user?.uid}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        )}
        <div>
          <h1 className="text-2xl font-bold font-headline">
            {isInitialSetup ? 'Complete Your Creator Profile' : 'Edit Creator Profile'}
          </h1>
          <p className="text-muted-foreground">
            {isInitialSetup ? 'Fill in your details to get started.' : 'Update your public information.'}
          </p>
        </div>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* ── Avatar & Public Profile ── */}
          <Card>
            <CardHeader>
              <CardTitle>Avatar &amp; Public Profile</CardTitle>
              <CardDescription>This is how you&apos;ll appear to brands.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar upload */}
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
                  <h3 className="font-semibold">Profile Picture</h3>
                  <p className="text-sm text-muted-foreground">Click the icon to upload a PNG or JPG.</p>
                  <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    Change Avatar
                  </Button>
                </div>
              </div>

              {/* Banner upload */}
              <div className="flex flex-col gap-4">
                <div className="space-y-1">
                  <h3 className="font-semibold">Profile Banner</h3>
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

              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Aisha Sharma" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input placeholder="contact@example.com" {...field} />
                    </FormControl>
                    <FormDescription>This email will be visible for collaborations.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Bio */}
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>About You</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell brands about your content, your audience, and what makes you unique."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Creator Type */}
              <FormField
                control={form.control}
                name="creatorType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Creator Type <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <SearchableMultiSelect
                        options={CREATOR_TYPES}
                        value={field.value ?? []}
                        onChange={field.onChange}
                        placeholder="Search creator types..."
                        maxSelected={2}
                        maxSelectedMessage="You can select up to 2 creator types."
                      />
                    </FormControl>
                    <FormDescription>Select the type that best describes you.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Niche (categories) */}
              <FormField
                control={form.control}
                name="categories"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Niche <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <SearchableMultiSelect
                        options={NICHES}
                        value={field.value ?? []}
                        onChange={field.onChange}
                        placeholder="Search niches..."
                        maxSelected={3}
                        maxSelectedMessage="You can select up to 3 niches."
                      />
                    </FormControl>
                    <FormDescription>Select 1–3 niches that describe your content.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Location — City / State / Country */}
              <div>
                <p className="text-sm font-medium mb-2">
                  Location <span className="text-destructive">*</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">City</FormLabel>
                        <FormControl>
                          <Input placeholder="Mumbai" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">State / Province</FormLabel>
                        <FormControl>
                          <Input placeholder="Maharashtra" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">Country</FormLabel>
                        <FormControl>
                          <Input placeholder="India" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Age */}
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem className="max-w-[160px]">
                    <FormLabel>
                      Age <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={13}
                        max={120}
                        placeholder="e.g. 24"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* ── Social Links ── */}
          <Card>
            <CardHeader>
              <CardTitle>Social Links</CardTitle>
              <CardDescription>Provide links to your main social media profiles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Instagram accounts */}
              <FormField
                control={form.control}
                name="instagramUrls"
                render={() => (
                  <FormItem>
                    <FormLabel>Instagram Accounts</FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        {instagramUrls.map((url, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Input value={url} readOnly className="flex-1 bg-muted/50" />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 flex-shrink-0 text-destructive hover:text-destructive"
                              onClick={() => form.setValue('instagramUrls', instagramUrls.filter((_, i) => i !== index))}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <div className="flex items-center gap-2">
                          <Input
                            value={instaInput}
                            onChange={e => setInstaInput(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const trimmed = instaInput.trim();
                                if (trimmed && trimmed.includes('instagram.com') && !instagramUrls.includes(trimmed)) {
                                  form.setValue('instagramUrls', [...instagramUrls, trimmed]);
                                  setInstaInput('');
                                }
                              }
                            }}
                            placeholder="https://instagram.com/your-username"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            onClick={() => {
                              const trimmed = instaInput.trim();
                              if (trimmed && trimmed.includes('instagram.com') && !instagramUrls.includes(trimmed)) {
                                form.setValue('instagramUrls', [...instagramUrls, trimmed]);
                                setInstaInput('');
                              }
                            }}
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>Add all your Instagram profile URLs. Analytics will be fetched for each account.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* YouTube */}
              <FormField
                control={form.control}
                name="youtubeUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>YouTube</FormLabel>
                    <FormControl>
                      <Input placeholder="https://youtube.com/c/your-channel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Twitter / X */}
              <FormField
                control={form.control}
                name="twitterUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Twitter / X</FormLabel>
                    <FormControl>
                      <Input placeholder="https://x.com/your-handle" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            {!isInitialSetup && (
              <Button type="button" variant="ghost" asChild>
                <Link href={`/creator/profile/${user?.uid}`}>Cancel</Link>
              </Button>
            )}
            <Button type="submit">
              {isInitialSetup ? 'Complete Profile' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

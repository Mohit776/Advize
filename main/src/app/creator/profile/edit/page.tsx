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
import { doc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

const profileFormSchema = z.object({
  name: z.string().min(2, 'Name is too short'),
  email: z.string().email('Invalid email address'),
  bio: z.string().max(300, 'Bio is too long').optional(),
  location: z.string().optional(),
  categories: z.array(z.string()).optional(),
  instagramUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
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
      location: '',
      categories: [],
      instagramUrl: '',
      youtubeUrl: '',
      twitterUrl: '',
    },
    mode: 'onChange',
  });

  const [categoryInput, setCategoryInput] = useState('');
  const categories = form.watch('categories') || [];
  const [isInitialSetup, setIsInitialSetup] = useState(false);

  useEffect(() => {
    if (creatorProfileData && !creatorProfileData.bio && !creatorProfileData.location) {
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

      toast({ title: "Avatar updated successfully!" });
    } catch (error) {
      console.error("Upload failed", error);
      toast({ variant: "destructive", title: "Upload Failed", description: "Could not upload your avatar." });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddCategory = () => {
    const trimmedInput = categoryInput.trim();
    if (trimmedInput && !categories.includes(trimmedInput)) {
      form.setValue('categories', [...categories, trimmedInput]);
      setCategoryInput('');
    }
  };

  const handleRemoveCategory = (category: string) => {
    form.setValue('categories', categories.filter(p => p !== category));
  }

  useEffect(() => {
    if (creatorProfileData && userData) {
      const platformLinks = creatorProfileData.platformLinks || [];
      form.reset({
        name: userData.name || '',
        email: userData.email || '',
        bio: creatorProfileData.bio || '',
        location: creatorProfileData.location || '',
        categories: creatorProfileData.categories || [],
        instagramUrl: platformLinks.find((l: string) => l.includes('instagram.com')) || '',
        youtubeUrl: platformLinks.find((l: string) => l.includes('youtube.com')) || '',
        twitterUrl: platformLinks.find((l: string) => l.includes('twitter.com') || l.includes('x.com')) || '',
      });
      if (userData.logoUrl) {
        setAvatarPreview(userData.logoUrl);
      }
    }
  }, [creatorProfileData, userData, form]);


  async function onSubmit(data: ProfileFormValues) {
    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
      return;
    }

    const userDocRef = doc(firestore, 'users', user.uid);
    await setDocumentNonBlocking(userDocRef, {
      name: data.name,
      email: data.email,
    }, { merge: true });

    const profileDocRef = doc(firestore, `users/${user.uid}/creatorProfile`, user.uid);
    const platformLinks = [data.instagramUrl, data.youtubeUrl, data.twitterUrl].filter(Boolean);

    await setDocumentNonBlocking(profileDocRef, {
      bio: data.bio,
      platformLinks,
      location: data.location,
      categories: data.categories,
    }, { merge: true });

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
    )
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
          <Card>
            <CardHeader>
              <CardTitle>Avatar & Public Profile</CardTitle>
              <CardDescription>This is how you'll appear to brands.</CardDescription>
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
                  <h3 className="font-semibold">Profile Picture</h3>
                  <p className="text-sm text-muted-foreground">Click the icon to upload a PNG or JPG.</p>
                  <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    Change Avatar
                  </Button>
                </div>
              </div>

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
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Mumbai, India" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="categories"
                render={() => (
                  <FormItem>
                    <FormLabel>Categories</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input
                          value={categoryInput}
                          onChange={e => setCategoryInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCategory();
                            }
                          }}
                          placeholder="e.g., Fashion, Lifestyle"
                        />
                        <Button type="button" onClick={handleAddCategory}>Add</Button>
                      </div>
                    </FormControl>
                    <FormDescription>Add tags that describe your content niche.</FormDescription>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {categories.map(category => (
                        <Badge key={category} variant="secondary">
                          {category}
                          <button type="button" onClick={() => handleRemoveCategory(category)} className="ml-2 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social Links</CardTitle>
              <CardDescription>Provide links to your main social media profiles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="instagramUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instagram</FormLabel>
                    <FormControl>
                      <Input placeholder="https://instagram.com/your-username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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

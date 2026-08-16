'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Briefcase, Loader2 } from 'lucide-react';
import { useAuth, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { useToast } from '@/hooks/use-toast';

export default function SelectRolePage() {
  const router = useRouter();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  
  const [sessionData, setSessionData] = useState<{ uid: string; email: string; displayName: string; photoURL: string } | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSelecting, setIsSelecting] = useState(false);

  useEffect(() => {
    const data = sessionStorage.getItem('googleSignupSession');
    if (data) {
      setSessionData(JSON.parse(data));
      setIsInitializing(false);
    } else {
      // If someone navigates here directly, send them away
      router.replace('/signup');
    }
  }, [router]);

  async function handleSelectRole(role: 'creator' | 'business') {
    if (!sessionData) return;
    
    setIsSelecting(true);
    const { uid, email, displayName, photoURL } = sessionData;

    try {
      const userDocRef = doc(firestore, 'users', uid);
      
      // Create main user document
      await setDocumentNonBlocking(userDocRef, {
        id: uid,
        email,
        name: displayName || email,
        role,
        photoURL,
        createdAt: serverTimestamp(),
      }, { merge: true });

      // Create role-specific profile
      if (role === 'business') {
        const profileRef = doc(firestore, `users/${uid}/businessProfile`, uid);
        await setDocumentNonBlocking(profileRef, {
          id: uid,
          userId: uid,
        }, { merge: true });
        
        // Clean up and redirect
        sessionStorage.removeItem('googleSignupSession');
        router.replace('/business/setup-profile');
      } else {
        const profileRef = doc(firestore, `users/${uid}/creatorProfile`, uid);
        await setDocumentNonBlocking(profileRef, {
          id: uid,
          userId: uid,
        }, { merge: true });
        
        // Clean up and redirect
        sessionStorage.removeItem('googleSignupSession');
        router.replace('/creator/profile/edit');
      }
    } catch (error) {
      console.error('Failed to set role:', error);
      toast({
        variant: 'destructive',
        title: 'Error setting up account',
        description: 'Please try again or contact support.',
      });
      setIsSelecting(false);
    }
  }

  if (isInitializing) {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <PublicHeader />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <PublicHeader />
      <main className="flex flex-1 flex-col items-center justify-center py-12 px-4 md:px-8">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-headline font-bold">Welcome to Advize!</h1>
            <p className="text-muted-foreground text-lg">
              How would you like to use our platform?
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => !isSelecting && handleSelectRole('creator')}>
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">I am a Creator</CardTitle>
                <CardDescription className="text-base mt-2">
                  Find campaigns, collaborate with brands, and grow your audience.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center pt-2">
                <Button disabled={isSelecting} className="w-full" size="lg">
                  {isSelecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Join as Creator
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => !isSelecting && handleSelectRole('business')}>
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">I am a Business</CardTitle>
                <CardDescription className="text-base mt-2">
                  Discover talented creators and launch marketing campaigns.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center pt-2">
                <Button disabled={isSelecting} className="w-full" size="lg">
                  {isSelecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Join as Business
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

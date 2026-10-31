'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deleteDoc, doc, getDoc } from 'firebase/firestore';
import {
  deleteUser,
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
} from 'firebase/auth';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

const CONFIRM_WORD = 'DELETE';

export default function DeleteAccountPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const providerIds = user?.providerData.map((p) => p.providerId) ?? [];
  const usesPassword = providerIds.includes('password');
  const usesGoogle = providerIds.includes('google.com');
  const canSubmit =
    confirmText === CONFIRM_WORD && (!usesPassword || password.length > 0) && !isLoading;

  const handleDelete = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    setIsLoading(true);
    try {
      // Re-authenticate first: deleting an account is a sensitive operation.
      if (usesPassword && currentUser.email) {
        await reauthenticateWithCredential(
          currentUser,
          EmailAuthProvider.credential(currentUser.email, password)
        );
      } else if (usesGoogle) {
        await reauthenticateWithPopup(currentUser, new GoogleAuthProvider());
      }

      // Delete Firestore data BEFORE the auth user, while we're still authenticated.
      const userDocRef = doc(firestore, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const role = userDoc.data().role;
        if (role) {
          const profileRef = doc(firestore, `users/${currentUser.uid}/${role}Profile`, currentUser.uid);
          if ((await getDoc(profileRef)).exists()) await deleteDoc(profileRef);
        }
        await deleteDoc(userDocRef);
      }

      await deleteUser(currentUser);
      toast({ title: 'Account Deleted', description: 'Your account has been permanently deleted.' });
      router.push('/');
    } catch (error: any) {
      console.error('Failed to delete account:', error);
      const wrongPassword =
        error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential';
      toast({
        variant: 'destructive',
        title: wrongPassword ? 'Incorrect Password' : 'Deletion Failed',
        description: wrongPassword
          ? 'The password you entered is incorrect.'
          : error.code === 'auth/requires-recent-login'
            ? 'Please log out and log back in before deleting your account.'
            : error.message || 'An error occurred while deleting your account. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isUserLoading) {
    return <div className="mx-auto max-w-xl text-center text-muted-foreground">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl text-center space-y-4">
        <h1 className="text-2xl font-bold font-headline">Delete Account</h1>
        <p className="text-muted-foreground">You need to be logged in to delete your account.</p>
        <Button asChild>
          <Link href="/login">Log in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive font-headline">
            <Trash2 className="h-5 w-5" /> Delete Account
          </CardTitle>
          <CardDescription>
            Signed in as <span className="font-medium text-foreground">{user.email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p>
              This permanently deletes your account and profile. This action cannot be undone.
            </p>
          </div>

          {usesPassword && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="confirm">
              Type <span className="font-mono font-bold">{CONFIRM_WORD}</span> to confirm
            </Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="flex gap-3">
            <Button variant="destructive" onClick={handleDelete} disabled={!canSubmit}>
              {isLoading ? 'Deleting...' : 'Permanently delete my account'}
            </Button>
            <Button asChild variant="outline" disabled={isLoading}>
              <Link href="/settings">Cancel</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

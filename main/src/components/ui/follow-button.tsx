'use client';

import { useState } from 'react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, UserCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface FollowButtonProps {
  targetUserId: string;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function FollowButton({ targetUserId, className, variant = 'default', size = 'default' }: FollowButtonProps) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // If user is logged in, subscribe to the follow document
  const followDocRef = useMemoFirebase(
    () => (user && targetUserId ? doc(firestore, 'follows', `${user.uid}_${targetUserId}`) : null),
    [user, targetUserId, firestore]
  );
  
  const { data: followDoc, isLoading: isFollowLoading } = useDoc(followDocRef);
  const isFollowing = !!followDoc;

  // Don't show the button if viewing own profile
  if (user && user.uid === targetUserId) {
    return null;
  }

  const handleToggleFollow = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to follow profiles.',
        variant: 'destructive',
      });
      router.push('/login');
      return;
    }

    if (!followDocRef) return;

    setIsLoading(true);
    try {
      if (isFollowing) {
        await deleteDoc(followDocRef);
        toast({
          title: 'Unfollowed',
          description: 'You are no longer following this profile.',
        });
      } else {
        await setDoc(followDocRef, {
          followerId: user.uid,
          followingId: targetUserId,
          createdAt: serverTimestamp(),
        });
        toast({
          title: 'Following',
          description: 'You are now following this profile.',
        });
      }
    } catch (error) {
      console.error('Error toggling follow state:', error);
      toast({
        title: 'Action Failed',
        description: 'Could not update your follow status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isChecking = isUserLoading || isFollowLoading;

  return (
    <Button
      onClick={handleToggleFollow}
      disabled={isChecking || isLoading}
      variant={isFollowing ? 'secondary' : variant}
      size={size}
      className={className}
    >
      {isLoading || isChecking ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        <UserCheck className="mr-2 h-4 w-4" />
      ) : (
        <UserPlus className="mr-2 h-4 w-4" />
      )}
      {isFollowing ? 'Following' : 'Follow'}
    </Button>
  );
}

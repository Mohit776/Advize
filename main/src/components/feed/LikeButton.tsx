'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirestore, useUser } from '@/firebase';
import { toggleLike } from '@/lib/feed';

interface LikeButtonProps {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
}

export function LikeButton({ postId, initialLiked, initialCount }: LikeButtonProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isPending, setIsPending] = useState(false);

  const handleClick = async () => {
    if (!user || isPending) return;

    // Optimistic update
    const newLiked = !liked;
    setLiked(newLiked);
    setCount((prev) => (newLiked ? prev + 1 : prev - 1));
    setIsPending(true);

    try {
      await toggleLike(firestore, postId, user.uid);
    } catch {
      // Revert on failure
      setLiked(!newLiked);
      setCount((prev) => (newLiked ? prev - 1 : prev + 1));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <button
      id={`like-btn-${postId}`}
      onClick={handleClick}
      disabled={!user || isPending}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
        'hover:bg-rose-500/10 active:scale-95',
        liked
          ? 'text-rose-400'
          : 'text-muted-foreground hover:text-rose-400',
        isPending && 'opacity-60 cursor-not-allowed'
      )}
      aria-label={liked ? 'Unlike post' : 'Like post'}
    >
      <Heart
        className={cn(
          'h-4 w-4 transition-all duration-200',
          liked && 'fill-rose-400 scale-110'
        )}
      />
      <span>{count}</span>
    </button>
  );
}

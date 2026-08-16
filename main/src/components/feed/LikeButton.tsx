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
  const [burst, setBurst] = useState(false);

  const handleClick = async () => {
    if (!user || isPending) return;

    const newLiked = !liked;
    setLiked(newLiked);
    setCount((prev) => (newLiked ? prev + 1 : prev - 1));
    
    if (newLiked) {
      setBurst(true);
      setTimeout(() => setBurst(false), 600);
    }

    setIsPending(true);
    try {
      await toggleLike(firestore, postId, user.uid);
    } catch {
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
        'relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium',
        'transition-all duration-200 select-none',
        'hover:bg-rose-500/10 active:scale-90',
        liked
          ? 'text-rose-400'
          : 'text-muted-foreground hover:text-rose-400',
        isPending && 'opacity-60 cursor-not-allowed'
      )}
      aria-label={liked ? 'Unlike post' : 'Like post'}
    >
      {/* Burst animation ring */}
      {burst && (
        <span className="absolute inset-0 rounded-xl bg-rose-500/20 animate-ping" style={{ animationDuration: '0.6s' }} />
      )}
      <Heart
        className={cn(
          'h-4 w-4 transition-all duration-300',
          liked ? 'fill-rose-400 scale-125 text-rose-400' : 'scale-100',
          burst && 'scale-150'
        )}
      />
      <span className={cn(
        'tabular-nums transition-all duration-200',
        liked && 'text-rose-400 font-semibold'
      )}>
        {count}
      </span>
    </button>
  );
}

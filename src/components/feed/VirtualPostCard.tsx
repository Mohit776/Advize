'use client';

import { useEffect, useRef, useState } from 'react';
import { PostCard } from './PostCard';
import { FeedPost } from '@/lib/feed';

interface VirtualPostCardProps {
  post: FeedPost;
  isLiked: boolean;
  onDelete: (postId: string) => void;
}

/**
 * Windowing wrapper for PostCard.
 *
 * When the card is more than ~2 viewport heights away from the screen,
 * its content is replaced with an empty placeholder of the same height.
 * This keeps DOM node count bounded regardless of how many posts are loaded.
 * When it scrolls back into range, the real PostCard is restored.
 */
const MARGIN = '200% 0px 200% 0px'; // 2 viewport heights above and below

export function VirtualPostCard({ post, isLiked, onDelete }: VirtualPostCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else {
          // Capture height before hiding so placeholder matches
          setHeight(el.offsetHeight);
          setIsVisible(false);
        }
      },
      { rootMargin: MARGIN, threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef}>
      {isVisible ? (
        <PostCard post={post} isLiked={isLiked} onDelete={onDelete} />
      ) : (
        <div
          aria-hidden="true"
          style={{ height: height ?? 200 }}
          className="rounded-2xl bg-card border border-border/50"
        />
      )}
    </div>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw, Rss } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useUser } from '@/firebase';
import { FeedPost, getPosts, batchGetLikedPostIds, deletePost } from '@/lib/feed';
import { VirtualPostCard } from './VirtualPostCard';
import { DocumentSnapshot, doc, getDoc } from 'firebase/firestore';

const PAGE_SIZE = 8;

// ── Module-level username cache ──────────────────────────────────────────────
// Persists for the lifetime of the browser tab; avoids re-fetching the same
// author docs across page loads.
const usernameCache = new Map<string, string | null>();

// ── Skeleton ─────────────────────────────────────────────────────────────────

function PostCardSkeleton() {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-32 rounded" />
          <Skeleton className="h-2.5 w-20 rounded" />
        </div>
      </div>
      <Skeleton className="h-4 w-full rounded" />
      <Skeleton className="h-4 w-5/6 rounded" />
      <Skeleton className="h-4 w-3/4 rounded" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="flex gap-4 pt-1">
        <Skeleton className="h-7 w-16 rounded-full" />
        <Skeleton className="h-7 w-16 rounded-full" />
      </div>
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface PostWithLike {
  post: FeedPost;
  isLiked: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FeedList() {
  const firestore = useFirestore();
  const { user } = useUser();

  const [items, setItems] = useState<PostWithLike[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cursorRef = useRef<DocumentSnapshot | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ── Load a page ─────────────────────────────────────────────────────────────
  const loadPage = useCallback(
    async (cursor: DocumentSnapshot | null, append: boolean) => {
      try {
        const { posts, lastDoc } = await getPosts(firestore, PAGE_SIZE, cursor ?? undefined);
        cursorRef.current = lastDoc;
        setHasMore(posts.length === PAGE_SIZE);

        // 1. Batch like status — one parallel batch instead of N sequential reads
        const postIds = posts.map((p) => p.id);
        const likedIds = user
          ? await batchGetLikedPostIds(firestore, user.uid, postIds)
          : new Set<string>();

        const withLike: PostWithLike[] = posts.map((post) => ({
          post,
          isLiked: likedIds.has(post.id),
        }));

        // 2. Backfill authorUsername — only for IDs not already in the cache
        const uncachedIds = [
          ...new Set(
            withLike
              .filter(({ post }) => !post.authorUsername && !usernameCache.has(post.authorId))
              .map(({ post }) => post.authorId)
          ),
        ];

        if (uncachedIds.length > 0) {
          const userDocs = await Promise.all(
            uncachedIds.map((uid) => getDoc(doc(firestore, 'users', uid)))
          );
          userDocs.forEach((snap) => {
            const username = snap.exists() ? (snap.data().username ?? null) : null;
            usernameCache.set(snap.id, username);
          });
        }

        // Merge username from cache into posts that are missing it
        withLike.forEach(({ post }) => {
          if (!post.authorUsername) {
            const cached = usernameCache.get(post.authorId);
            if (cached) post.authorUsername = cached;
          }
        });

        setItems((prev) => (append ? [...prev, ...withLike] : withLike));
        setError(null);
      } catch (e) {
        console.error('Failed to load feed:', e);
        setError('Failed to load posts. Please try again.');
      }
    },
    [firestore, user]
  );

  // ── Initial load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    setIsLoading(true);
    loadPage(null, false).finally(() => setIsLoading(false));
  }, [loadPage]);

  // ── Infinite scroll — 600px prefetch margin ───────────────────────────────
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (entry.isIntersecting && !isLoadingMore && hasMore) {
          setIsLoadingMore(true);
          await loadPage(cursorRef.current, true);
          setIsLoadingMore(false);
        }
      },
      // Fire 600px BEFORE the sentinel enters the viewport → invisible prefetch
      { rootMargin: '0px 0px 600px 0px', threshold: 0 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadPage]);

  // ── Stable delete handler — useCallback prevents memo invalidation ─────────
  const handleDelete = useCallback(
    async (postId: string) => {
      try {
        await deletePost(firestore, postId);
        setItems((prev) => prev.filter((item) => item.post.id !== postId));
      } catch (e) {
        console.error('Failed to delete post:', e);
      }
    },
    [firestore]
  );

  const handleRefresh = () => {
    cursorRef.current = null;
    setIsLoading(true);
    setItems([]);
    loadPage(null, false).finally(() => setIsLoading(false));
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-muted-foreground text-sm">{error}</p>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2 rounded-xl">
          <RefreshCw className="h-4 w-4" /> Try again
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <div className="p-4 rounded-2xl bg-primary/10">
          <Rss className="h-8 w-8 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-foreground">Nothing here yet</p>
          <p className="text-muted-foreground text-sm mt-1">
            Be the first to post something to the community feed!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Refresh button */}
      <div className="flex justify-end">
        <Button
          id="feed-refresh-btn"
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          className="gap-1.5 text-muted-foreground hover:text-foreground rounded-xl text-xs"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Posts — VirtualPostCard handles DOM windowing */}
      {items.map(({ post, isLiked }) => (
        <VirtualPostCard
          key={post.id}
          post={post}
          isLiked={isLiked}
          onDelete={handleDelete}
        />
      ))}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-4" />

      {/* Load-more spinner — rarely seen due to 600px prefetch */}
      {isLoadingMore && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* End of feed */}
      {!hasMore && items.length > 0 && (
        <p className="text-center text-xs text-muted-foreground/50 py-4">
          You&apos;ve reached the end of the feed
        </p>
      )}
    </div>
  );
}

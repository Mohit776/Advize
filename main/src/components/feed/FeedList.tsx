'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw, Rss } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useUser } from '@/firebase';
import { FeedPost, getPosts, hasUserLiked, deletePost } from '@/lib/feed';
import { PostCard } from './PostCard';
import { DocumentSnapshot, doc, getDoc } from 'firebase/firestore';

const PAGE_SIZE = 8;

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

interface PostWithLike {
  post: FeedPost;
  isLiked: boolean;
}

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

  // Load a page of posts and resolve their liked state for the current user
  const loadPage = useCallback(
    async (cursor: DocumentSnapshot | null, append: boolean) => {
      try {
        const { posts, lastDoc } = await getPosts(firestore, PAGE_SIZE, cursor ?? undefined);
        cursorRef.current = lastDoc;
        setHasMore(posts.length === PAGE_SIZE);

        // Resolve liked state for each post in parallel
        const withLike: PostWithLike[] = await Promise.all(
          posts.map(async (post) => {
            const liked = user
              ? await hasUserLiked(firestore, post.id, user.uid)
              : false;
            return { post, isLiked: liked };
          })
        );

        // ── Backfill authorUsername for old posts that don't have it stored ──
        // Collect unique authorIds that are missing a username
        const missingIds = [
          ...new Set(
            withLike
              .filter(({ post }) => !post.authorUsername)
              .map(({ post }) => post.authorId)
          ),
        ];

        if (missingIds.length > 0) {
          // Batch-fetch user docs (one per unique author)
          const userDocs = await Promise.all(
            missingIds.map((uid) => getDoc(doc(firestore, 'users', uid)))
          );
          // Build a map: uid → username
          const usernameMap: Record<string, string> = {};
          userDocs.forEach((snap) => {
            if (snap.exists()) {
              const username = snap.data().username;
              if (username) usernameMap[snap.id] = username;
            }
          });

          // Merge the username into each affected post
          withLike.forEach(({ post }) => {
            if (!post.authorUsername && usernameMap[post.authorId]) {
              post.authorUsername = usernameMap[post.authorId];
            }
          });
        }

        setItems((prev) => (append ? [...prev, ...withLike] : withLike));
        setError(null);
      } catch (e) {
        console.error('Failed to load feed:', e);
        setError('Failed to load posts. Please try again.');
      }
    },
    [firestore, user]
  );

  // Initial load
  useEffect(() => {
    setIsLoading(true);
    loadPage(null, false).finally(() => setIsLoading(false));
  }, [loadPage]);

  // Infinite scroll observer on sentinel element
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
      { threshold: 0.1 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadPage]);

  const handleRefresh = () => {
    cursorRef.current = null;
    setIsLoading(true);
    setItems([]);
    loadPage(null, false).finally(() => setIsLoading(false));
  };

  const handleDelete = async (postId: string) => {
    try {
      await deletePost(firestore, postId);
      setItems((prev) => prev.filter((item) => item.post.id !== postId));
    } catch (e) {
      console.error('Failed to delete post:', e);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

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

      {/* Posts */}
      {items.map(({ post, isLiked }) => (
        <PostCard
          key={post.id}
          post={post}
          isLiked={isLiked}
          onDelete={handleDelete}
        />
      ))}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-4" />

      {/* Load-more spinner */}
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

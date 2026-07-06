'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Loader2, RefreshCw, Rss } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useUser } from '@/firebase';
import { FeedPost, getPosts, batchGetLikedPostIds, deletePost, scorePosts } from '@/lib/feed';
import { VirtualPostCard } from './VirtualPostCard';
import { DocumentSnapshot, doc, getDoc } from 'firebase/firestore';

const PAGE_SIZE = 8;

// ── Module-level username cache ──────────────────────────────────────────────
// Persists for the lifetime of the browser tab; avoids re-fetching the same
// author docs across page loads.
const userCache = new Map<string, { username: string | null, avatar: string | null }>();

// ── Skeleton ─────────────────────────────────────────────────────────────────

function PostCardSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-4 space-y-3 animate-pulse border-white/10">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0 bg-white/10" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-32 rounded bg-white/10" />
          <Skeleton className="h-2 w-20 rounded bg-white/5" />
        </div>
      </div>
      <Skeleton className="h-3 w-full rounded bg-white/10" />
      <Skeleton className="h-3 w-5/6 rounded bg-white/10" />
      <Skeleton className="h-3 w-3/4 rounded bg-white/10" />
      <Skeleton className="h-40 w-full rounded-xl bg-white/5" />
      <div className="flex gap-4 pt-2">
        <Skeleton className="h-6 w-16 rounded-full bg-white/10" />
        <Skeleton className="h-6 w-16 rounded-full bg-white/10" />
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

export function FeedList({ searchQuery = '' }: { searchQuery?: string }) {
  const firestore = useFirestore();
  const { user } = useUser();

  const [items, setItems] = useState<PostWithLike[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userInterests, setUserInterests] = useState<string[]>([]);

  const cursorRef = useRef<DocumentSnapshot | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingMoreRef = useRef(false);
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  // ── Fetch user interests ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const fetchInterests = async () => {
      try {
        const snap = await getDoc(doc(firestore, 'users', user.uid));
        if (snap.exists()) {
          const d = snap.data();
          // categories saved on the top-level user doc (written by profile edit)
          const cats: string[] = d.feedInterests ?? d.categories ?? [];
          setUserInterests(cats);
        }
      } catch (e) {
        console.warn('[feed] Could not load user interests:', e);
      }
    };
    fetchInterests();
  }, [user, firestore]);

  // keep a stable ref so loadPage (memoised) can read the latest value
  const userInterestsRef = useRef<string[]>([]);
  useEffect(() => { userInterestsRef.current = userInterests; }, [userInterests]);

  // ── Load a page ─────────────────────────────────────────────────────────────
  const loadPage = useCallback(
    async (cursor: DocumentSnapshot | null, append: boolean) => {
      try {
        const { posts, lastDoc } = await getPosts(firestore, PAGE_SIZE, cursor ?? undefined);
        cursorRef.current = lastDoc;
        setHasMore(posts.length === PAGE_SIZE);

        // 1. Batch like status
        const postIds = posts.map((p) => p.id);
        const currentUser = userRef.current;
        const likedIds = currentUser
          ? await batchGetLikedPostIds(firestore, currentUser.uid, postIds)
          : new Set<string>();

        const withLike: PostWithLike[] = posts.map((post) => ({
          post,
          isLiked: likedIds.has(post.id),
        }));

        // 2. Backfill author information — only for IDs not already in the cache
        const uncachedIds = [
          ...new Set(
            withLike
              .filter(({ post }) => (!post.authorUsername || !post.authorAvatar) && !userCache.has(post.authorId))
              .map(({ post }) => post.authorId)
          ),
        ];

        if (uncachedIds.length > 0) {
          const userDocs = await Promise.all(
            uncachedIds.map((uid) => getDoc(doc(firestore, 'users', uid)))
          );
          userDocs.forEach((snap) => {
            if (snap.exists()) {
              const d = snap.data();
              const avatar = d.logoUrl ?? d.photoURL ?? d.avatar ?? null;
              userCache.set(snap.id, { username: d.username ?? null, avatar });
            } else {
              userCache.set(snap.id, { username: null, avatar: null });
            }
          });
        }

        // Merge user info from cache into posts that are missing it
        withLike.forEach(({ post }) => {
          const cached = userCache.get(post.authorId);
          if (cached) {
            if (!post.authorUsername && cached.username) post.authorUsername = cached.username;
            if (!post.authorAvatar && cached.avatar) post.authorAvatar = cached.avatar;
          }
        });

        // 3. Score & re-rank using interests + freshness
        const rawPosts = withLike.map(({ post }) => post);
        const ranked = scorePosts(rawPosts, userInterestsRef.current);
        const reranked: PostWithLike[] = ranked.map((post) => ({
          post,
          isLiked: likedIds.has(post.id),
        }));

        setItems((prev) => (append ? [...prev, ...reranked] : reranked));
        setError(null);
      } catch (e) {
        console.error('Failed to load feed:', e);
        setError('Failed to load posts. Please try again.');
      }
    },
    [firestore] // stable — no longer depends on `user` (uses userRef instead)
  );

  // ── Initial load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    setIsLoading(true);
    loadPage(null, false).finally(() => setIsLoading(false));
  }, [loadPage]);

  // ── Infinite scroll — window scroll listener ─────────────────────────────
  useEffect(() => {
    if (!hasMore) return;

    const checkAndLoad = async () => {
      if (isLoadingMoreRef.current || !hasMore) return;
      // Trigger when user is within 400px of page bottom
      const nearBottom =
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 400;
      if (nearBottom) {
        isLoadingMoreRef.current = true;
        setIsLoadingMore(true);
        await loadPage(cursorRef.current, true);
        setIsLoadingMore(false);
        isLoadingMoreRef.current = false;
      }
    };

    // Check immediately in case all posts fit within the viewport
    checkAndLoad();

    window.addEventListener('scroll', checkAndLoad, { passive: true });
    window.addEventListener('resize', checkAndLoad, { passive: true });

    return () => {
      window.removeEventListener('scroll', checkAndLoad);
      window.removeEventListener('resize', checkAndLoad);
    };
  }, [hasMore, loadPage]);

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

  const filteredItems = useMemo(() => {
    if (!searchQuery?.trim()) return items;
    const lower = searchQuery.toLowerCase();
    return items.filter(({ post }) => 
      post.content.toLowerCase().includes(lower) || 
      post.authorName.toLowerCase().includes(lower) ||
      (post.authorUsername && post.authorUsername.toLowerCase().includes(lower))
    );
  }, [items, searchQuery]);

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
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center glass-card rounded-2xl border border-white/5 mx-4 md:mx-0 animate-fade-in-up">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
          <div className="relative p-5 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 glass-hover cursor-default">
            <Rss className="h-10 w-10 text-primary" />
          </div>
        </div>
        <div>
          <p className="font-bold text-lg text-foreground mt-2">Nothing here yet</p>
          <p className="text-muted-foreground text-sm mt-1 max-w-xs mx-auto">
            {searchQuery 
              ? 'No posts matched your search. Try adjusting your keywords.' 
              : 'Be the first to post something to the community feed and spark a conversation!'}
          </p>
        </div>
      </div>
    );
  }

  if (filteredItems.length === 0 && items.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <p className="text-muted-foreground">No posts matched "{searchQuery}"</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Refresh button */}
    
      {/* Posts — VirtualPostCard handles DOM windowing */}
      {filteredItems.map(({ post, isLiked }) => (
        <VirtualPostCard
          key={post.id}
          post={post}
          isLiked={isLiked}
          onDelete={handleDelete}
        />
      ))}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-4" />

      {/* Load-more — visible button + auto-trigger via sentinel */}
      {hasMore && (
        <div className="flex justify-center py-4">
          <Button
            id="feed-load-more-btn"
            variant="outline"
            size="sm"
            onClick={async () => {
              if (isLoadingMoreRef.current) return;
              isLoadingMoreRef.current = true;
              setIsLoadingMore(true);
              await loadPage(cursorRef.current, true);
              setIsLoadingMore(false);
              isLoadingMoreRef.current = false;
            }}
            disabled={isLoadingMore}
            className="gap-2 rounded-xl px-6"
          >
            {isLoadingMore ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Loading…</>
            ) : (
              'Load More Posts'
            )}
          </Button>
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

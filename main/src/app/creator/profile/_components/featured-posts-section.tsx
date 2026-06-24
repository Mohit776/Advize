'use client';

import { useState, useEffect } from 'react';
import {
  Heart,
  MessageCircle,
  Eye,
  TrendingUp,
  Play,
  Image as ImageIcon,
  Layers,
  ExternalLink,
  Plus,
  Trash2,
  Loader2,
  Star,
  Link as LinkIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import type { FeaturedPost } from '@/lib/types';

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | undefined): string {
  if (!n) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

function getProxiedUrl(url: string): string {
  if (!url) return '';
  if (
    url.includes('cdninstagram.com') ||
    url.includes('fbcdn.net') ||
    url.includes('instagram.com')
  ) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

function isValidInstagramUrl(url: string): boolean {
  return /instagram\.com\/(p|reel|tv)\/[A-Za-z0-9_-]+/.test(url);
}

function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace('www.', '') + u.pathname.replace(/\/$/, '');
  } catch {
    return url.slice(0, 50);
  }
}

function postTypeBadge(type?: string) {
  const map: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
    Video: {
      label: 'Reel',
      icon: Play,
      cls: 'bg-pink-500/10 text-pink-500 border-pink-500/30',
    },
    Sidecar: {
      label: 'Carousel',
      icon: Layers,
      cls: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
    },
    Image: {
      label: 'Image',
      icon: ImageIcon,
      cls: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    },
  };
  const t = map[type || ''] || map.Image;
  const Icon = t.icon;
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 gap-1 ${t.cls}`}>
      <Icon className="h-2.5 w-2.5" />
      {t.label}
    </Badge>
  );
}

// ─── Aggregate Stats Bar ──────────────────────────────────────────────────────

function AggregateStatsBar({ posts }: { posts: FeaturedPost[] }) {
  const postsWithData = posts.filter((p) => p.analytics);

  const totalLikes = postsWithData.reduce(
    (s, p) => s + (p.analytics?.likesCount ?? 0),
    0,
  );
  const totalComments = postsWithData.reduce(
    (s, p) => s + (p.analytics?.commentsCount ?? 0),
    0,
  );
  const totalViews = postsWithData.reduce(
    (s, p) => s + (p.analytics?.videoViewsCount ?? 0),
    0,
  );
  const avgEng =
    postsWithData.length > 0
      ? postsWithData.reduce((s, p) => s + (p.analytics?.engagementRate ?? 0), 0) /
        postsWithData.length
      : 0;

  const stats = [
    {
      icon: Heart,
      label: 'Total Likes',
      value: fmt(totalLikes),
      gradient: 'from-pink-500 to-rose-600',
    },
    {
      icon: MessageCircle,
      label: 'Total Comments',
      value: fmt(totalComments),
      gradient: 'from-blue-500 to-indigo-600',
    },
    {
      icon: Eye,
      label: 'Total Views',
      value: fmt(totalViews),
      gradient: 'from-violet-500 to-purple-600',
    },
    {
      icon: TrendingUp,
      label: 'Avg. Engagement',
      value: avgEng > 0 ? `${avgEng.toFixed(2)}%` : '—',
      gradient: 'from-emerald-500 to-green-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      {stats.map(({ icon: Icon, label, value, gradient }) => (
        <div
          key={label}
          className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${gradient} p-3 sm:p-4`}
        >
          {/* glow blob */}
          <div className="absolute -top-4 -right-4 h-20 w-20 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-center gap-1.5 text-white/80 mb-1">
            <Icon className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="text-[10px] font-medium line-clamp-1">{label}</span>
          </div>
          <p className="relative text-xl sm:text-2xl font-bold text-white leading-tight">
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Individual Post Row ──────────────────────────────────────────────────────

function FeaturedPostCard({
  post,
  isOwnProfile,
  onRemove,
  isRemoving,
}: {
  post: FeaturedPost;
  isOwnProfile: boolean;
  onRemove: () => void;
  isRemoving: boolean;
}) {
  const a = post.analytics;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card/60 hover:bg-card/90 transition-colors group relative">
      {/* Remove button (absolute top right) */}
      {isOwnProfile && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-2 right-2 z-10 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive shadow-sm"
          onClick={onRemove}
          disabled={isRemoving}
          title="Remove featured post"
        >
          {isRemoving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </Button>
      )}

      {/* Thumbnail (top half) */}
      <a
        href={post.url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative aspect-square sm:aspect-[4/5] w-full overflow-hidden bg-muted block"
      >
        {a?.displayUrl ? (
          <img
            src={getProxiedUrl(a.displayUrl)}
            alt="post thumbnail"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-500/20 to-purple-500/20">
            <LinkIcon className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        {/* Play icon overlay for videos */}
        {a?.type === 'Video' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="h-10 w-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <Play className="h-5 w-5 text-white fill-white ml-0.5" />
            </div>
          </div>
        )}
      </a>

      {/* Details (bottom half) */}
      <div className="p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline truncate font-medium flex items-center gap-1"
          >
            {shortUrl(post.url)}
            <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-70" />
          </a>
          {a?.type && postTypeBadge(a.type)}
        </div>

        {a ? (
          /* Analytics grid */
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 p-1.5 rounded-md">
              <Heart className="h-3.5 w-3.5 text-pink-500" />
              <span className="font-medium text-foreground">{fmt(a.likesCount)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 p-1.5 rounded-md">
              <MessageCircle className="h-3.5 w-3.5 text-blue-500" />
              <span className="font-medium text-foreground">{fmt(a.commentsCount)}</span>
            </div>
            {(a.videoViewsCount ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 p-1.5 rounded-md">
                <Eye className="h-3.5 w-3.5 text-violet-500" />
                <span className="font-medium text-foreground">{fmt(a.videoViewsCount)}</span>
              </div>
            )}
            {(a.engagementRate ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 p-1.5 rounded-md">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                <span className="font-medium text-foreground">{a.engagementRate?.toFixed(2)}%</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic mt-1">Analytics unavailable</p>
        )}
      </div>
    </div>
  );
}

// ─── Add Post Input ───────────────────────────────────────────────────────────

function AddPostInput({
  onAdd,
  isAdding,
}: {
  onAdd: (url: string) => Promise<void>;
  isAdding: boolean;
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const handleAdd = async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Please paste a URL.');
      return;
    }
    if (!isValidInstagramUrl(trimmed)) {
      setError('Must be an Instagram post or reel URL (instagram.com/p/… or /reel/…).');
      return;
    }
    setError('');
    await onAdd(trimmed);
    setValue('');
  };

  return (
    <div className="mt-4 space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="Paste Instagram reel or post URL…"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError('');
          }}
          onKeyDown={(e) => e.key === 'Enter' && !isAdding && handleAdd()}
          className="text-sm"
          disabled={isAdding}
        />
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={isAdding || !value.trim()}
          className="flex-shrink-0 gap-1.5"
        >
          {isAdding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {isAdding ? 'Adding…' : 'Add'}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {isAdding && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          Fetching post analytics — this may take a moment…
        </p>
      )}
    </div>
  );
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

function PostRowSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card/60">
      <Skeleton className="aspect-square sm:aspect-[4/5] w-full" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-10 w-full mt-2" />
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

interface FeaturedPostsSectionProps {
  featuredPosts: FeaturedPost[];
  isOwnProfile: boolean;
  onAdd: (url: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

export function FeaturedPostsSection({
  featuredPosts,
  isOwnProfile,
  onAdd,
  onRemove,
}: FeaturedPostsSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAdd = async (url: string) => {
    setIsAdding(true);
    try {
      await onAdd(url);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      await onRemove(id);
    } finally {
      setRemovingId(null);
    }
  };

  const showOwnerControls = mounted && isOwnProfile;

  // Visitor + no posts → hide completely
  if (!showOwnerControls && featuredPosts.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* Section Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
            <Star className="h-3.5 w-3.5 text-white fill-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-tight">Featured Posts</h3>
            <p className="text-xs text-muted-foreground leading-tight">
              {featuredPosts.length > 0
                ? `${featuredPosts.length} featured post${featuredPosts.length === 1 ? '' : 's'}`
                : 'Showcase your best work'}
            </p>
          </div>
        </div>
        {showOwnerControls && featuredPosts.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {featuredPosts.length} / 10
          </Badge>
        )}
      </div>

      <div className="px-4 pb-4">
        {/* Aggregate Stats — only if there's at least one post */}
        {featuredPosts.length > 0 && (
          <>
            <div className="border-t my-3" />
            <AggregateStatsBar posts={featuredPosts} />
          </>
        )}

        {/* Posts List */}
        {isAdding && <PostRowSkeleton />}

        {featuredPosts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {featuredPosts.map((post) => (
              <FeaturedPostCard
                key={post.id}
                post={post}
                isOwnProfile={showOwnerControls}
                onRemove={() => handleRemove(post.id)}
                isRemoving={removingId === post.id}
              />
            ))}
          </div>
        ) : (
          /* Empty state — owner only (visitor sees nothing due to early return above) */
          <div className="mt-2 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 py-8 px-4 text-center">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center mb-3">
              <Star className="h-5 w-5 text-pink-500" />
            </div>
            <p className="text-sm font-medium">No featured posts yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Add your best reels and posts to showcase your work to brands.
            </p>
          </div>
        )}

        {/* Add input — owner only, max 10 posts */}
        {showOwnerControls && featuredPosts.length < 10 && (
          <AddPostInput onAdd={handleAdd} isAdding={isAdding} />
        )}
        {showOwnerControls && featuredPosts.length >= 10 && (
          <p className="mt-3 text-xs text-center text-muted-foreground">
            Maximum of 10 featured posts reached. Remove one to add another.
          </p>
        )}
      </div>
    </div>
  );
}

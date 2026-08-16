'use client';

import { memo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MessageCircle, Trash2, ChevronDown, ChevronUp, Building2, User, MoreHorizontal, Share2, Bookmark } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';
import { formatDistanceToNow } from 'date-fns';
import { renderInlineText } from '@/lib/render-text';
import { FeedPost } from '@/lib/feed';
import { LikeButton } from './LikeButton';
import { CommentSection } from './CommentSection';
import { useRef, useEffect } from 'react';

interface PostCardProps {
  post: FeedPost;
  /** Whether the current user has already liked this post */
  isLiked: boolean;
  onDelete: (postId: string) => void;
}

const CONTENT_CLAMP_LENGTH = 280;

function PostCardInner({ post, isLiked, onDelete }: PostCardProps) {
  const { user } = useUser();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const isAuthor = user?.uid === post.authorId;
  const safeContent = post.content ?? '';
  const isLong = safeContent.length > CONTENT_CLAMP_LENGTH;

  const formatTime = () => {
    if (!post.createdAt) return '';
    try {
      return formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true });
    } catch {
      return '';
    }
  };

  return (
    <article
      id={`post-${post.id}`}
      className={cn(
        'relative overflow-hidden',
        'bg-[#0f0f13] border border-white/[0.06]',
        'rounded-2xl shadow-2xl shadow-black/50',
        'transition-all duration-300',
        'hover:border-white/[0.12] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
      )}
    >
      {/* Subtle gradient glow at top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 gap-3">
        <Link
          href={`/profile/${post.authorUsername ?? post.authorId}`}
          className="flex items-center gap-3 flex-1 min-w-0 group"
        >
          <div className="relative flex-shrink-0">
            <div className="h-10 w-10 rounded-full ring-2 ring-transparent group-hover:ring-primary/50 transition-all duration-300 overflow-hidden relative bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
              {post.authorAvatar ? (
                <Image src={post.authorAvatar} alt={post.authorName} fill className="object-cover" sizes="40px" />
              ) : (
                <span className="text-primary font-bold text-sm">{post.authorName?.[0]?.toUpperCase() ?? '?'}</span>
              )}
            </div>
            {/* Online indicator */}
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0f0f13] bg-green-500 z-10" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors duration-200">
                {post.authorName}
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide flex-shrink-0',
                  post.authorRole === 'business'
                    ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/20'
                    : 'bg-primary/15 text-primary ring-1 ring-primary/20'
                )}
              >
                {post.authorRole === 'business' ? (
                  <Building2 className="h-2.5 w-2.5" />
                ) : (
                  <User className="h-2.5 w-2.5" />
                )}
                {post.authorRole}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">{formatTime()}</p>
          </div>
        </Link>

        {/* Actions menu */}
        <div className="relative flex items-center gap-1">
          <button
            onClick={() => setBookmarked(p => !p)}
            className={cn(
              'p-2 rounded-xl transition-all duration-200',
              bookmarked
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            )}
            aria-label="Bookmark post"
          >

          </button>

          {isAuthor && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(p => !p)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200"
                aria-label="More options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-9 z-50 bg-[#18181f] border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden min-w-[140px]">
                  <button
                    onClick={() => {
                      onDelete(post.id);
                      setMenuOpen(false);
                    }}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 w-full transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete post
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Image ── */}
      {post.imageUrl && (
        <Dialog>
          <DialogTrigger asChild>
            <div className="relative w-full bg-black/30 overflow-hidden cursor-zoom-in border-t border-b border-white/5">
              <Image
                src={post.imageUrl}
                alt="Post image"
                width={0}
                height={0}
                sizes="(max-width: 768px) 100vw, 680px"
                className="w-full h-auto block transition-transform duration-500 hover:scale-[1.02]"
              />
              {/* Subtle overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-[90vw] max-h-[90vh] w-fit p-0 overflow-hidden border-none bg-transparent shadow-none flex justify-center items-center">
            <DialogTitle className="sr-only">View Image</DialogTitle>
            <div className="relative w-[90vw] max-w-5xl h-[85vh]">
              <Image
                src={post.imageUrl}
                alt="Post image full"
                fill
                className="object-contain rounded-xl shadow-2xl"
                sizes="90vw"
                priority
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Content ── */}
      <div className="px-4 pb-3 pt-1">
        <p className="text-base text-foreground/90 leading-[1.7] whitespace-pre-wrap break-words">
          {renderInlineText(
            isLong && !expanded
              ? safeContent.slice(0, CONTENT_CLAMP_LENGTH) + '…'
              : safeContent
          )}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded((p) => !p)}
            className="mt-2 text-xs text-primary hover:text-primary/80 flex items-center gap-0.5 font-medium transition-colors"
          >
            {expanded ? (
              <><ChevronUp className="h-3 w-3" /> Show less</>
            ) : (
              <><ChevronDown className="h-3 w-3" /> Read more</>
            )}
          </button>
        )}
      </div>

      {/* ── Actions bar ── */}
      <div className="flex items-center justify-between px-3 py-2.5 border-t border-white/[0.05]">
        <div className="flex items-center gap-0.5">
          <LikeButton
            postId={post.id}
            initialLiked={isLiked}
            initialCount={post.likeCount}
          />

          <button
            id={`toggle-comments-${post.id}`}
            onClick={() => setCommentsOpen((p) => !p)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200',
              'hover:bg-white/5 active:scale-95',
              commentsOpen ? 'text-blue-400' : 'text-muted-foreground hover:text-foreground'
            )}
            aria-expanded={commentsOpen}
            aria-label="Toggle comments"
          >
            <MessageCircle className={cn('h-4 w-4 transition-all duration-200', commentsOpen && 'fill-blue-400/20 text-blue-400')} />
            <span className="text-sm">{post.commentCount}</span>
          </button>
        </div>

        {/* Share button */}
        <button
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200 active:scale-95"
          aria-label="Share post"
          onClick={() => {
            const url = `${window.location.origin}/post/${post.id}`;
            if (typeof window !== 'undefined' && navigator.share) {
              navigator.share({ 
                title: `${post.authorName} on Advize`,
                text: safeContent.slice(0, 250) + '...',
                url: url
              }).catch(() => {});
            } else {
              if (typeof navigator !== 'undefined' && navigator.clipboard) {
                navigator.clipboard.writeText(url);
              }
            }
          }}
        >
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline text-xs">Share</span>
        </button>
      </div>

      {/* ── Comments ── */}
      <CommentSection postId={post.id} isOpen={commentsOpen} />

      {/* Click-away overlay for menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
      )}
    </article>
  );
}

function arePostPropsEqual(prev: PostCardProps, next: PostCardProps) {
  return (
    prev.post.id === next.post.id &&
    prev.post.likeCount === next.post.likeCount &&
    prev.post.commentCount === next.post.commentCount &&
    prev.isLiked === next.isLiked &&
    prev.onDelete === next.onDelete
  );
}

export const PostCard = memo(PostCardInner, arePostPropsEqual);

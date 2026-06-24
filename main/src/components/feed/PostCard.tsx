'use client';

import { memo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MessageCircle, Trash2, ChevronDown, ChevronUp, Building2, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';
import { formatDistanceToNow } from 'date-fns';
import { FeedPost } from '@/lib/feed';
import { renderInlineText } from '@/lib/render-text';
import { LikeButton } from './LikeButton';
import { CommentSection } from './CommentSection';

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

  const isAuthor = user?.uid === post.authorId;
  const isLong = post.content.length > CONTENT_CLAMP_LENGTH;

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
        'bg-card border border-border/50 rounded-2xl overflow-hidden',
        'transition-all duration-200 hover:border-border hover:shadow-lg hover:shadow-black/20'
      )}
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between p-4 pb-3 gap-3">
        <Link 
          href={`/profile/${post.authorUsername ?? post.authorId}`}
          className="flex items-center gap-3 flex-1 min-w-0 group"
        >
          <Avatar className="h-10 w-10 flex-shrink-0 ring-2 ring-border/50 group-hover:ring-primary/50 transition-all">
            <AvatarImage src={post.authorAvatar ?? undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
              {post.authorName?.[0]?.toUpperCase() ?? '?'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                {post.authorName}
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide flex-shrink-0',
                  post.authorRole === 'business'
                    ? 'bg-amber-500/15 text-amber-400'
                    : 'bg-primary/15 text-primary'
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
            <p className="text-[11px] text-muted-foreground mt-0.5 group-hover:text-muted-foreground/80 transition-colors">{formatTime()}</p>
          </div>
        </Link>

        {/* Delete — author only */}
        {isAuthor && (
          <button
            id={`delete-post-${post.id}`}
            onClick={() => onDelete(post.id)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
            aria-label="Delete post"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Content ── */}
      <div className="px-4 pb-3">
        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">
          {renderInlineText(
            isLong && !expanded
              ? post.content.slice(0, CONTENT_CLAMP_LENGTH) + '…'
              : post.content
          )}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded((p) => !p)}
            className="mt-1 text-xs text-primary hover:underline flex items-center gap-0.5"
          >
            {expanded ? (
              <>
                Show less <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                Read more <ChevronDown className="h-3 w-3" />
              </>
            )}
          </button>
        )}
      </div>

      {/* ── Image ── */}
      {post.imageUrl && (
        <div className="relative w-full aspect-video bg-muted overflow-hidden">
          <Image
            src={post.imageUrl}
            alt="Post image"
            fill
            className="object-cover transition-transform duration-300 hover:scale-105"
            sizes="(max-width: 768px) 100vw, 680px"
          />
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex items-center gap-1 px-2 py-2 border-t border-border/30">
        <LikeButton
          postId={post.id}
          initialLiked={isLiked}
          initialCount={post.likeCount}
        />

        <button
          id={`toggle-comments-${post.id}`}
          onClick={() => setCommentsOpen((p) => !p)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
            'hover:bg-primary/10 active:scale-95',
            commentsOpen ? 'text-primary' : 'text-muted-foreground hover:text-primary'
          )}
          aria-expanded={commentsOpen}
          aria-label="Toggle comments"
        >
          <MessageCircle className={cn('h-4 w-4', commentsOpen && 'fill-primary/20')} />
          <span>{post.commentCount}</span>
        </button>
      </div>

      {/* ── Comments ── */}
      <CommentSection postId={post.id} isOpen={commentsOpen} />
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

'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Trash2, MessageCircle, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { addComment, deleteComment, subscribeToComments, FeedComment } from '@/lib/feed';
import { formatDistanceToNow } from 'date-fns';
import { doc } from 'firebase/firestore';
import { renderInlineText } from '@/lib/render-text';

interface CommentSectionProps {
  postId: string;
  isOpen: boolean;
}

export function CommentSection({ postId, isOpen }: CommentSectionProps) {
  const firestore = useFirestore();
  const { user } = useUser();

  const [comments, setComments] = useState<FeedComment[]>([]);
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const userRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile } = useDoc<any>(userRef);

  const userRole = userProfile?.role ?? 'creator';
  const userName = userProfile?.displayName ?? userProfile?.name ?? user?.email ?? 'User';
  const userAvatar = userProfile?.logoUrl ?? userProfile?.photoURL ?? userProfile?.avatar ?? undefined;

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Subscribe to real-time comments only when open
  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = subscribeToComments(firestore, postId, setComments);
    return () => unsubscribe();
  }, [isOpen, firestore, postId]);

  const handleSubmit = async () => {
    if (!user || !text.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await addComment(firestore, postId, {
        authorId: user.uid,
        authorRole: userRole,
        authorName: userName,
        authorAvatar: userAvatar,
        text: text.trim(),
      });
      setText('');
      textareaRef.current?.focus();
    } catch (e) {
      console.error('Failed to post comment:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment(firestore, postId, commentId);
    } catch (e) {
      console.error('Failed to delete comment:', e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      return formatDistanceToNow(timestamp.toDate(), { addSuffix: true });
    } catch {
      return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id={`comments-${postId}`}
      className="border-t border-white/[0.05] mt-1 pt-4 px-4 pb-4 space-y-4 animate-in slide-in-from-top-2 duration-200 bg-black/20"
    >
      {/* Comment list */}
      <div className="space-y-3 max-h-72 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border">
        {comments.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground/50">
            <MessageCircle className="h-7 w-7" />
            <p className="text-xs font-medium">Start the conversation</p>
          </div>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex gap-2.5 group">
              <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5 ring-1 ring-white/10">
                <AvatarImage src={c.authorAvatar} />
                <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-semibold">
                  {c.authorName?.[0]?.toUpperCase() ?? '?'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                {/* Comment bubble */}
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl rounded-tl-sm px-3 py-2 inline-block max-w-full">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-semibold text-foreground truncate">{c.authorName}</span>
                    <span className={cn(
                      'text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide',
                      c.authorRole === 'business'
                        ? 'bg-amber-500/15 text-amber-400'
                        : 'bg-primary/15 text-primary'
                    )}>
                      {c.authorRole}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/85 break-words whitespace-pre-wrap leading-relaxed">{renderInlineText(c.text)}</p>
                </div>
                <span className="text-[10px] text-muted-foreground/50 mt-1 ml-1 block">{formatTime(c.createdAt)}</span>
              </div>

              {/* Delete button — only for comment author */}
              {user?.uid === c.authorId && (
                <button
                  onClick={() => handleDelete(c.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 mt-1 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 flex-shrink-0"
                  aria-label="Delete comment"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Input row */}
      {user && (
        <div className="flex gap-2.5 items-end">
          <Avatar className="h-7 w-7 flex-shrink-0 mb-1 ring-1 ring-white/10">
            <AvatarImage src={userAvatar} />
            <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-semibold">
              {userName?.[0]?.toUpperCase() ?? '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              id={`comment-input-${postId}`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a comment…"
              rows={1}
              className="resize-none min-h-[38px] pr-12 py-2.5 text-sm bg-white/[0.04] border-white/[0.08] focus-visible:ring-primary/40 focus-visible:border-primary/30 rounded-xl placeholder:text-muted-foreground/40 transition-all"
            />
            <Button
              id={`comment-submit-${postId}`}
              onClick={handleSubmit}
              disabled={!text.trim() || isSubmitting}
              size="icon"
              variant="ghost"
              className="absolute right-1.5 bottom-1.5 h-7 w-7 rounded-lg flex-shrink-0 text-primary hover:bg-primary/10 disabled:opacity-30"
              aria-label="Post comment"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

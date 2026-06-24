'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Trash2, MessageCircle, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useFirestore, useUser } from '@/firebase';
import { addComment, deleteComment, subscribeToComments, FeedComment } from '@/lib/feed';
import { formatDistanceToNow } from 'date-fns';
import { doc, getDoc } from 'firebase/firestore';
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
  const [userRole, setUserRole] = useState<'creator' | 'business'>('creator');
  const [userName, setUserName] = useState('');
  const [userAvatar, setUserAvatar] = useState<string | undefined>();

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch current user's profile info once
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const snap = await getDoc(doc(firestore, 'users', user.uid));
      if (snap.exists()) {
        const d = snap.data();
        setUserRole(d.role ?? 'creator');
        setUserName(d.displayName ?? d.name ?? user.email ?? 'User');
        setUserAvatar(d.photoURL ?? d.avatar ?? undefined);
      }
    };
    fetchProfile();
  }, [user, firestore]);

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
      className="border-t border-border/40 mt-1 pt-4 px-4 pb-4 space-y-4 animate-in slide-in-from-top-2 duration-200"
    >
      {/* Comment list */}
      <div className="space-y-3 max-h-72 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border">
        {comments.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground/60">
            <MessageCircle className="h-8 w-8" />
            <p className="text-sm">No comments yet — be the first!</p>
          </div>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex gap-3 group">
              <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5">
                <AvatarImage src={c.authorAvatar} />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {c.authorName?.[0]?.toUpperCase() ?? '?'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-foreground truncate">
                    {c.authorName}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wide',
                      c.authorRole === 'business'
                        ? 'bg-amber-500/15 text-amber-400'
                        : 'bg-primary/15 text-primary'
                    )}
                  >
                    {c.authorRole}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0">
                    {formatTime(c.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-foreground/80 mt-0.5 break-words whitespace-pre-wrap">{renderInlineText(c.text)}</p>
              </div>

              {/* Delete button — only for comment author */}
              {user?.uid === c.authorId && (
                <button
                  onClick={() => handleDelete(c.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex-shrink-0"
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
        <div className="flex gap-2 items-end">
          <Avatar className="h-7 w-7 flex-shrink-0 mb-1">
            <AvatarImage src={userAvatar} />
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
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
              placeholder="Write a comment… (Enter to send)"
              rows={1}
              className="resize-none min-h-[36px] pr-10 py-2 text-sm bg-muted/40 border-border/40 focus-visible:ring-primary/40 rounded-xl"
            />
          </div>
          <Button
            id={`comment-submit-${postId}`}
            onClick={handleSubmit}
            disabled={!text.trim() || isSubmitting}
            size="icon"
            className="h-9 w-9 rounded-xl flex-shrink-0"
            aria-label="Post comment"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

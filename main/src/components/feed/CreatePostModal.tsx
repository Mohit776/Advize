'use client';

import { useRef, useState } from 'react';
import { ImagePlus, X, Loader2, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useFirebase, useUser } from '@/firebase';
import { createPost } from '@/lib/feed';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect } from 'react';

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const MAX_CHARS = 2000;
const MAX_FILE_MB = 5;

export function CreatePostModal({ open, onClose, onCreated }: CreatePostModalProps) {
  const { firestore, storage } = useFirebase();
  const { user } = useUser();

  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [userRole, setUserRole] = useState<'creator' | 'business'>('creator');
  const [userName, setUserName] = useState('');
  const [userAvatar, setUserAvatar] = useState<string | undefined>();
  const [userUsername, setUserUsername] = useState<string | undefined>();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch author profile info
  useEffect(() => {
    if (!user || !open) return;
    const fetchProfile = async () => {
      const snap = await getDoc(doc(firestore, 'users', user.uid));
      if (snap.exists()) {
        const d = snap.data();
        setUserRole(d.role ?? 'creator');
        setUserName(d.displayName ?? d.name ?? user.email ?? 'User');
        setUserAvatar(d.logoUrl ?? d.photoURL ?? d.avatar ?? undefined);
        setUserUsername(d.username ?? undefined);
      }
    };
    fetchProfile();
  }, [user, open, firestore]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`Image must be under ${MAX_FILE_MB} MB.`);
      return;
    }
    setError(null);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setContent('');
    removeImage();
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!user || !content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await createPost(firestore, storage, {
        authorId: user.uid,
        authorRole: userRole,
        authorName: userName,
        authorAvatar: userAvatar,
        authorUsername: userUsername,
        content: content.trim(),
        imageFile: imageFile ?? undefined,
      });

      setContent('');
      removeImage();
      onCreated?.();
      onClose();
    } catch (e) {
      console.error('Failed to create post:', e);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const charsLeft = MAX_CHARS - content.length;
  const canSubmit = content.trim().length > 0 && charsLeft >= 0 && !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        id="create-post-modal"
        className="sm:max-w-lg bg-card border-border/60 gap-0 p-0 overflow-hidden rounded-2xl"
      >
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 ring-2 ring-border/50">
              <AvatarImage src={userAvatar} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                {userName?.[0]?.toUpperCase() ?? '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-base font-semibold leading-tight">
                {userName || 'Create Post'}
              </DialogTitle>
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wide',
                  userRole === 'business'
                    ? 'bg-amber-500/15 text-amber-400'
                    : 'bg-primary/15 text-primary'
                )}
              >
                {userRole}
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4">
          {/* Text area */}
          <div className="relative">
            <Textarea
              id="post-content-input"
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
              placeholder="Share something with the community…"
              rows={5}
              className="resize-none bg-muted/30 border-border/40 focus-visible:ring-primary/40 rounded-xl text-sm leading-relaxed"
              disabled={isSubmitting}
            />
            <span
              className={cn(
                'absolute bottom-2.5 right-3 text-[10px] tabular-nums transition-colors',
                charsLeft < 50 ? 'text-destructive' : 'text-muted-foreground/50'
              )}
            >
              {charsLeft}
            </span>
          </div>

          {/* Image preview */}
          {imagePreview && (
            <div className="relative rounded-xl overflow-hidden border border-border/40 bg-muted aspect-video">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <button
                onClick={removeImage}
                className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                aria-label="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-5 pb-5">
          <div className="flex items-center gap-2">
            {/* Image upload */}
            <input
              ref={fileInputRef}
              id="post-image-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
              disabled={isSubmitting}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting || !!imageFile}
              className={cn(
                'gap-2 text-muted-foreground hover:text-foreground rounded-xl',
                imageFile && 'opacity-40'
              )}
            >
              <ImagePlus className="h-4 w-4" />
              <span className="text-xs">Add Image</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-xl text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              id="post-submit-btn"
              onClick={handleSubmit}
              disabled={!canSubmit}
              size="sm"
              className="rounded-xl gap-2 min-w-[100px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Posting…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Post
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

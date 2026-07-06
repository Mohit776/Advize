'use client';

import { useRef, useState, useEffect, KeyboardEvent } from 'react';
import { ImagePlus, X, Loader2, Send, Tag } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useFirebase, useUser } from '@/firebase';
import { createPost } from '@/lib/feed';
import { doc, getDoc } from 'firebase/firestore';

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const MAX_CHARS = 2000;
const MAX_FILE_MB = 5;
const MAX_TAGS = 15;
const MIN_TAGS = 4;

export function CreatePostModal({ open, onClose, onCreated }: CreatePostModalProps) {
  const { firestore, storage } = useFirebase();
  const { user } = useUser();

  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [targetAge, setTargetAge] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

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

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!tag || tags.includes(tag) || tags.length >= MAX_TAGS) return;
    setTags((prev) => [...prev, tag]);
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
      setTagInput('');
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

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
    setTitle('');
    setTags([]);
    setTagInput('');
    setTargetAge('');
    removeImage();
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!user || !content.trim() || !title.trim() || tags.length < MIN_TAGS || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await createPost(firestore, storage, {
        authorId: user.uid,
        authorRole: userRole,
        authorName: userName,
        authorAvatar: userAvatar,
        authorUsername: userUsername,
        title: title.trim(),
        tags,
        targetAge: targetAge.trim() || undefined,
        content: content.trim(),
        imageFile: imageFile ?? undefined,
      });

      setContent('');
      setTitle('');
      setTags([]);
      setTagInput('');
      setTargetAge('');
      removeImage();
      setShowConfirm(false);
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
  const canSubmit =
    content.trim().length > 0 &&
    title.trim().length > 0 &&
    tags.length >= MIN_TAGS &&
    charsLeft >= 0 &&
    !isSubmitting;

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

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="post-title-input" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Title <span className="text-destructive">*</span>
            </label>
            <Input
              id="post-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 100))}
              placeholder="Give your post a title…"
              disabled={isSubmitting}
              className="bg-muted/20 border-white/5 rounded-xl focus-visible:ring-primary/50 text-sm"
            />
          </div>

          {/* Text area */}
          <div className="space-y-1.5">
            <label htmlFor="post-content-input" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Content <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Textarea
                id="post-content-input"
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
                placeholder="Share something with the community…"
                rows={5}
                className="resize-none bg-muted/20 border-white/5 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl text-sm leading-relaxed transition-all duration-300 hover:bg-muted/30"
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
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center justify-between">
              <span>Tags <span className="text-destructive">*</span> <span className="text-muted-foreground/40 normal-case font-normal">(press Enter or comma to add)</span></span>
              <span className={cn('text-[10px] tabular-nums', tags.length < MIN_TAGS ? 'text-amber-400' : 'text-primary')}>
                {tags.length}/{MIN_TAGS} min
              </span>
            </label>
            <div className={cn(
              'flex flex-wrap items-center gap-1.5 min-h-[42px] px-3 py-2 rounded-xl bg-muted/20 border border-white/5 transition-all focus-within:ring-1 focus-within:ring-primary/50',
              tags.length >= MAX_TAGS && 'opacity-60'
            )}>
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-medium"
                >
                  <Tag className="h-2.5 w-2.5" />
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    disabled={isSubmitting}
                    className="ml-0.5 hover:text-destructive transition-colors"
                    aria-label={`Remove tag ${tag}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
              {tags.length < MAX_TAGS && (
                <input
                  id="post-tag-input"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => { if (tagInput.trim()) { addTag(tagInput); setTagInput(''); } }}
                  placeholder={tags.length === 0 ? 'e.g. travel, food, lifestyle…' : ''}
                  disabled={isSubmitting}
                  className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground/40"
                />
              )}
            </div>
          </div>

          {/* Target Age (optional) */}
          <div className="space-y-1.5">
            <label htmlFor="post-age-input" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Target Age <span className="text-muted-foreground/40 normal-case font-normal">(optional)</span>
            </label>
            <Input
              id="post-age-input"
              value={targetAge}
              onChange={(e) => setTargetAge(e.target.value.slice(0, 20))}
              placeholder="e.g. 18–24, All ages, 13+"
              disabled={isSubmitting}
              className="bg-muted/20 border-white/5 rounded-xl focus-visible:ring-primary/50 text-sm"
            />
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
        <div className="flex items-center justify-between px-5 pb-5 pt-3 border-t border-border/40">
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
                'gap-2 text-muted-foreground hover:text-foreground rounded-xl transition-all glass-hover',
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
              className="rounded-xl text-muted-foreground hover:bg-white/5 transition-all"
            >
              Cancel
            </Button>
            <Button
              id="post-submit-btn"
              onClick={() => setShowConfirm(true)}
              disabled={!canSubmit}
              size="sm"
              className="rounded-xl gap-2 min-w-[100px] btn-primary"
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

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Ready to post?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to publish this post to the community feed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel className="rounded-xl" disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleSubmit();
              }} 
              className="rounded-xl btn-primary" 
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Post
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

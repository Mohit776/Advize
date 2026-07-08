'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useUser } from '@/firebase';
import { FeedPost, getPost, hasUserLiked } from '@/lib/feed';
import { PostCard } from '@/components/feed/PostCard';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function PostPage() {
  const { postId } = useParams() as { postId: string };
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  
  const [post, setPost] = useState<FeedPost | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPostAndLike() {
      try {
        const fetchedPost = await getPost(firestore, postId);
        if (fetchedPost) {
          setPost(fetchedPost);
          if (user) {
             const liked = await hasUserLiked(firestore, postId, user.uid);
             setIsLiked(liked);
          }
        } else {
          setError('Post not found');
        }
      } catch (e) {
        console.error(e);
        setError('Failed to load post');
      } finally {
        setIsLoading(false);
      }
    }

    if (!isUserLoading && firestore) {
      fetchPostAndLike();
    }
  }, [firestore, postId, user, isUserLoading]);

  if (isUserLoading || isLoading) {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        {!user && <PublicHeader />}
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        {!user && <PublicFooter />}
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        {!user && <PublicHeader />}
        <main className="flex flex-1 flex-col items-center justify-center p-4">
          <h1 className="text-2xl font-bold mb-2">Post Not Found</h1>
          <p className="text-muted-foreground mb-6">The post you're looking for doesn't exist or has been deleted.</p>
          <Button asChild>
            <Link href="/feed">Return to Feed</Link>
          </Button>
        </main>
        {!user && <PublicFooter />}
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {!user && <PublicHeader />}
      
      {/* 
        If the user is logged in, show the post normally in the center of the screen.
        If the user is NOT logged in, show the post but blur it out and make it unclickable,
        and overlay a signup modal on top of it.
      */}
      <main className="flex-1 flex justify-center py-8 px-4 relative">
        <div className="w-full max-w-xl">
          <div className={!user ? "pointer-events-none blur-md opacity-40 transition-all duration-500" : ""}>
            <PostCard 
              post={post}
              isLiked={isLiked}
              onDelete={() => {}} // Usually a shared post shouldn't be deleted from the single post view by default unless you are the author, but for simplicity we can pass a no-op or handle it properly later.
            />
          </div>
          
          {!user && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-4 mt-12 md:mt-0">
              <div className="bg-[#18181f]/80 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-2xl text-center max-w-md w-full flex flex-col items-center animate-fade-in-up">
                <div className="h-14 w-14 bg-primary/20 rounded-full flex items-center justify-center mb-6 ring-4 ring-primary/10">
                  <span className="text-primary font-bold text-2xl font-headline">A</span>
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3 font-headline">Join Advize to see this post</h2>
                <p className="text-muted-foreground mb-8 text-sm px-2">
                  Sign up to interact with {post.authorName}&apos;s post, join the conversation, and connect with other brands and creators.
                </p>
                <div className="flex flex-col gap-3 w-full">
                  <Button asChild className="w-full rounded-xl py-6 text-md font-semibold" size="lg">
                    <Link href="/signup">Create an Account</Link>
                  </Button>
                  <Button asChild variant="ghost" className="w-full rounded-xl hover:bg-white/5" size="lg">
                    <Link href="/login">Log In to Existing Account</Link>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      
      {!user && <PublicFooter />}
    </div>
  );
}

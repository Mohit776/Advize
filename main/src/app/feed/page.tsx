'use client';

import { useState } from 'react';
import { PenSquare, Rss } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FeedList } from '@/components/feed/FeedList';
import { CreatePostModal } from '@/components/feed/CreatePostModal';
import { ProfileCard } from '@/components/feed/ProfileCard';
import { useUser } from '@/firebase';

export default function FeedPage() {
  const { user } = useUser();
  const [modalOpen, setModalOpen] = useState(false);
  const [feedKey, setFeedKey] = useState(0);

  const handleCreated = () => {
    setFeedKey((k) => k + 1);
  };

  return (
    <div className="w-full flex justify-center">
      {/* ── 2-column grid: feed | profile card ── */}
      <div className="w-full max-w-5xl grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-8 xl:gap-12">

        {/* ── Left: Feed column ── */}
        <div className="min-w-0 w-full max-w-2xl mx-auto xl:mx-0">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Rss className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground tracking-tight">Community Feed</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Posts from creators &amp; businesses
                </p>
              </div>
            </div>

            {user && (
              <Button
                id="open-create-post-btn"
                onClick={() => setModalOpen(true)}
                size="sm"
                className="gap-2 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow"
              >
                <PenSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Create Post</span>
                <span className="sm:hidden">Post</span>
              </Button>
            )}
          </div>

          {/* Quick-compose bar */}
          {user && (
            <button
              onClick={() => setModalOpen(true)}
              id="quick-compose-bar"
              className="w-full mb-5 flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border border-border/50 text-muted-foreground text-sm hover:border-primary/40 hover:bg-card/80 transition-all duration-200 text-left group"
            >
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                <PenSquare className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="group-hover:text-foreground/70 transition-colors">
                What&apos;s on your mind? Share with the community…
              </span>
            </button>
          )}

          {/* Feed */}
          <FeedList key={feedKey} />
        </div>

        {/* ── Right: Profile card ── */}
        <aside className="hidden xl:block relative">
          <div className="sticky top-24">
            <ProfileCard />
          </div>
        </aside>
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}

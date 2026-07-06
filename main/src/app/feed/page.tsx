'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { PenSquare, Rss, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FeedList } from '@/components/feed/FeedList';
import { CreatePostModal } from '@/components/feed/CreatePostModal';
import { ProfileCard } from '@/components/feed/ProfileCard';
import { useUser, useFirestore } from '@/firebase';

export default function FeedPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [feedKey, setFeedKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      if (user && firestore) {
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role);
        }
      } else {
        setUserRole(null);
      }
    };
    fetchUserData();
  }, [user, firestore]);

  const handleCreated = () => {
    setFeedKey((k) => k + 1);
  };

  return (
    <div className="w-full flex justify-center">
      {/* ── 2-column grid: feed | profile card ── */}
      <div className="w-full max-w-5xl grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-8 xl:gap-12">

        {/* ── Left: Feed column ── */}
        <div className="min-w-0 w-full max-w-2xl mx-auto xl:mx-0">
        

          {/* Quick-compose bar */}
          {user && userRole === 'business' && (
            <div
              onClick={() => setModalOpen(true)}
              id="quick-compose-bar"
              className="w-full mb-6 flex items-center gap-3 px-4 py-3 rounded-2xl glass-card cursor-pointer hover:bg-card/80 transition-all duration-300 text-left group animate-fade-in hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5"
            >
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                <PenSquare className="h-4 w-4 text-primary" />
              </div>
              <span className="group-hover:text-foreground transition-colors flex-1 text-sm text-muted-foreground">
                What&apos;s on your mind? Share with the community…
              </span>

              <Button
                id="open-create-post-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setModalOpen(true);
                }}
                size="sm"
                className="gap-2 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow ml-auto"
              >
                <PenSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Create Post</span>
                <span className="sm:hidden">Post</span>
              </Button>
            </div>
          )}

          {/* Creator search box */}
          {user && userRole === 'creator' && (
            <div className="w-full mb-6 relative group animate-fade-in">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              <Input
                placeholder="Search posts or creators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-2xl glass-card border-none shadow-sm h-[52px] bg-card/80 focus-visible:ring-1 focus-visible:ring-primary/30 transition-all text-base"
              />
            </div>
          )}

          {/* Feed */}
          <FeedList key={feedKey} searchQuery={searchQuery} />
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

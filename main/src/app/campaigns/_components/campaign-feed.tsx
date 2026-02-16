
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, getDocs, limit, startAfter, DocumentData, QueryDocumentSnapshot, where, orderBy, QueryConstraint } from 'firebase/firestore';
import type { Campaign } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { CampaignCard } from './campaign-card';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Coffee } from 'lucide-react';

const PAGE_SIZE = 8;

export function CampaignFeed() {
  const firestore = useFirestore();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const fetchCampaigns = useCallback(async (initialLoad = false) => {
    if (!firestore) return;

    setIsLoading(true);

    const queryConstraints: QueryConstraint[] = [
      where('visibility', '==', 'public'),
      where('status', '==', 'Active'),
      orderBy('startDate', 'desc')
    ];

    let campaignsQuery;

    if (initialLoad) {
      campaignsQuery = query(
        collection(firestore, 'campaigns'),
        ...queryConstraints,
        limit(PAGE_SIZE)
      );
    } else if (lastVisible) {
      campaignsQuery = query(
        collection(firestore, 'campaigns'),
        ...queryConstraints,
        startAfter(lastVisible),
        limit(PAGE_SIZE)
      );
    } else {
      setHasMore(false);
      setIsLoading(false);
      return;
    }

    try {
      const documentSnapshots = await getDocs(campaignsQuery);
      const newCampaigns = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as Campaign));

      setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1] || null);
      setHasMore(newCampaigns.length === PAGE_SIZE);

      setCampaigns(prev => initialLoad ? newCampaigns : [...prev, ...newCampaigns]);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setIsLoading(false);
    }
  }, [firestore, lastVisible]);

  useEffect(() => {
    if (firestore) {
      fetchCampaigns(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firestore]);


  if (isLoading && campaigns.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-in fade-in duration-500" style={{ animationDelay: `${i * 50}ms` }}>
            <Skeleton className="h-[320px] w-full rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        {campaigns.map((campaign, index) => (
          <div
            key={campaign.id}
            className="animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <CampaignCard
              {...campaign}
              views="0" // Mock data to satisfy prop requirement
              progress={0} // Mock data to satisfy prop requirement
              paid={0} // Mock data to satisfy prop requirement
            />
          </div>
        ))}
        {isLoading && Array.from({ length: 4 }).map((_, i) => (
          <div key={`loader-${i}`} className="animate-in fade-in duration-300">
            <Skeleton className="h-[320px] w-full rounded-xl" />
          </div>
        ))}
      </div>

      {hasMore && !isLoading && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            size="lg"
            onClick={() => fetchCampaigns()}
            className="min-w-[200px] shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200 hover:bg-primary/5 hover:border-primary/50"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Load More Campaigns
          </Button>
        </div>
      )}

      {isLoading && campaigns.length > 0 && (
        <div className="flex justify-center py-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading more campaigns...</span>
          </div>
        </div>
      )}

      {!hasMore && campaigns.length > 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-3 rounded-full bg-muted/50 p-3">
            <Coffee className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">You've seen them all!</p>
          <p className="text-xs text-muted-foreground mt-1">Check back soon for new opportunities.</p>
        </div>
      )}

      {campaigns.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full bg-primary/10 p-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No Active Campaigns Yet</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            New campaigns are added regularly. Check back later to discover exciting collaboration opportunities!
          </p>
        </div>
      )}
    </div>
  );
}

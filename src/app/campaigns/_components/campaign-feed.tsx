
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, getDocs, limit, startAfter, DocumentData, QueryDocumentSnapshot, where, orderBy, QueryConstraint } from 'firebase/firestore';
import type { Campaign } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { CampaignCard } from './campaign-card';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Coffee, Filter, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const PAGE_SIZE = 8;

const CATEGORIES = [
  "Music", "Gaming", "Food", "Fashion", "Tech", "Lifestyle", "Beauty", "Travel", "Education", "Entertainment"
];

const CONTENT_TYPES = [
  "UGC", "Clipping", "Review", "Unboxing", "Tutorials"
];

export function CampaignFeed() {
  const firestore = useFirestore();
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [displayedCampaigns, setDisplayedCampaigns] = useState<Campaign[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [contentFilter, setContentFilter] = useState<string>("all");
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all");
  const [minBudget, setMinBudget] = useState<string>("");
  const [maxBudget, setMaxBudget] = useState<string>("");

  const fetchCampaigns = useCallback(async () => {
    if (!firestore) return;

    setIsLoading(true);

    const q = query(
      collection(firestore, 'campaigns'),
      where('status', '==', 'Active'),
      // orderBy removed to avoid index requirement
      limit(200) // Fetch meaningful amount for client-side filtering
    );

    try {
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Campaign));

      // Sort manually by startDate descending
      fetched.sort((a, b) => {
        const getTime = (date: any) => {
          if (!date) return 0;
          if (date.seconds) return date.seconds * 1000; // Firestore Timestamp
          if (date instanceof Date) return date.getTime();
          return new Date(date).getTime();
        };
        return getTime(b.startDate) - getTime(a.startDate);
      });

      setAllCampaigns(fetched);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setIsLoading(false);
    }
  }, [firestore]);

  // Apply filters
  useEffect(() => {
    let result = allCampaigns;

    if (categoryFilter && categoryFilter !== "all") {
      result = result.filter(c => c.category === categoryFilter);
    }

    if (contentFilter && contentFilter !== "all") {
      result = result.filter(c => c.contentType === contentFilter || c.type === contentFilter);
    }

    if (visibilityFilter && visibilityFilter !== "all") {
      result = result.filter(c => c.visibility === visibilityFilter);
    }

    if (minBudget) {
      const min = parseFloat(minBudget);
      if (!isNaN(min)) {
        result = result.filter(c => (c.budget || 0) >= min);
      }
    }

    if (maxBudget) {
      const max = parseFloat(maxBudget);
      if (!isNaN(max)) {
        result = result.filter(c => (c.budget || 0) <= max);
      }
    }

    setFilteredCampaigns(result);
    // Reset pagination when filters change
    setVisibleCount(PAGE_SIZE);
  }, [allCampaigns, categoryFilter, contentFilter, visibilityFilter, minBudget, maxBudget]);

  // Update displayed campaigns
  useEffect(() => {
    setDisplayedCampaigns(filteredCampaigns.slice(0, visibleCount));
  }, [filteredCampaigns, visibleCount]);

  const loadMore = () => {
    setVisibleCount(prev => prev + PAGE_SIZE);
  };

  const clearFilters = () => {
    setCategoryFilter("all");
    setContentFilter("all");
    setVisibilityFilter("all");
    setMinBudget("");
    setMaxBudget("");
  };

  const hasMore = visibleCount < filteredCampaigns.length;

  useEffect(() => {
    if (firestore) {
      fetchCampaigns();
    }
  }, [firestore, fetchCampaigns]);


  if (isLoading && allCampaigns.length === 0) {
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
      {/* Filters */}
      <div className="bg-card border rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Filters</h3>
          {(categoryFilter !== "all" || contentFilter !== "all" || visibilityFilter !== "all" || minBudget || maxBudget) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="ml-auto h-8 px-2 text-muted-foreground hover:text-destructive"
            >
              <X className="w-3 h-3 mr-1" />
              Clear
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Category Filter */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Category</label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content Type Filter */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Content Type</label>
            <Select value={contentFilter} onValueChange={setContentFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Content Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Content Types</SelectItem>
                {CONTENT_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Visibility Filter */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Visibility</label>
            <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Budget Filter */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Budget Range</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={minBudget}
                onChange={(e) => setMinBudget(e.target.value)}
                className="w-full"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="number"
                placeholder="Max"
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        {displayedCampaigns.map((campaign, index) => (
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

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            size="lg"
            onClick={loadMore}
            className="min-w-[200px] shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200 hover:bg-primary/5 hover:border-primary/50"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Load More Campaigns
          </Button>
        </div>
      )}


      {filteredCampaigns.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full bg-primary/10 p-4">
            <Filter className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No Campaigns Found</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            No campaigns match your selected filters. Try adjusting criteria.
          </p>
        </div>
      )}

      {!hasMore && displayedCampaigns.length > 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-3 rounded-full bg-muted/50 p-3">
            <Coffee className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">You've seen them all!</p>
          <p className="text-xs text-muted-foreground mt-1">Check back soon for new opportunities.</p>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Search, Users, X, SlidersHorizontal, MapPin, UserCircle2, User, Calendar } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { collection, getDocs, collectionGroup, query, where } from 'firebase/firestore';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore } from '@/firebase';
import { NICHES, CREATOR_TYPES } from '@/lib/creator-niches';
import type { CreatorSearchResult } from '@/lib/types';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 12;

// Popular niches shown as quick-filter pills
const QUICK_NICHES = [
  'Lifestyle',
  'Fashion',
  'Food',
  'Fitness',
  'Tech Reviews',
  'Travel Vlogs',
  'Cooking',
  'Skincare',
  'Comedy',
  'Makeup',
  'Gaming',
  'Podcasts',
];

interface CreatorSearchProps {
  /** The business profile's industryType field — used to power recommendations */
  industryType?: string;
  /** The brand's display name — shown in recommendation header */
  brandName?: string;
}

function CreatorCard({ creator }: { creator: CreatorSearchResult }) {
  const locationStr = [creator.city, creator.state, creator.country]
    .filter(Boolean)
    .join(', ');

  const creatorTypes = Array.isArray(creator.creatorType)
    ? creator.creatorType
    : creator.creatorType
    ? [creator.creatorType]
    : [];

  const profileUrl = creator.username
    ? `/profile/${creator.username}`
    : `/profile/${creator.userId}`;

  return (
    <Card className="group border-white/10 bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-0.5 overflow-hidden flex flex-col h-full">
      <CardContent className="p-5 flex flex-col gap-3 flex-1">
        {/* Avatar + Name */}
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 rounded-full overflow-hidden flex-shrink-0 bg-primary/10 border-2 border-background shadow-sm">
            {creator.logoUrl ? (
              <Image
                src={creator.logoUrl}
                alt={creator.name}
                fill
                sizes="48px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <span className="text-primary font-bold text-lg">
                  {creator.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-base truncate">{creator.name}</p>
            {creatorTypes[0] && (
              <p className="text-sm text-muted-foreground truncate">{creatorTypes[0]}</p>
            )}
          </div>
        </div>

        {/* Location */}
        {locationStr && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground capitalize">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{locationStr}</span>
          </div>
        )}

        {/* Bio */}
        {creator.bio && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {creator.bio}
          </p>
        )}

        {/* Niche Badges */}
        {creator.categories && creator.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {creator.categories.slice(0, 3).map((cat) => (
              <Badge
                key={cat}
                variant="secondary"
                className="text-xs px-2 py-0.5 font-medium"
              >
                {cat}
              </Badge>
            ))}
            {creator.categories.length > 3 && (
              <Badge
                variant="outline"
                className="text-xs px-2 py-0.5 text-muted-foreground"
              >
                +{creator.categories.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* CTA Buttons */}
        <div className="flex gap-2 mt-auto pt-2">
          <Button asChild size="default" className="flex-1 h-9 text-sm">
            <Link href={profileUrl}>View Profile</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CreatorCardSkeleton() {
  return (
    <Card className="border-white/10 bg-card overflow-hidden flex flex-col h-full">
      <CardContent className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-8 w-full" />
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-8 flex-1" />
        </div>
      </CardContent>
    </Card>
  );
}

export function CreatorSearch({ industryType, brandName }: CreatorSearchProps) {
  const firestore = useFirestore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedGenders, setSelectedGenders] = useState<string[]>([]);
  const [selectedAgeRanges, setSelectedAgeRanges] = useState<string[]>([]);
  const [activeQuickNiche, setActiveQuickNiche] = useState<string | null>(null);
  const [allCreators, setAllCreators] = useState<CreatorSearchResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Lazy-load creators on first interaction
  const fetchCreators = useCallback(async () => {
    if (hasFetched) return;
    setIsLoading(true);
    try {
      // Run both queries in parallel — 2 round trips instead of N+1
      const [usersSnap, profilesSnap] = await Promise.all([
        getDocs(query(collection(firestore, 'users'), where('role', '==', 'creator'))),
        getDocs(collectionGroup(firestore, 'creatorProfile')),
      ]);

      if (usersSnap.empty) {
        setAllCreators([]);
        return;
      }

      // Build a lookup map: userId → profile data  (O(n), no extra round trips)
      const profileMap = new Map<string, Record<string, unknown>>();
      profilesSnap.docs.forEach((profileDoc) => {
        // The document ID is the userId (same convention as before)
        profileMap.set(profileDoc.id, profileDoc.data() as Record<string, unknown>);
      });

      // Merge user docs with their profile data
      const results: CreatorSearchResult[] = [];
      usersSnap.docs.forEach((userDoc) => {
        const userData = userDoc.data();
        const userId = userDoc.id;
        const profileData = profileMap.get(userId) ?? {};

        const categories: string[] = (profileData.categories as string[]) || [];
        const bio: string | undefined = (profileData.bio as string) || undefined;

        // Skip creators with no profile data at all
        if (categories.length === 0 && !bio) return;

        results.push({
          userId,
          name: (userData.name as string) || (userData.displayName as string) || 'Creator',
          logoUrl: (userData.logoUrl as string) || undefined,
          username: (userData.username as string) || undefined,
          bio,
          categories,
          creatorType: (profileData.creatorType as string) || '',
          city: (profileData.city as string) || undefined,
          state: (profileData.state as string) || undefined,
          country: (profileData.country as string) || undefined,
          age: (profileData.age as number) || undefined,
          gender: (profileData.gender as string) || undefined,
        } as CreatorSearchResult);
      });

      setAllCreators(results);
    } catch (err) {
      console.error('[CreatorSearch] Failed to fetch creators:', err);
      setAllCreators([]);
    } finally {
      setIsLoading(false);
      setHasFetched(true);
    }
  }, [firestore, hasFetched]);



  // Active effective niche filter (quick pill OR dropdown selection)
  const effectiveNiches = useMemo(() => {
    if (selectedNiches.length > 0) return selectedNiches;
    if (activeQuickNiche) return [activeQuickNiche];
    return [];
  }, [selectedNiches, activeQuickNiche]);

  // Filtered search results
  const searchResults = useMemo(() => {
    if (!allCreators) return [];
    const query = searchQuery.trim().toLowerCase();

    return allCreators.filter((c) => {
      // Text search
      if (query) {
        const nameMatch = c.name.toLowerCase().includes(query);
        const nicheMatch = c.categories.some((cat) =>
          cat.toLowerCase().includes(query)
        );
        const locationMatch = [c.city, c.state, c.country]
          .filter(Boolean)
          .some((loc) => loc!.toLowerCase().includes(query));
        const bioMatch = c.bio?.toLowerCase().includes(query) || false;
        if (!nameMatch && !nicheMatch && !locationMatch && !bioMatch) return false;
      }

      // Niche filter
      if (effectiveNiches.length > 0) {
        if (!c.categories.some((cat) => effectiveNiches.includes(cat))) return false;
      }

      // Creator type filter
      if (selectedTypes.length > 0) {
        const types = Array.isArray(c.creatorType) ? c.creatorType : [c.creatorType];
        if (!types.some((t) => selectedTypes.includes(t))) return false;
      }

      // Gender filter
      if (selectedGenders.length > 0) {
        if (!c.gender || !selectedGenders.includes(c.gender)) return false;
      }

      // Age filter
      if (selectedAgeRanges.length > 0) {
        if (!c.age) return false;
        const matchesAge = selectedAgeRanges.some(range => {
          if (range === '13-17') return c.age! >= 13 && c.age! <= 17;
          if (range === '18-24') return c.age! >= 18 && c.age! <= 24;
          if (range === '25-34') return c.age! >= 25 && c.age! <= 34;
          if (range === '35-44') return c.age! >= 35 && c.age! <= 44;
          if (range === '45-54') return c.age! >= 45 && c.age! <= 54;
          if (range === '55+') return c.age! >= 55;
          return false;
        });
        if (!matchesAge) return false;
      }

      return true;
    });
  }, [allCreators, searchQuery, effectiveNiches, selectedTypes, selectedGenders, selectedAgeRanges]);

  const isSearchActive =
    searchQuery.trim() !== '' ||
    effectiveNiches.length > 0 ||
    selectedTypes.length > 0 ||
    selectedGenders.length > 0 ||
    selectedAgeRanges.length > 0;

  const displayedResults = isSearchActive
    ? searchResults
    : (allCreators || []);
  const visibleResults = displayedResults.slice(0, visibleCount);
  const hasMore = visibleCount < displayedResults.length;

  const activeFilterCount =
    selectedNiches.length + selectedTypes.length + selectedGenders.length + selectedAgeRanges.length + (activeQuickNiche ? 1 : 0);

  useEffect(() => {
    fetchCreators();
  }, [fetchCreators]);

  function clearAllFilters() {
    setSearchQuery('');
    setSelectedNiches([]);
    setSelectedTypes([]);
    setSelectedGenders([]);
    setSelectedAgeRanges([]);
    setActiveQuickNiche(null);
    setVisibleCount(PAGE_SIZE);
  }

  function toggleNiche(niche: string) {
    setSelectedNiches((prev) =>
      prev.includes(niche) ? prev.filter((n) => n !== niche) : [...prev, niche]
    );
    setActiveQuickNiche(null);
    setVisibleCount(PAGE_SIZE);
  }

  function toggleType(type: string) {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
    setVisibleCount(PAGE_SIZE);
  }

  function toggleGender(gender: string) {
    setSelectedGenders((prev) =>
      prev.includes(gender) ? prev.filter((g) => g !== gender) : [...prev, gender]
    );
    setVisibleCount(PAGE_SIZE);
  }

  function toggleAgeRange(range: string) {
    setSelectedAgeRanges((prev) =>
      prev.includes(range) ? prev.filter((r) => r !== range) : [...prev, range]
    );
    setVisibleCount(PAGE_SIZE);
  }

  function handleQuickNiche(niche: string) {
    if (activeQuickNiche === niche) {
      setActiveQuickNiche(null);
    } else {
      setActiveQuickNiche(niche);
      setSelectedNiches([]);
    }
    setVisibleCount(PAGE_SIZE);
    if (!hasFetched) fetchCreators();
  }

  return (
    <div className="space-y-6">
      {/* Search Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search creators by name, niche, or location…"
            className="pl-10 h-10 bg-muted border-0 focus-visible:ring-primary"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setVisibleCount(PAGE_SIZE);
              if (!hasFetched) fetchCreators();
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {/* Niche Dropdown Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'h-10 gap-2 border-white/10 hover:border-primary/40 flex-1 sm:flex-none',
                  selectedNiches.length > 0 && 'border-primary/40 text-primary'
                )}
                onClick={() => { if (!hasFetched) fetchCreators(); }}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Niche
                {selectedNiches.length > 0 && (
                  <Badge className="ml-1 h-5 px-1.5 text-[10px]">
                    {selectedNiches.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto">
              <DropdownMenuLabel>Filter by Niche</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {NICHES.slice(0, 60).map((niche) => (
                <DropdownMenuCheckboxItem
                  key={niche}
                  checked={selectedNiches.includes(niche)}
                  onCheckedChange={() => toggleNiche(niche)}
                >
                  {niche}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Creator Type Dropdown Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'h-10 gap-2 border-white/10 hover:border-primary/40 flex-1 sm:flex-none',
                  selectedTypes.length > 0 && 'border-primary/40 text-primary'
                )}
                onClick={() => { if (!hasFetched) fetchCreators(); }}
              >
                <UserCircle2 className="h-4 w-4" />
                Type
                {selectedTypes.length > 0 && (
                  <Badge className="ml-1 h-5 px-1.5 text-[10px]">
                    {selectedTypes.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 max-h-72 overflow-y-auto">
              <DropdownMenuLabel>Filter by Creator Type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {CREATOR_TYPES.map((type) => (
                <DropdownMenuCheckboxItem
                  key={type}
                  checked={selectedTypes.includes(type)}
                  onCheckedChange={() => toggleType(type)}
                >
                  {type}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Gender Dropdown Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'h-10 gap-2 border-white/10 hover:border-primary/40 flex-1 sm:flex-none',
                  selectedGenders.length > 0 && 'border-primary/40 text-primary'
                )}
                onClick={() => { if (!hasFetched) fetchCreators(); }}
              >
                <User className="h-4 w-4" />
                Gender
                {selectedGenders.length > 0 && (
                  <Badge className="ml-1 h-5 px-1.5 text-[10px]">
                    {selectedGenders.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 max-h-72 overflow-y-auto">
              <DropdownMenuLabel>Filter by Gender</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {['Male', 'Female'].map((gender) => (
                <DropdownMenuCheckboxItem
                  key={gender}
                  checked={selectedGenders.includes(gender)}
                  onCheckedChange={() => toggleGender(gender)}
                >
                  {gender}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Age Dropdown Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'h-10 gap-2 border-white/10 hover:border-primary/40 flex-1 sm:flex-none',
                  selectedAgeRanges.length > 0 && 'border-primary/40 text-primary'
                )}
                onClick={() => { if (!hasFetched) fetchCreators(); }}
              >
                <Calendar className="h-4 w-4" />
                Age
                {selectedAgeRanges.length > 0 && (
                  <Badge className="ml-1 h-5 px-1.5 text-[10px]">
                    {selectedAgeRanges.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 max-h-72 overflow-y-auto">
              <DropdownMenuLabel>Filter by Age</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {['13-17', '18-24', '25-34', '35-44', '45-54', '55+'].map((range) => (
                <DropdownMenuCheckboxItem
                  key={range}
                  checked={selectedAgeRanges.includes(range)}
                  onCheckedChange={() => toggleAgeRange(range)}
                >
                  {range}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear All Filters */}
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-10 text-muted-foreground hover:text-foreground gap-1"
              onClick={clearAllFilters}
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Quick Niche Pills */}
      <div className="flex flex-wrap gap-2">
        {QUICK_NICHES.map((niche) => (
          <button
            key={niche}
            onClick={() => handleQuickNiche(niche)}
            className={cn(
              'text-sm px-3.5 py-1.5 rounded-full border transition-all duration-200',
              activeQuickNiche === niche
                ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/30'
                : 'border-white/10 text-muted-foreground hover:border-primary/40 hover:text-foreground bg-muted/40'
            )}
          >
            {niche}
          </button>
        ))}
      </div>

      {/* Content Area */}
      {isLoading ? (
        /* Loading Skeletons */
        <div className="space-y-4">
          <Skeleton className="h-5 w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <CreatorCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Section Header */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {isSearchActive ? (
                <>
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <span className="text-base font-medium">
                    {displayedResults.length} result{displayedResults.length !== 1 ? 's' : ''}
                    {searchQuery && ` for "${searchQuery}"`}
                  </span>
                </>
              ) : (
                <>
                  <Users className="h-5 w-5 text-primary" />
                  <span className="text-base font-medium">
                    All Creators {allCreators && `(${allCreators.length})`}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Creator Grid */}
          {visibleResults.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {visibleResults.map((creator) => (
                  <CreatorCard key={creator.userId} creator={creator} />
                ))}
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-white/10 hover:border-primary/40"
                    onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                  >
                    Load More
                    <Badge variant="secondary" className="text-[10px]">
                      +{Math.min(PAGE_SIZE, displayedResults.length - visibleCount)} more
                    </Badge>
                  </Button>
                </div>
              )}
            </>
          ) : (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-12 gap-3 border-2 border-dashed border-white/10 rounded-xl text-center">
              <Users className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium">No creators found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isSearchActive
                    ? 'Try adjusting your search or filters'
                    : 'No creators have joined Advize yet'}
                </p>
              </div>
              {isSearchActive && (
                <Button variant="outline" size="sm" onClick={clearAllFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

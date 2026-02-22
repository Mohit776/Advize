
'use client';
import {
  BadgeCheck,
  MapPin,
  Globe,
  Twitter,
  Instagram,
  Mail,
  Star,
  Briefcase,
  Heart,
  Pencil,
  Inbox,
  Search,
  Youtube,
  Linkedin,
  Link as LinkIcon,
  CheckCircle,
  Loader2,
  MessageCircle,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { WishlistItem, Campaign, CollaborationRequest, Notification, Earning, Submission } from '@/lib/types';
import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, orderBy, updateDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import React, { useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { CollaborateModal } from '@/app/creator/profile/_components/collaborate-modal';
import { CollaborationRequestCard } from '@/app/creator/profile/_components/collaboration-request-card';
import { useParams } from 'next/navigation';
import { CampaignCard } from '@/app/campaigns/_components/campaign-card';
import { InstagramAnalyticsCard } from '@/app/creator/profile/_components/instagram-analytics-card';

function MyCampaignsFeed({ userId }: { userId: string }) {
  const firestore = useFirestore();

  const campaignsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'campaigns'), where('creatorIds', 'array-contains', userId)) : null),
    [firestore, userId]
  );
  const { data: campaigns, isLoading } = useCollection<Campaign>(campaignsQuery);

  const enrichedCampaigns = useMemo(() => {
    if (!campaigns) return [];

    return campaigns.map(campaign => {
      const views = "0";
      const paid = 0;
      const progress = 0;

      return {
        ...campaign,
        views,
        progress,
        paid,
      };
    });
  }, [campaigns]);

  const getCampaignUrl = (campaignId: string) => {
    return `/creator/campaigns/${campaignId}`;
  }

  if (isLoading) {
    return <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>;
  }

  if (enrichedCampaigns.length === 0) {
    return (
      <div className="text-center py-12">
        <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">No Active Campaigns</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          You haven't joined any campaigns yet. Explore public campaigns to get started.
        </p>
        <Button asChild className="mt-4">
          <Link href="/campaigns">Explore Campaigns</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {enrichedCampaigns.map(campaign => (
        <CampaignCard key={campaign.id} {...campaign} campaignUrl={getCampaignUrl(campaign.id)} />
      ))}
    </div>
  );
}

function WishlistFeed({ wishlistItems }: { wishlistItems: WishlistItem[] }) {
  const firestore = useFirestore();

  const campaignIds = useMemo(() => {
    if (!wishlistItems || wishlistItems.length === 0) return [];
    return [...new Set(wishlistItems.map(item => item.campaignId))];
  }, [wishlistItems]);

  const campaignsQuery = useMemoFirebase(
    () => (firestore && campaignIds.length > 0 ? query(collection(firestore, 'campaigns'), where('__name__', 'in', campaignIds)) : null),
    [firestore, campaignIds]
  );
  const { data: campaignData, isLoading } = useCollection<Campaign>(campaignsQuery);

  const enrichedCampaigns = useMemo(() => {
    if (!campaignData) return [];

    return campaignData.map(campaign => {
      const views = "0";
      const paid = 0;
      const progress = 0;

      return {
        ...campaign,
        views,
        progress,
        paid,
      };
    });
  }, [campaignData]);

  if (isLoading) {
    return <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>;
  }

  if (enrichedCampaigns.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">Your wishlist is empty</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Browse campaigns and add them to your wishlist to save them for later.
        </p>
        <Button asChild className="mt-4">
          <Link href="/campaigns">Explore Campaigns</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {enrichedCampaigns.map(campaign => (
        <CampaignCard key={campaign.id} {...campaign} />
      ))}
    </div>
  );
}

function CampaignPortfolio({ userId }: { userId: string }) {
  const firestore = useFirestore();

  const campaignsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'campaigns'), where('creatorIds', 'array-contains', userId)) : null),
    [firestore, userId]
  );
  const { data: campaigns, isLoading } = useCollection<Campaign>(campaignsQuery);

  // Query earnings to get total views generated
  const earningsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'earnings'), where('creatorId', '==', userId)) : null),
    [firestore, userId]
  );
  const { data: earnings } = useCollection<Earning>(earningsQuery);

  // Query submissions for engagement count
  const submissionsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'submissions'), where('creatorId', '==', userId)) : null),
    [firestore, userId]
  );
  const { data: submissions } = useCollection<Submission>(submissionsQuery);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Campaign Portfolio
          </CardTitle>
          <CardDescription>Past brand collaborations and campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Campaign Portfolio
          </CardTitle>
          <CardDescription>Past brand collaborations and campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Briefcase className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 text-base font-medium">No Campaign History Yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Campaigns this creator has participated in will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const completedCount = campaigns.filter(c => c.status === 'Completed').length;
  const activeCount = campaigns.filter(c => c.status === 'Active').length;
  const platformSet = new Set<string>();
  campaigns.forEach(c => c.platforms?.forEach(p => platformSet.add(p)));

  // Calculate total views from earnings
  const totalViews = earnings?.reduce((sum, e) => sum + (e.views || 0), 0) || 0;

  // Calculate total engagements (approved submissions count as engagements)
  const totalEngagements = submissions?.filter(s => s.status === 'approved').length || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Campaign Portfolio
            </CardTitle>
            <CardDescription>Past brand collaborations and campaigns</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/30">
              {completedCount} Completed
            </Badge>
            {activeCount > 0 && (
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/30">
                {activeCount} Active
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          <div className="rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 p-4 text-center">
            <p className="text-2xl font-bold">{campaigns.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Campaigns</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 p-4 text-center">
            <p className="text-2xl font-bold">{completedCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Completed</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 p-4 text-center">
            <p className="text-2xl font-bold">{platformSet.size}</p>
            <p className="text-xs text-muted-foreground mt-1">Platforms</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-pink-500/10 to-rose-500/10 border border-pink-500/20 p-4 text-center">
            <p className="text-2xl font-bold">{formatNumber(totalViews)}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Views</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-4 text-center">
            <p className="text-2xl font-bold">{totalEngagements}</p>
            <p className="text-xs text-muted-foreground mt-1">Engagements</p>
          </div>
        </div>

        {/* Campaign Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map((campaign) => {
            const startDate = campaign.startDate?.toDate ? campaign.startDate.toDate() : (campaign.startDate ? new Date(campaign.startDate) : null);
            const endDate = campaign.endDate?.toDate ? campaign.endDate.toDate() : (campaign.endDate ? new Date(campaign.endDate) : null);

            return (
              <div
                key={campaign.id}
                className="group relative rounded-xl border bg-card/50 hover:bg-card/80 transition-all p-4 space-y-3"
              >
                {/* Brand Header */}
                <div className="flex items-center gap-3">
                  {campaign.brandLogo ? (
                    <Image
                      src={campaign.brandLogo}
                      alt={campaign.brandName}
                      width={36}
                      height={36}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {campaign.brandName?.charAt(0) || 'B'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate">{campaign.name}</h4>
                    <p className="text-xs text-muted-foreground truncate">{campaign.brandName}</p>
                  </div>
                  <Badge
                    variant={campaign.status === 'Completed' ? 'secondary' : 'default'}
                    className={
                      campaign.status === 'Completed'
                        ? 'bg-green-500/10 text-green-500 border-green-500/30'
                        : campaign.status === 'Active'
                          ? 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                          : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
                    }
                  >
                    {campaign.status}
                  </Badge>
                </div>

                {/* Category & Content Type */}
                <div className="flex flex-wrap gap-1.5">
                  {campaign.category && (
                    <Badge variant="outline" className="text-xs">{campaign.category}</Badge>
                  )}
                  {campaign.contentType && (
                    <Badge variant="outline" className="text-xs">{campaign.contentType}</Badge>
                  )}
                </div>

                {/* Platforms & Date */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    {campaign.platforms?.map(platform => (
                      <Badge key={platform} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {platform}
                      </Badge>
                    ))}
                  </div>
                  {startDate && (
                    <span>
                      {startDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      {endDate && ` – ${endDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function formatNumber(num: number): string {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

export default function PublicCreatorProfilePage() {
  const { toast } = useToast();
  const { user: currentUser, isUserLoading: isCurrentUserLoading } = useUser();
  const firestore = useFirestore();
  const [activeTab, setActiveTab] = useState('portfolio');
  const [isImporting, setIsImporting] = useState(false);
  const params = useParams();
  const creatorId = params.creatorId as string;

  const isOwnProfile = currentUser?.uid === creatorId;
  const userIdToView = creatorId;

  const creatorProfileRef = useMemoFirebase(
    () => (userIdToView ? doc(firestore, `users/${userIdToView}/creatorProfile`, userIdToView) : null),
    [userIdToView, firestore]
  );
  const { data: creatorProfile, isLoading: isProfileLoading } = useDoc<any>(creatorProfileRef);

  const userRef = useMemoFirebase(
    () => (userIdToView ? doc(firestore, 'users', userIdToView) : null),
    [userIdToView, firestore]
  );
  const { data: userData, isLoading: isUserDocLoading } = useDoc<any>(userRef);

  const collaborationRequestsRef = useMemoFirebase(
    () => (isOwnProfile && userIdToView ? collection(firestore, `users/${userIdToView}/collaborationRequests`) : null),
    [isOwnProfile, userIdToView, firestore]
  );
  const { data: collaborationRequests, isLoading: isRequestsLoading } = useCollection<CollaborationRequest>(collaborationRequestsRef);

  const wishlistRef = useMemoFirebase(
    () => (isOwnProfile && userIdToView ? collection(firestore, `users/${userIdToView}/wishlist`) : null),
    [isOwnProfile, userIdToView, firestore]
  );
  const { data: wishlistItems, isLoading: isWishlistLoading } = useCollection<WishlistItem>(wishlistRef);

  const notificationsQuery = useMemoFirebase(
    () => (isOwnProfile && userIdToView
      ? query(collection(firestore, `users/${userIdToView}/notifications`), orderBy('createdAt', 'desc'))
      : null),
    [isOwnProfile, userIdToView, firestore]
  );
  const { data: notifications, isLoading: isNotificationsLoading } = useCollection<Notification>(notificationsQuery);

  const pendingRequestsCount = useMemo(() => {
    if (!collaborationRequests) return 0;
    return collaborationRequests.filter(req => req.status === 'pending').length;
  }, [collaborationRequests]);

  const unreadNotificationsCount = useMemo(() => {
    if (!notifications) return 0;
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  const socialLinks = creatorProfile?.platformLinks?.map((link: string) => {
    if (link.includes('instagram.com')) return { Icon: Instagram, href: link, name: 'Instagram' };
    if (link.includes('youtube.com')) return { Icon: Youtube, href: link, name: 'YouTube' };
    if (link.includes('twitter.com') || link.includes('x.com')) return { Icon: Twitter, href: link, name: 'Twitter' };
    if (link.includes('linkedin.com')) return { Icon: Linkedin, href: link, name: 'LinkedIn' };
    return { Icon: Globe, href: link, name: 'Website' };
  }) || [];

  // Get all Instagram URLs from platform links
  const instagramUrls = useMemo(() => {
    return creatorProfile?.platformLinks?.filter((link: string) => link.includes('instagram.com')) || [];
  }, [creatorProfile?.platformLinks]);

  // For backward compat: first Instagram URL
  const instagramUrl = instagramUrls[0] || null;

  // Multi-account analytics: { username: InstagramAnalytics }
  const instagramAnalyticsMulti = creatorProfile?.instagramAnalyticsMulti || {};
  const accountUsernames = Object.keys(instagramAnalyticsMulti);
  const [activeAccountTab, setActiveAccountTab] = useState<string>('');

  const isLoading = isCurrentUserLoading || isProfileLoading || isUserDocLoading || (isOwnProfile && (isWishlistLoading || isRequestsLoading || isNotificationsLoading));

  const handleComingSoon = () => {
    toast({
      title: 'Feature Coming Soon!',
      description: 'This feature is currently under development.',
    });
  };

  const handleImportInstagram = async () => {
    if (!instagramUrls || instagramUrls.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Instagram URLs',
        description: 'Please add your Instagram URLs to your profile first.',
      });
      return;
    }

    setIsImporting(true);
    const allAnalytics: Record<string, any> = { ...instagramAnalyticsMulti };
    let successCount = 0;

    try {
      for (const url of instagramUrls) {
        try {
          const response = await fetch('/api/instagram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, type: 'profile' }),
          });
          const result = await response.json();
          if (result.success && result.data) {
            const username = result.data.profile?.username || url;
            allAnalytics[username] = result.data;
            successCount++;
          }
        } catch (err) {
          console.error('Failed to fetch for', url, err);
        }
      }

      if (successCount > 0 && creatorProfileRef && firestore && isOwnProfile) {
        await updateDoc(creatorProfileRef, {
          instagramAnalyticsMulti: allAnalytics,
          // Also keep single-account backward compat
          instagramAnalytics: Object.values(allAnalytics)[0] || null,
        });
        toast({
          title: 'Instagram Data Imported',
          description: `Successfully imported analytics for ${successCount} account(s).`,
        });
      } else if (successCount === 0) {
        toast({
          variant: 'destructive',
          title: 'Import Failed',
          description: 'Could not fetch data for any account.',
        });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to connect to the server.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full mx-auto space-y-6">
        <Card className="overflow-hidden">
          <Skeleton className="h-36 md:h-48 w-full" />
          <div className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-6 relative -mt-20 md:-mt-24">
              <Skeleton className="relative h-28 w-28 md:h-32 md:w-32 rounded-full border-4 flex-shrink-0" />
              <div className="mt-4 sm:mt-0 flex-1 min-w-0 space-y-3">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-5 w-1/4" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
        </Card>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!creatorProfile || !userData) {
    return (
      <div className="text-center py-10">
        <p>Could not load creator profile. Please try again later.</p>
      </div>
    )
  }

  return (
    <div className="w-full mx-auto space-y-6">
      {/* Header Section */}
      <Card className="overflow-hidden shadow-lg border-white/10 bg-card">
        <div className={`relative h-36 md:h-48 w-full bg-accent/10`}>
          <Image
            src={creatorProfile?.bannerUrl || "https://picsum.photos/seed/creator-banner/1200/400"}
            alt="Creator Banner"
            fill
            priority
            sizes="100vw"
            style={{ objectFit: 'cover' }}
            data-ai-hint="creator banner"
          />
        </div>
        <div className="p-4 md:p-6">
          <div className="relative flex flex-col md:flex-row md:items-end md:gap-6 -mt-[4.5rem]">
            <div className={`relative h-28 w-28 md:h-32 md:w-32 rounded-full border-4 border-background overflow-hidden shadow-lg flex-shrink-0`}>
              <Image
                src={userData?.logoUrl || "https://picsum.photos/seed/creator-avatar/200/200"}
                alt="Creator Avatar"
                fill
                sizes="(max-width: 768px) 112px, 128px"
                style={{ objectFit: 'cover' }}
                data-ai-hint="creator portrait"
              />
            </div>
            <div className="mt-4 md:mt-0 flex-1 min-w-0">
              <div className="md:flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl md:text-3xl font-bold font-headline truncate">
                      {userData.name}
                    </h1>
                    <BadgeCheck className="h-6 w-6 text-primary flex-shrink-0" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 truncate">
                    {userData.email}
                  </p>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0 mt-4 md:mt-0">
                  {isOwnProfile ? (
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm">
                        <Link href="/campaigns">
                          <Search className="mr-2 h-4 w-4" />
                          Explore
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="icon" className="h-9 w-9">
                        <Link href={`/creator/profile/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <CollaborateModal creatorName={userData.name} creatorId={userIdToView!}>
                      <Button>Collaborate</Button>
                    </CollaborateModal>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2">
            {(creatorProfile.categories || []).map((cat: string) => (
              <Badge key={cat} variant="secondary">{cat}</Badge>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {creatorProfile.location && <div className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {creatorProfile.location}</div>}
          </div>
        </div>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>About {userData.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {creatorProfile.bio || "This creator hasn't written a bio yet."}
              </p>
            </CardContent>
          </Card>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full h-auto justify-start overflow-x-auto overflow-y-hidden">
              <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
              {isOwnProfile && <TabsTrigger value="wishlist">Wishlist</TabsTrigger>}
              {isOwnProfile && <TabsTrigger value="my-campaigns">My Campaigns</TabsTrigger>}
              {isOwnProfile && <TabsTrigger value="analytics">Analytics</TabsTrigger>}
              {isOwnProfile && (
                <TabsTrigger value="inbox">
                  <div className='flex items-center gap-2'>
                    Inbox
                    {(pendingRequestsCount + unreadNotificationsCount) > 0 && (
                      <Badge className="h-5 w-5 p-0 flex items-center justify-center">{pendingRequestsCount + unreadNotificationsCount}</Badge>
                    )}
                  </div>
                </TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="portfolio" className="mt-4 space-y-6">
              {/* Campaign Portfolio */}
              <CampaignPortfolio userId={userIdToView} />

              {/* Instagram Analytics */}
              {accountUsernames.length > 0 ? (
                <>
                  {/* Account Selector Tabs */}
                  {accountUsernames.length > 1 && (
                    <div className="flex gap-2 flex-wrap">
                      {accountUsernames.map((username) => (
                        <Button
                          key={username}
                          variant={(activeAccountTab === username || (!activeAccountTab && username === accountUsernames[0])) ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setActiveAccountTab(username)}
                          className="gap-2"
                        >
                          <Instagram className="h-4 w-4" />
                          @{username}
                        </Button>
                      ))}
                    </div>
                  )}

                  {/* Show analytics for selected account */}
                  {accountUsernames.map((username) => {
                    const isActive = activeAccountTab === username || (!activeAccountTab && username === accountUsernames[0]);
                    if (!isActive) return null;
                    const accountData = instagramAnalyticsMulti[username];
                    const accountUrl = instagramUrls.find((u: string) => u.includes(username)) || instagramUrls[0];
                    return (
                      <InstagramAnalyticsCard
                        key={username}
                        instagramUrl={accountUrl}
                        cachedData={accountData}
                        isOwnProfile={isOwnProfile}
                        onDataUpdate={async (data) => {
                          if (creatorProfileRef && firestore && isOwnProfile) {
                            try {
                              await updateDoc(creatorProfileRef, {
                                [`instagramAnalyticsMulti.${username}`]: data,
                              });
                            } catch (e) {
                              console.error('Error saving instagram data:', e);
                            }
                          }
                        }}
                      />
                    );
                  })}

                  {/* Import more button */}
                  {isOwnProfile && (
                    <div className="flex justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={handleImportInstagram}
                        disabled={isImporting}
                      >
                        {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Instagram className="h-4 w-4" />}
                        {isImporting ? 'Importing...' : 'Refresh All Accounts'}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent>
                    <div className="text-center py-12">


                      {isOwnProfile && (
                        <div className="mt-8 border-t pt-8">
                          <div className="flex flex-col items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                              <Instagram className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h4 className="font-medium text-sm">Import from Instagram</h4>
                              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                                Showcase your Instagram posts as portfolio items to attract brand collaborations.
                              </p>
                            </div>
                            <Button
                              variant="default"
                              size="sm"
                              className="mt-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 border-0 text-white"
                              onClick={handleImportInstagram}
                              disabled={isImporting}
                            >
                              {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Instagram className="mr-2 h-4 w-4" />}
                              {isImporting ? 'Importing...' : 'Import Instagram Data'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            {isOwnProfile && (
              <>
                <TabsContent value="wishlist" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>My Wishlist</CardTitle>
                      <CardDescription>
                        Campaigns you've saved to check out later.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <WishlistFeed wishlistItems={wishlistItems || []} />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="my-campaigns" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>My Live Campaigns</CardTitle>
                      <CardDescription>
                        Campaigns you have joined and are currently active.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <MyCampaignsFeed userId={userIdToView} />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="inbox" className="mt-4 space-y-4">
                  {/* Notifications Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Notifications</CardTitle>
                      <CardDescription>
                        Updates about your campaign submissions and activity.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {notifications && notifications.length > 0 ? (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 rounded-lg border ${notification.isRead ? 'bg-muted/30' : 'bg-primary/5 border-primary/20'}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-full flex-shrink-0 ${notification.type === 'submission_approved' ? 'bg-green-500/20 text-green-500' :
                                notification.type === 'submission_rejected' ? 'bg-red-500/20 text-red-500' :
                                  'bg-primary/20 text-primary'
                                }`}>
                                <CheckCircle className="h-5 w-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-semibold text-sm">{notification.title}</p>
                                  {!notification.isRead && <Badge variant="secondary" className="text-xs">New</Badge>}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                                {notification.campaignName && (
                                  <Link href={`/creator/campaigns/${notification.campaignId}`} className="text-xs text-primary hover:underline mt-2 inline-block">
                                    View Campaign →
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <p className="text-sm">No notifications yet.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Collaboration Requests Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Collaboration Requests</CardTitle>
                      <CardDescription>
                        Messages from businesses interested in collaborating.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {collaborationRequests && collaborationRequests.length > 0 ? (
                        collaborationRequests.map((request) => (
                          <CollaborationRequestCard key={request.id} request={request} />
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <p className="text-sm">No collaboration requests yet.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="analytics" className="mt-4 space-y-6">
                  {/* Campaign Performance - Coming Soon */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Campaign Performance</CardTitle>
                      <CardDescription>Track your campaign metrics and earnings</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 border rounded-lg bg-muted/20">
                        <Briefcase className="mx-auto h-10 w-10 text-muted-foreground" />
                        <h3 className="mt-3 text-base font-medium">Performance Tracking Coming Soon</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Campaign analytics will appear here once you join campaigns.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <Card className="shadow-lg border-white/10">
            <CardHeader>
              <CardTitle>Contact & Socials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${userData.email}`} className="hover:underline truncate">{userData.email}</a>
              </div>
              {socialLinks.map(({ Icon, href, name }: { Icon: React.ElementType, href: string, name: string }) => (
                <div key={href} className="flex items-center gap-3 text-sm">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <a href={href} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary truncate">{name}</a>
                </div>
              ))}
              {isOwnProfile && (
                <div className="pt-2 space-y-2">
                  <Button variant="outline" size="sm" className="w-full" onClick={handleComingSoon}>
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Connect another account
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="shadow-lg border-white/10">
            <CardHeader>
              <CardTitle>Achievements</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">🔒 Verified</Badge>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-white/10">
            <CardHeader>
              <CardTitle>Brand Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Star className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">No reviews yet.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

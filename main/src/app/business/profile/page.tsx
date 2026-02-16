
'use client';

import {
  BadgeCheck,
  Building,
  MapPin,
  Pencil,
  Globe,
  Twitter,
  Instagram,
  Mail,
  Plus,
  Star,
  LayoutDashboard,
  Bell,
  MessageSquare,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import React, { useRef, useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { collection, query, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking, useCollection } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { CampaignPost } from './_components/campaign-post';
import type { Campaign, Submission } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function BusinessProfileContent() {
  const { toast } = useToast();
  const { user: currentUser, isUserLoading: isCurrentUserLoading } = useUser();
  const firestore = useFirestore();
  const searchParams = useSearchParams();

  const userIdFromQuery = searchParams.get('userId');
  const profileUserId = userIdFromQuery || currentUser?.uid;
  const isOwnProfile = !userIdFromQuery || userIdFromQuery === currentUser?.uid;

  const businessProfileRef = useMemoFirebase(
    () => (profileUserId ? doc(firestore, `users/${profileUserId}/businessProfile`, profileUserId) : null),
    [profileUserId, firestore]
  );
  const { data: businessProfile, isLoading: isProfileLoading } = useDoc<any>(businessProfileRef);

  const userRef = useMemoFirebase(
    () => (profileUserId ? doc(firestore, 'users', profileUserId) : null),
    [profileUserId, firestore]
  );
  const { data: userData, isLoading: isUserDocLoading } = useDoc<any>(userRef);

  const campaignsQuery = useMemoFirebase(
    () => profileUserId ? query(collection(firestore, 'campaigns'), where('businessId', '==', profileUserId)) : null,
    [profileUserId, firestore]
  );
  const { data: rawCampaigns, isLoading: campaignsLoading } = useCollection<Campaign>(campaignsQuery);

  const campaignIds = useMemo(() => rawCampaigns?.map(c => c.id) || [], [rawCampaigns]);

  const submissionsQuery = useMemoFirebase(
    () => (firestore && campaignIds.length > 0 && profileUserId) ? query(collection(firestore, 'submissions'), where('campaignId', 'in', campaignIds), where('businessId', '==', profileUserId)) : null,
    [firestore, campaignIds, profileUserId]
  );
  const { data: submissions, isLoading: submissionsLoading } = useCollection<Submission>(submissionsQuery);

  const campaigns = useMemo(() => {
    if (!rawCampaigns) return [];
    return rawCampaigns.map(c => {
      // In a real app, this data would be calculated from an earnings/views collection
      const views = 0;
      const paid = 0;
      const progress = 0;
      const acquiredCpm = undefined;

      return {
        ...c,
        views: views,
        progress: progress,
        acquiredCpm: acquiredCpm,
      };
    });
  }, [rawCampaigns]);

  const brandStats = useMemo(() => {
    if (!campaigns || campaigns.length === 0) {
      return {
        averageCpm: 0,
        totalViews: 0,
        campaignsRun: 0,
      };
    }

    const totalCpm = campaigns.reduce((acc, c) => acc + (c.cpmRate ?? 0), 0);
    const averageCpm = campaigns.length > 0 ? totalCpm / campaigns.length : 0;
    const totalViews = campaigns.reduce((acc, c) => acc + c.views, 0);

    return {
      averageCpm: averageCpm,
      totalViews: totalViews,
      campaignsRun: campaigns.length,
    };
  }, [campaigns]);

  const isLoading = isCurrentUserLoading || isProfileLoading || isUserDocLoading || campaignsLoading || submissionsLoading;

  if (isLoading) {
    return (
      <div className="w-full mx-auto space-y-6">
        <Card className="overflow-hidden">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-6">
              <Skeleton className="relative h-24 w-24 md:h-32 md:w-32 rounded-lg border-4 flex-shrink-0" />
              <div className="mt-4 sm:mt-0 flex-1 min-w-0 space-y-3">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-5 w-3/4" />
                <div className="flex gap-4">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-24" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!businessProfile || !userData) {
    return (
      <div className="text-center py-10">
        <p>Could not load business profile. Please try again later.</p>
      </div>
    )
  }


  return (
    <div className="w-full mx-auto space-y-6">
      {/* Header Section */}
      <Card className="overflow-hidden shadow-lg border-white/10 bg-card">
        <div className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-6">
            <div className={`relative h-24 w-24 md:h-32 md:w-32 rounded-lg border-4 border-background overflow-hidden shadow-lg flex-shrink-0`}>
              <Image
                src={userData?.logoUrl || "https://picsum.photos/seed/brand-logo/200/200"}
                alt="Brand Logo"
                fill
                style={{ objectFit: 'cover' }}
                data-ai-hint="company logo"
              />
            </div>
            <div className="mt-4 sm:mt-0 flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <h1 className="text-2xl md:text-3xl font-bold font-headline truncate">
                      {userData.name}
                    </h1>
                    <BadgeCheck className="h-6 w-6 text-primary flex-shrink-0" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 truncate">
                    {businessProfile.tagline}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Building className="h-4 w-4" />
                      <span>{businessProfile.industryType}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      <span>{businessProfile.location}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  {isOwnProfile && (
                    <>
                      <Button asChild size="sm">
                        <Link href="/business/dashboard">
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          Dashboard
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="icon">
                        <Link href="/business/messages">
                          <MessageSquare className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="icon">
                        <Link href="/business/profile/edit">
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg border-white/10">
            <CardHeader>
              <CardTitle>About {userData.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {businessProfile.about}
              </p>
            </CardContent>
          </Card>
        
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <Card className="shadow-lg border-white/10">
            <CardHeader>
              <CardTitle>Brand Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">Average CPM</p>
                <p className="font-bold">₹{brandStats.averageCpm.toFixed(2)}</p>
              </div>
              <Separator />
              {isOwnProfile && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground">Total Verified Views</p>
                    <p className="font-bold">{brandStats.totalViews.toLocaleString()}</p>
                  </div>
                  <Separator />
                </>
              )}
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">Campaigns Run</p>
                <p className="font-bold">{brandStats.campaignsRun}</p>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">Average Rating</p>
                <div className="flex items-center gap-1 font-bold">
                  <Star className="h-4 w-4 text-yellow-400" /> 0.0
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-white/10">
            <CardHeader>
              <CardTitle>Contact & Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {businessProfile.companyWebsite && (
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <Link href={businessProfile.companyWebsite} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                    {businessProfile.companyWebsite.replace('https://', '')}
                  </Link>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">{userData.email}</span>
              </div>
              {businessProfile.twitter && (
                <div className="flex items-center gap-3">
                  <Twitter className="h-4 w-4 text-muted-foreground" />
                  <Link href={`https://twitter.com/${businessProfile.twitter.substring(1)}`} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                    {businessProfile.twitter}
                  </Link>
                </div>
              )}
              {businessProfile.instagram && (
                <div className="flex items-center gap-3">
                  <Instagram className="h-4 w-4 text-muted-foreground" />
                  <Link href={`https://instagram.com/${businessProfile.instagram.substring(1)}`} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                    {businessProfile.instagram}
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function BusinessProfilePage() {
  return (
    <Suspense fallback={<div className="w-full mx-auto space-y-6">
      <Card className="overflow-hidden">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-6">
            <Skeleton className="relative h-24 w-24 md:h-32 md:w-32 rounded-lg border-4 flex-shrink-0" />
            <div className="mt-4 sm:mt-0 flex-1 min-w-0 space-y-3">
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-5 w-3/4" />
              <div className="flex gap-4">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>}>
      <BusinessProfileContent />
    </Suspense>
  )
}

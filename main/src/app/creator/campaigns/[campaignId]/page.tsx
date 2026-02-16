
'use client';

import {
  ArrowLeft,
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  Link as LinkIcon,
  ShieldCheck,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Campaign, Earning, Submission, User } from '@/lib/types';
import { useParams } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase, useCollection, useUser } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';
import { format } from 'date-fns';
import Image from 'next/image';

export default function CreatorCampaignDetailPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const campaignRef = useMemoFirebase(
    () => (campaignId ? doc(firestore, 'campaigns', campaignId) : null),
    [campaignId, firestore]
  );
  const { data: campaign, isLoading: campaignLoading } = useDoc<Campaign>(campaignRef);

  const businessUserRef = useMemoFirebase(
    () => (campaign ? doc(firestore, 'users', campaign.businessId) : null),
    [campaign, firestore]
  );
  const { data: businessUser, isLoading: businessUserLoading } = useDoc<User>(businessUserRef);

  const submissionQuery = useMemoFirebase(
    () => (user && campaignId) ? query(collection(firestore, 'submissions'), where('campaignId', '==', campaignId), where('creatorId', '==', user.uid)) : null,
    [campaignId, firestore, user]
  );
  const { data: submissions, isLoading: submissionsLoading } = useCollection<Submission>(submissionQuery);
  const submission = useMemo(() => submissions?.[0], [submissions]);

  const earningsQuery = useMemoFirebase(
    () => (user && campaignId) ? query(collection(firestore, 'earnings'), where('campaignId', '==', campaignId), where('creatorId', '==', user.uid)) : null,
    [campaignId, firestore, user]
  );
  const { data: earnings, isLoading: earningsLoading } = useCollection<Earning>(earningsQuery);
  const earning = useMemo(() => earnings?.[0], [earnings]);

  const performance = useMemo(() => {
    const views = earning?.views || 0;
    const cpm = campaign?.cpmRate || 0;
    const maxPay = campaign?.maxPayPerCreator || 0;

    let potentialEarning = (views / 1000) * cpm;
    if (maxPay > 0 && potentialEarning > maxPay) {
      potentialEarning = maxPay;
    }

    return {
      views,
      potentialEarning,
    };
  }, [earning, campaign]);

  const isLoading = campaignLoading || businessUserLoading || isUserLoading || submissionsLoading || earningsLoading;

  const getFormattedDate = (date: any) => {
    if (!date) return '';
    if (date.seconds) {
      return format(new Date(date.seconds * 1000), 'PPP');
    }
    return format(new Date(date), 'PPP');
  };

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-9 w-64" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="lg:col-span-1 space-y-6">
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!campaign || !user) {
    return <div className="text-center py-10">Campaign data could not be loaded.</div>
  }

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/creator/profile/${user.uid}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight font-headline">
              {campaign.name}
            </h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Avatar className="h-5 w-5">
                <AvatarImage src={businessUser?.logoUrl} />
                <AvatarFallback>{businessUser?.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span>{businessUser?.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Verified Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performance.views.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground">Updated in real-time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Potential Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{performance.potentialEarning.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Based on ₹{campaign.cpmRate}/1k views
            </p>
          </CardContent>
        </Card>
        {campaign.maxPayPerCreator && campaign.maxPayPerCreator > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Max Payout/Creator</CardTitle>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{campaign.maxPayPerCreator.toLocaleString('en-IN')}
              </div>
              <p className="text-xs text-muted-foreground">Maximum possible earning</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Submission</CardTitle>
              <CardDescription>
                Details about the content you submitted for this campaign.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!submission ? (
                <div className="text-center py-10 text-muted-foreground">
                  You have not made a submission for this campaign yet.
                </div>
              ) : (
                <div className="grid md:grid-cols-5 gap-6 items-start">
                  <div className="md:col-span-2 relative aspect-square">
                    <Image
                      src={`https://picsum.photos/seed/${submission.id}/600/600`}
                      alt={`Your post for ${campaign.name}`}
                      fill
                      style={{ objectFit: 'cover' }}
                      className="rounded-md"
                      data-ai-hint="social media post"
                    />
                  </div>
                  <div className="md:col-span-3 space-y-4">
                    <div className="space-y-1">
                      <h4 className="font-semibold">Post Status</h4>
                      <Badge variant={submission.status === 'pending' ? 'secondary' : submission.status === 'approved' ? 'default' : 'destructive'} className='capitalize'>
                        {submission.status === 'pending' && <Clock className="mr-2 h-4 w-4" />}
                        {submission.status === 'approved' && <CheckCircle2 className="mr-2 h-4 w-4" />}
                        {submission.status === 'rejected' && <XCircle className="mr-2 h-4 w-4" />}
                        {submission.status}
                      </Badge>
                    </div>
                    {submission.status === 'rejected' && submission.rejectionReason && (
                      <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive-foreground">
                        <h5 className="font-semibold text-sm">Rejection Feedback</h5>
                        <p className="text-xs mt-1">{submission.rejectionReason}</p>
                      </div>
                    )}
                    <div className="space-y-1">
                      <h4 className="font-semibold">Post Link</h4>
                      <a href={submission.postUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all flex items-center gap-2">
                        <LinkIcon className="h-4 w-4 flex-shrink-0" /> {submission.postUrl}
                      </a>
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-semibold">Submitted On</h4>
                      <p className="text-sm text-muted-foreground">{format(new Date(submission.submittedAt.seconds * 1000), 'PPP')}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Banknote className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-muted-foreground">Total Budget</p>
                  <p className="font-semibold">₹{(campaign.budget ?? 0).toLocaleString('en-IN')}</p>
                </div>
              </div>
              {campaign.endDate && (
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-muted-foreground">End Date</p>
                    <p className="font-semibold">{getFormattedDate(campaign.endDate)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Campaign Brief</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{campaign.description}</p>
              <Button variant="link" asChild className="p-0 h-auto mt-2">
                <Link href={`/campaigns/${campaignId}`}>View Full Campaign Details</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

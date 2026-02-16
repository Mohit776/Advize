
'use client';

import {
  ArrowLeft,
  Banknote,
  Calendar,
  Check,
  ChevronRight,
  Eye,
  Facebook,
  Gem,
  Ghost,
  Hand,
  Instagram,
  Linkedin,
  LineChart,
  Mic2,
  Percent,
  ShieldCheck,
  Star,
  Tags,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  X,
  Youtube,
  Ban,
} from 'lucide-react';
import Link from 'next/link';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Campaign, Earning, Submission, User } from '@/lib/types';
import { useParams } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase, useCollection, updateDocumentNonBlocking, useUser, addDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, where, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { RejectSubmissionModal } from './_components/reject-submission-modal';
import { useToast } from '@/hooks/use-toast';
import { CreatorPost } from '@/components/shared/creator-post';
import { CreatorInstagramStats } from '@/components/shared/creator-instagram-stats';

const platformIcons: { [key: string]: React.ReactNode } = {
  Instagram: <Instagram className="h-5 w-5" />,
  YouTube: <Youtube className="h-5 w-5" />,
  Moj: <Gem className="h-5 w-5" />,
  ShareChat: <Mic2 className="h-5 w-5" />,
  LinkedIn: <Linkedin className="h-5 w-5" />,
  Facebook: <Facebook className="h-5 w-5" />,
  Snapchat: <Ghost className="h-5 w-5" />,
};

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const campaignRef = useMemoFirebase(
    () => (campaignId ? doc(firestore, 'campaigns', campaignId) : null),
    [campaignId, firestore]
  );
  const { data: campaign, isLoading: campaignLoading } = useDoc<Campaign>(campaignRef);

  const submissionsQuery = useMemoFirebase(
    () => (user && campaignId) ? query(collection(firestore, 'submissions'), where('campaignId', '==', campaignId), where('businessId', '==', user.uid)) : null,
    [campaignId, firestore, user]
  );
  const { data: submissions, isLoading: submissionsLoading } = useCollection<Submission>(submissionsQuery);

  const earningsQuery = useMemoFirebase(
    () => (user && campaignId) ? query(collection(firestore, 'earnings'), where('campaignId', '==', campaignId), where('businessId', '==', user.uid)) : null,
    [campaignId, firestore, user]
  );
  const { data: earnings, isLoading: earningsLoading } = useCollection<Earning>(earningsQuery);

  const creatorIds = useMemo(() => {
    if (!submissions) return [];
    return [...new Set(submissions.map(s => s.creatorId))];
  }, [submissions]);

  const creatorsQuery = useMemoFirebase(
    () => (firestore && creatorIds.length > 0) ? query(collection(firestore, 'users'), where('id', 'in', creatorIds)) : null,
    [firestore, creatorIds]
  );
  const { data: creators, isLoading: creatorsLoading } = useCollection<User>(creatorsQuery);

  // Fetch creator profiles from subcollections (users/{userId}/creatorProfile/{userId})
  const [creatorProfiles, setCreatorProfiles] = useState<Map<string, any>>(new Map());
  const [creatorProfilesLoading, setCreatorProfilesLoading] = useState(false);

  useEffect(() => {
    if (!firestore || creatorIds.length === 0) {
      setCreatorProfiles(new Map());
      return;
    }

    const fetchProfiles = async () => {
      setCreatorProfilesLoading(true);
      try {
        const { getDoc, doc } = await import('firebase/firestore');
        const profilesMap = new Map<string, any>();

        await Promise.all(
          creatorIds.map(async (creatorId) => {
            try {
              const profileRef = doc(firestore, `users/${creatorId}/creatorProfile`, creatorId);
              const profileSnap = await getDoc(profileRef);
              if (profileSnap.exists()) {
                profilesMap.set(creatorId, { id: profileSnap.id, ...profileSnap.data() });
              }
            } catch (err) {
              console.error(`Failed to fetch profile for ${creatorId}:`, err);
            }
          })
        );

        setCreatorProfiles(profilesMap);
      } catch (err) {
        console.error('Error fetching creator profiles:', err);
      } finally {
        setCreatorProfilesLoading(false);
      }
    };

    fetchProfiles();
  }, [firestore, creatorIds]);

  const creatorMap = useMemo(() => {
    if (!creators) return new Map();
    return new Map(creators.map(c => [c.id, c]));
  }, [creators]);

  // creatorProfiles is already a Map, use it directly as creatorProfileMap
  const creatorProfileMap = creatorProfiles;


  const campaignData = useMemo(() => {
    if (!campaign || !earnings) return null;

    const totalSpend = earnings.reduce((acc, e) => acc + e.amount, 0);
    const totalViews = earnings.reduce((acc, e) => acc + e.views, 0);
    const obtainedCPM = totalViews > 0 && campaign.cpmRate ? (totalSpend / totalViews) * 1000 : 0;

    // Engagement needs more data.
    const engagementRate = 0;

    const viewsOverTime = [
      { date: 'Start', views: 0 },
      { date: 'Current', views: totalViews },
    ];

    return {
      ...campaign,
      totalSpend: totalSpend,
      views: totalViews,
      obtainedCPM: obtainedCPM,
      engagementRate: engagementRate,
      viewsOverTime: viewsOverTime,
    };
  }, [campaign, earnings]);

  const isLoading = campaignLoading || earningsLoading || submissionsLoading || (creatorIds.length > 0 && (creatorsLoading || creatorProfilesLoading)) || isUserLoading;

  const handleUpdateSubmissionStatus = (submission: Submission, status: 'approved' | 'rejected') => {
    if (!firestore || !campaignId || !user || !campaign) return;

    if (campaign?.businessId !== user.uid) {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'You are not authorized to modify this submission.'
      });
      return;
    }

    const submissionRef = doc(firestore, 'submissions', submission.id);
    updateDocumentNonBlocking(submissionRef, { status: status });

    if (status === 'approved') {
      // Add creator to the campaign's creatorIds array (for profile display)
      const campaignRef = doc(firestore, 'campaigns', campaignId);
      updateDocumentNonBlocking(campaignRef, {
        creatorIds: arrayUnion(submission.creatorId)
      });

      // Add creator to the campaign's group
      const groupRef = doc(firestore, 'groups', campaignId);
      updateDocumentNonBlocking(groupRef, {
        memberIds: arrayUnion(submission.creatorId)
      });

      // Determine the payout amount
      const payoutAmount = campaign.visibility === 'private' ? campaign.fixedPayPerCreator : campaign.cpmRate; // Simplified for now
      if (payoutAmount && payoutAmount > 0) {
        // Create earning record for creator
        const earningsCol = collection(firestore, 'earnings');
        addDocumentNonBlocking(earningsCol, {
          creatorId: submission.creatorId,
          businessId: user.uid, // Store businessId for security rule access
          campaignId: campaign.id,
          amount: payoutAmount,
          views: 0, // Views will be updated later by a separate process in a real app
          earnedAt: serverTimestamp()
        });

        // Create transaction for creator (payout)
        const creatorTransactionsCol = collection(firestore, 'transactions');
        addDocumentNonBlocking(creatorTransactionsCol, {
          userId: submission.creatorId,
          type: 'payout',
          amount: payoutAmount,
          status: 'completed',
          date: serverTimestamp(),
          details: `Payment for "${campaign.name}"`
        });

        // Create transaction for business (spend)
        const businessTransactionsCol = collection(firestore, 'transactions');
        addDocumentNonBlocking(businessTransactionsCol, {
          userId: user.uid,
          type: 'spend',
          amount: payoutAmount,
          status: 'completed',
          date: serverTimestamp(),
          details: `Payout to ${submission.creatorName} for "${campaign.name}"`
        });
      }

      // Create notification for creator
      const notificationsCol = collection(firestore, `users/${submission.creatorId}/notifications`);
      addDocumentNonBlocking(notificationsCol, {
        userId: submission.creatorId,
        type: 'submission_approved',
        title: 'Submission Approved! 🎉',
        message: `Great news! Your submission for "${campaign.name}" has been verified and approved. You are now part of the campaign.`,
        campaignId: campaign.id,
        campaignName: campaign.name,
        isRead: false,
        createdAt: serverTimestamp()
      });

      toast({
        title: 'Submission Approved!',
        description: `${submission.creatorName}'s submission is now verified and payout has been processed.`
      })
    }
  }

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
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="lg:col-span-1 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!campaignData || !campaign) {
    return <div className="text-center py-10">Campaign not found.</div>
  }

  const dosList = campaignData.dos?.split('\n').filter(item => item.trim() !== '');
  const dontsList = campaignData.donts?.split('\n').filter(item => item.trim() !== '');

  const getFormattedDate = (date: any) => {
    if (!date) return '';
    // Handle both Firestore Timestamp and string formats for graceful transition
    if (date.seconds) {
      return format(new Date(date.seconds * 1000), 'PPP');
    }
    // Fallback for string dates if they still exist in some documents
    return format(new Date(date), 'PPP');
  };

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/business/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight font-headline">
              {campaignData.name}
            </h2>
          </div>
        </div>
        <Badge
          variant={campaignData.status === 'Active' ? 'default' : 'secondary'}
          className="bg-green-500/10 text-green-400 border-green-500/20"
        >
          {campaignData.status}
        </Badge>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {campaignData.visibility === 'public' && campaignData.budget ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Budget Utilization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{campaignData.totalSpend.toLocaleString('en-IN')}
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  / ₹{campaignData.budget.toLocaleString('en-IN')}
                </span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Creator Pay</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{campaignData.fixedPayPerCreator?.toLocaleString('en-IN')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Per approved creator</p>
            </CardContent>
          </Card>
        )}
        {campaignData.visibility === 'public' ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Views</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(campaignData.views / 1000000).toFixed(2)}M
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Creators</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {creatorIds.length} <span className="text-sm font-normal text-muted-foreground">/ {campaignData.numberOfCreators}</span>
              </div>
            </CardContent>
          </Card>
        )}
        {campaignData.visibility === 'public' && campaignData.cpmRate && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Effective CPM</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{campaignData.obtainedCPM.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Target: ₹{campaignData.cpmRate.toFixed(2)}</p>
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
              <CardTitle>Views Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={campaignData.viewsOverTime}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `${value / 1000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorViews)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Creator Submissions</CardTitle>
              <CardDescription>
                Content submitted by creators for this campaign.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submissions && submissions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Creator</TableHead>
                      <TableHead>Profile</TableHead>
                      <TableHead>Instagram</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((sub) => {
                      const creator = creatorMap.get(sub.creatorId);
                      const creatorProfile = creatorProfileMap.get(sub.creatorId);
                      // Get Instagram URL from creator profile's platform links
                      const instagramUrl = creatorProfile?.platformLinks?.find((link: string) => link.includes('instagram.com'));
                      return (
                        <TableRow key={sub.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage
                                  src={creator?.logoUrl}
                                  alt={creator?.name}
                                />
                                <AvatarFallback>
                                  {creator?.name?.charAt(0) || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{creator?.name || 'Unnamed Creator'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <CreatorPost creatorName={sub.creatorName} postUrl={sub.username}>
                              <button className="text-primary hover:underline truncate">{sub.username}</button>
                            </CreatorPost>
                          </TableCell>
                          <TableCell>
                            <CreatorInstagramStats
                              creatorId={sub.creatorId}
                              creatorName={creator?.name || sub.creatorName}
                              creatorAvatar={creator?.logoUrl}
                              instagramUrl={instagramUrl}
                              cachedAnalytics={creatorProfile?.instagramAnalytics}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={sub.status === 'pending' ? 'secondary' : sub.status === 'approved' ? 'default' : 'destructive'} className='capitalize'>{sub.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right flex items-center justify-end gap-2">
                            <RejectSubmissionModal submission={sub} campaign={campaign} />
                            <Button variant="default" size="sm" onClick={() => handleUpdateSubmissionStatus(sub, 'approved')} disabled={sub.status !== 'pending'}>
                              <Check className="mr-2 h-4 w-4" />
                              Verify
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  No submissions have been made for this campaign yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Key Details */}
              <div className="space-y-4 text-sm">
                {campaignData.type && (
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Tags className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-muted-foreground">Campaign Type</p>
                      <p className="font-semibold">{campaignData.type}</p>
                    </div>
                  </div>
                )}
                {campaignData.platforms && (
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      {platformIcons[campaignData.platforms[0]] || <Tags className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-muted-foreground">Platforms</p>
                      <p className="font-semibold">{campaignData.platforms.join(', ')}</p>
                    </div>
                  </div>
                )}
                {campaignData.startDate && (
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-muted-foreground">Launch Date</p>
                      <p className="font-semibold">{getFormattedDate(campaignData.startDate)}</p>
                    </div>
                  </div>
                )}
                {campaignData.endDate && (
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-muted-foreground">End Date</p>
                      <p className="font-semibold">{getFormattedDate(campaignData.endDate)}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t pt-6">
                <h4 className="font-semibold mb-2 text-sm">Brief</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{campaignData.requirements}</p>
              </div>

              {(dosList && dosList.length > 0) || (dontsList && dontsList.length > 0) ? (
                <div className="border-t pt-6 space-y-4">
                  {dosList && dosList.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 text-sm text-green-600">Do's</h4>
                      <ul className="space-y-1">
                        {dosList.map((item, index) => (
                          <li key={index} className="text-xs text-muted-foreground flex gap-2">
                            <span className="text-green-500">•</span> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {dontsList && dontsList.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 text-sm text-red-600">Don'ts</h4>
                      <ul className="space-y-1">
                        {dontsList.map((item, index) => (
                          <li key={index} className="text-xs text-muted-foreground flex gap-2">
                            <span className="text-red-500">•</span> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


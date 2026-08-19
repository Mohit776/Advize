'use client';

import {
  ArrowLeft,
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  Heart,
  Link as LinkIcon,
  MessageCircle,
  ShieldCheck,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { SubmitContentModal } from '@/app/campaigns/[campaignId]/_components/submit-content-modal';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import type {
  Campaign,
  Earning,
  Submission,
  User,
  Donation,
} from '@/lib/types';

import { useParams } from 'next/navigation';

import {
  useDoc,
  useFirestore,
  useMemoFirebase,
  useCollection,
  useUser,
} from '@/firebase';

import {
  collection,
  doc,
  query,
  where,
} from 'firebase/firestore';

import { Skeleton } from '@/components/ui/skeleton';

import {
  useMemo,
  useState,
  useEffect,
} from 'react';

import { format } from 'date-fns';

import {
  Play,
  ImageIcon,
  Images,
} from 'lucide-react';

import { calculatePayoutFromCpm } from '@/lib/utils';

/* =========================================================
   TYPES
========================================================= */

type ScrapedPostData = {
  displayUrl?: string;
  url?: string;
  type?: string;
  ownerUsername?: string;
  likesCount?: number;
  commentsCount?: number;
  videoViewsCount?: number;
  caption?: string;
};

/* =========================================================
   INLINE INSTAGRAM POST PREVIEW
========================================================= */

function InlinePostPreview({
  postUrl,
  creatorName,
}: {
  postUrl: string;
  creatorName: string;
}) {
  const [postData, setPostData] =
    useState<ScrapedPostData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [imgError, setImgError] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchPost() {
      if (!postUrl) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setPostData(null);
      setImgError(false);

      try {
        const res = await fetch('/api/instagram', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: postUrl,
            type: 'post',
          }),
        });

        if (!res.ok) {
          throw new Error('Failed to fetch Instagram post');
        }

        const result = await res.json();

        if (
          !cancelled &&
          result.success &&
          result.data?.recentPosts?.[0]
        ) {
          setPostData({
            ...result.data.recentPosts[0],
            ownerUsername:
              result.data.profile?.username,
          });
        }
      } catch (error) {
        console.error(
          'Failed to fetch Instagram post:',
          error
        );

        if (!cancelled) {
          setPostData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchPost();

    return () => {
      cancelled = true;
    };
  }, [postUrl]);

  const fmt = (value?: number) => {
    const n = Number(value || 0);

    if (n <= 0) return '0';

    if (n >= 1_000_000) {
      return `${(n / 1_000_000).toFixed(1)}M`;
    }

    if (n >= 1_000) {
      return `${(n / 1_000).toFixed(1)}K`;
    }

    return String(n);
  };

  const typeIcon: Record<
    string,
    React.ReactNode
  > = {
    Video: <Play className="h-3 w-3" />,
    Image: <ImageIcon className="h-3 w-3" />,
    Sidecar: <Images className="h-3 w-3" />,
  };

  const typeLabel: Record<string, string> = {
    Video: 'Reel / Video',
    Image: 'Photo',
    Sidecar: 'Carousel',
  };

  if (loading) {
    return (
      <div className="w-full aspect-square rounded-lg bg-muted animate-pulse flex items-center justify-center">
        <Play className="h-8 w-8 text-muted-foreground/30" />
      </div>
    );
  }

  if (!postData || !postData.displayUrl) {
    return (
      <div className="w-full aspect-square rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-sm">
        Preview unavailable
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* TYPE */}
      <div className="flex items-center justify-between">
        <Badge
          variant="secondary"
          className="flex items-center gap-1.5 text-xs"
        >
          {postData.type
            ? typeIcon[postData.type]
            : null}

          {typeLabel[postData.type || ''] ??
            postData.type ??
            'Instagram Post'}
        </Badge>

        {postData.ownerUsername && (
          <span className="text-xs text-muted-foreground">
            @{postData.ownerUsername}
          </span>
        )}
      </div>

      {/* IMAGE */}
      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-muted">

        {!imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={postData.displayUrl}
            alt={`Post by ${creatorName}`}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        ) : postData.url ? (
          <iframe
            src={`${postData.url.replace(/\/$/, '')}/embed/`}
            className="w-full border-0"
            style={{
              minHeight: '400px',
            }}
            allowTransparency
            scrolling="no"
            title={`Instagram post by ${creatorName}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
            Preview unavailable
          </div>
        )}

        {postData.type === 'Video' &&
          !imgError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                <Play className="h-6 w-6 text-black fill-black ml-0.5" />
              </div>
            </div>
          )}
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-2">

        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-pink-500/10 border border-pink-500/20">
          <Heart className="h-3.5 w-3.5 text-pink-500" />

          <div>
            <p className="text-xs font-bold">
              {fmt(postData.likesCount)}
            </p>

            <p className="text-[10px] text-muted-foreground">
              Likes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <MessageCircle className="h-3.5 w-3.5 text-blue-500" />

          <div>
            <p className="text-xs font-bold">
              {fmt(postData.commentsCount)}
            </p>

            <p className="text-[10px] text-muted-foreground">
              Comments
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <Eye className="h-3.5 w-3.5 text-purple-500" />

          <div>
            <p className="text-xs font-bold">
              {fmt(postData.videoViewsCount)}
            </p>

            <p className="text-[10px] text-muted-foreground">
              Views
            </p>
          </div>
        </div>

      </div>

      {/* CAPTION */}
      {postData.caption && (
        <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
          {postData.caption}
        </p>
      )}
    </div>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function CreatorCampaignDetailPage() {
  const params = useParams();

  const campaignId =
    params.campaignId as string;

  const firestore = useFirestore();

  const {
    user,
    isUserLoading,
  } = useUser();

  /* =====================================================
     CAMPAIGN
  ===================================================== */

  const campaignRef = useMemoFirebase(
    () =>
      campaignId
        ? doc(
          firestore,
          'campaigns',
          campaignId
        )
        : null,
    [campaignId, firestore]
  );

  const {
    data: campaign,
    isLoading: campaignLoading,
  } = useDoc<Campaign>(campaignRef);

  /* =====================================================
     BUSINESS
  ===================================================== */

  const businessUserRef = useMemoFirebase(
    () =>
      campaign
        ? doc(
          firestore,
          'users',
          campaign.businessId
        )
        : null,
    [campaign, firestore]
  );

  const {
    data: businessUser,
    isLoading: businessUserLoading,
  } = useDoc<User>(businessUserRef);

  /* =====================================================
     CREATOR SUBMISSION
  ===================================================== */

  const submissionQuery = useMemoFirebase(
    () =>
      user && campaignId
        ? query(
          collection(
            firestore,
            'submissions'
          ),
          where(
            'campaignId',
            '==',
            campaignId
          ),
          where(
            'creatorId',
            '==',
            user.uid
          )
        )
        : null,
    [campaignId, firestore, user]
  );

  const {
    data: submissions,
    isLoading: submissionsLoading,
  } =
    useCollection<Submission>(
      submissionQuery
    );

  /*
   * There should normally only be one active
   * submission for a creator/campaign.
   */
  const submission = useMemo(
    () => submissions?.[0] ?? null,
    [submissions]
  );

  /* =====================================================
     NGO DONATIONS
  ===================================================== */

  const donationsQuery = useMemoFirebase(
    () =>
      user &&
        campaignId &&
        campaign?.type === 'NGO Support'
        ? query(
          collection(
            firestore,
            'donations'
          ),
          where(
            'campaignId',
            '==',
            campaignId
          ),
          where(
            'creatorId',
            '==',
            user.uid
          )
        )
        : null,
    [
      campaignId,
      firestore,
      user,
      campaign,
    ]
  );

  const {
    data: donations,
  } =
    useCollection<Donation>(
      donationsQuery
    );

  /* =====================================================
     EARNINGS
  ===================================================== */

  const earningsQuery = useMemoFirebase(
    () =>
      user && campaignId
        ? query(
          collection(
            firestore,
            'earnings'
          ),
          where(
            'campaignId',
            '==',
            campaignId
          ),
          where(
            'creatorId',
            '==',
            user.uid
          )
        )
        : null,
    [campaignId, firestore, user]
  );

  const {
    data: earnings,
    isLoading: earningsLoading,
  } =
    useCollection<Earning>(
      earningsQuery
    );

  const earning = useMemo(
    () => earnings?.[0] ?? null,
    [earnings]
  );

  /* =====================================================
     NGO LINK
  ===================================================== */

  const isNgoCampaign =
    campaign?.type === 'NGO Support' &&
    !!user &&
    (campaign.creatorIds || []).includes(
      user.uid
    );

  const creatorHandle =
    (user as any)?.username ||
    user?.uid ||
    '';

  const donationLink =
    typeof window !== 'undefined' &&
      campaign
      ? `${window.location.origin}/donate/${campaign.id}?ref=${encodeURIComponent(
        creatorHandle
      )}`
      : '';

  const copyDonationLink =
    async () => {
      if (!donationLink) return;

      try {
        await navigator.clipboard.writeText(
          donationLink
        );
      } catch (error) {
        console.error(
          'Failed to copy donation link:',
          error
        );
      }
    };

  /* =====================================================
     SCRAPED POST DATA
  ===================================================== */

  const [
    scrapedPostData,
    setScrapedPostData,
  ] =
    useState<ScrapedPostData | null>(
      null
    );

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      const postUrl =
        submission?.postUrl;

      /*
       * IMPORTANT:
       * Never fall back to submission.username.
       *
       * The endpoint expects the actual Instagram
       * post/reel URL.
       */
      if (
        !postUrl ||
        !postUrl.includes('instagram.com')
      ) {
        setScrapedPostData(null);
        return;
      }

      try {
        const res = await fetch(
          '/api/instagram',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              url: postUrl,
              type: 'post',
            }),
          }
        );

        if (!res.ok) {
          throw new Error(
            'Instagram request failed'
          );
        }

        const result =
          await res.json();

        if (
          !cancelled &&
          result.success &&
          result.data?.recentPosts?.[0]
        ) {
          setScrapedPostData(
            result.data.recentPosts[0]
          );
        }
      } catch (error) {
        console.error(
          'Failed to fetch Instagram stats:',
          error
        );

        if (!cancelled) {
          setScrapedPostData(null);
        }
      }
    }

    fetchStats();

    return () => {
      cancelled = true;
    };
  }, [submission?.postUrl]);

  /* =====================================================
     PERFORMANCE
  ===================================================== */

  const performance =
    useMemo(() => {
      const scrapedViews =
        Number(
          scrapedPostData?.videoViewsCount ||
          0
        );

      const earnedViews =
        Number(earning?.views || 0);

      /*
       * Display the larger value.
       *
       * IMPORTANT:
       * This is only UI data.
       * Final payout/verification must be
       * determined by the backend.
       */
      const views = Math.max(
        scrapedViews,
        earnedViews
      );

      const likes = Math.max(
        0,
        Number(
          scrapedPostData?.likesCount || 0
        )
      );

      const comments = Math.max(
        0,
        Number(
          scrapedPostData?.commentsCount ||
          0
        )
      );

      const cpm =
        Number(campaign?.cpmRate || 0);

      const maxPay =
        Number(
          campaign?.maxPayPerCreator || 0
        );

      let potentialEarning =
        calculatePayoutFromCpm(
          views,
          cpm
        );

      if (
        maxPay > 0 &&
        potentialEarning > maxPay
      ) {
        potentialEarning = maxPay;
      }

      return {
        views,
        likes,
        comments,
        potentialEarning,
      };
    }, [
      earning,
      campaign,
      scrapedPostData,
    ]);

  /* =====================================================
     LOADING
  ===================================================== */

  const isLoading =
    campaignLoading ||
    businessUserLoading ||
    isUserLoading ||
    submissionsLoading ||
    earningsLoading;

  /* =====================================================
     DATE FORMATTER
  ===================================================== */

  const getFormattedDate = (
    date: any
  ) => {
    if (!date) return '';

    if (
      typeof date === 'object' &&
      typeof date.seconds === 'number'
    ) {
      return format(
        new Date(
          date.seconds * 1000
        ),
        'PPP'
      );
    }

    const parsedDate =
      new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return '';
    }

    return format(
      parsedDate,
      'PPP'
    );
  };

  /* =====================================================
     LOADING UI
  ===================================================== */

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">

        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-9 w-64" />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({
            length: 4,
          }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-28"
            />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          <div className="lg:col-span-2">
            <Skeleton className="h-96 w-full" />
          </div>

          <div>
            <Skeleton className="h-64 w-full" />
          </div>

        </div>
      </div>
    );
  }

  /* =====================================================
     INVALID STATE
  ===================================================== */

  if (!campaign || !user) {
    return (
      <div className="text-center py-10">
        Campaign data could not be loaded.
      </div>
    );
  }

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="flex-1 space-y-6">

      {/* =================================================
          NGO SHARE LINK
      ================================================= */}

      {isNgoCampaign && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                Share NGO Donation Link
              </CardTitle>

              <CardDescription>
                Share this link on Instagram
                to attribute donations to
                you.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="flex flex-col sm:flex-row gap-2">

                <Input
                  readOnly
                  value={donationLink}
                />

                <Button
                  onClick={
                    copyDonationLink
                  }
                >
                  Copy Link
                </Button>

              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Donation Performance
              </CardTitle>

              <CardDescription>
                Donations attributed to
                your referral link.
              </CardDescription>
            </CardHeader>

            <CardContent className="grid grid-cols-2 gap-4">

              <div>
                <p className="text-2xl font-bold">
                  {donations?.length || 0}
                </p>

                <p className="text-sm text-muted-foreground">
                  Donors
                </p>
              </div>

              <div>
                <p className="text-2xl font-bold">
                  ₹
                  {(
                    donations || []
                  )
                    .filter(
                      (d) =>
                        d.status ===
                        'verified'
                    )
                    .reduce(
                      (
                        sum,
                        d
                      ) =>
                        sum +
                        Number(
                          d.amount || 0
                        ),
                      0
                    )
                    .toLocaleString(
                      'en-IN'
                    )}
                </p>

                <p className="text-sm text-muted-foreground">
                  Verified donations
                </p>
              </div>

            </CardContent>
          </Card>
        </>
      )}

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex items-center justify-between">

        <div className="flex items-center gap-4">

          <Button
            variant="outline"
            size="icon"
            asChild
          >
            <Link
              href={`/creator/profile/${user.uid}`}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div>

            <h2 className="text-3xl font-bold tracking-tight font-headline">
              {campaign.name}
            </h2>

            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">

              <Avatar className="h-5 w-5">
                <AvatarImage
                  src={
                    businessUser?.logoUrl
                  }
                />

                <AvatarFallback>
                  {businessUser?.name
                    ?.charAt(0)
                    ?.toUpperCase() ||
                    'B'}
                </AvatarFallback>
              </Avatar>

              <span>
                {businessUser?.name ||
                  'Business'}
              </span>

            </div>

          </div>

        </div>

      </div>

      {/* =================================================
          KPI GRID
      ================================================= */}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">

        {/* VIEWS */}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Verified Views
            </CardTitle>

            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>

            <div className="text-2xl font-bold">
              {performance.views.toLocaleString(
                'en-IN'
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              {scrapedPostData
                ? 'Live from Instagram'
                : 'From verification data'}
            </p>

          </CardContent>
        </Card>

        {/* POTENTIAL EARNINGS */}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">

            <CardTitle className="text-sm font-medium">
              Potential Earnings
            </CardTitle>

            <TrendingUp className="h-4 w-4 text-muted-foreground" />

          </CardHeader>

          <CardContent>

            <div className="text-2xl font-bold">
              ₹
              {performance.potentialEarning.toLocaleString(
                'en-IN',
                {
                  maximumFractionDigits: 2,
                }
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Based on ₹
              {campaign.cpmRate || 0}
              /1k views
            </p>

          </CardContent>
        </Card>

        {/* LIKES */}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">

            <CardTitle className="text-sm font-medium">
              Likes
            </CardTitle>

            <Heart className="h-4 w-4 text-pink-500" />

          </CardHeader>

          <CardContent>

            <div className="text-2xl font-bold">
              {performance.likes.toLocaleString(
                'en-IN'
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              On your submission
            </p>

          </CardContent>
        </Card>

        {/* COMMENTS */}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">

            <CardTitle className="text-sm font-medium">
              Comments
            </CardTitle>

            <MessageCircle className="h-4 w-4 text-blue-500" />

          </CardHeader>

          <CardContent>

            <div className="text-2xl font-bold">
              {performance.comments.toLocaleString(
                'en-IN'
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              On your submission
            </p>

          </CardContent>
        </Card>

      </div>

      {/* =================================================
          MAX PAYOUT
      ================================================= */}

      {campaign.maxPayPerCreator &&
        campaign.maxPayPerCreator > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">

              <CardTitle className="text-sm font-medium">
                Max Payout
              </CardTitle>

              <ShieldCheck className="h-4 w-4 text-muted-foreground" />

            </CardHeader>

            <CardContent>

              <div className="text-2xl font-bold">
                ₹
                {campaign.maxPayPerCreator.toLocaleString(
                  'en-IN'
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Maximum possible earning
              </p>

            </CardContent>
          </Card>
        )}

      {/* =================================================
          MAIN GRID
      ================================================= */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* =================================================
            SUBMISSION
        ================================================= */}

        <div className="lg:col-span-2 space-y-6">

          <Card>

            <CardHeader>

              <CardTitle>
                Your Submission
              </CardTitle>

              <CardDescription>
                Details about the content
                you submitted for this
                campaign.
              </CardDescription>

            </CardHeader>

            <CardContent>

              {/* ==========================================
                  NO SUBMISSION
              ========================================== */}

              {!submission ? (

                <div className="text-center py-10 text-muted-foreground">

                  <p>
                    You have not made a
                    submission for this
                    campaign yet.
                  </p>

                  <p className="text-sm mt-2">
                    Submit your campaign
                    Reel from the campaign
                    application flow to
                    begin verification.
                  </p>

                </div>

              ) : (

                <div className="grid md:grid-cols-5 gap-6 items-start">

                  {/* ======================================
                      PREVIEW
                  ====================================== */}

                  <div className="md:col-span-2">

                    {submission.postUrl ? (
                      <InlinePostPreview
                        postUrl={
                          submission.postUrl
                        }
                        creatorName={
                          submission.creatorName
                        }
                      />
                    ) : (
                      <div className="w-full aspect-square rounded-lg bg-muted flex items-center justify-center text-sm text-muted-foreground">
                        No Reel submitted
                      </div>
                    )}

                  </div>

                  {/* ======================================
                      DETAILS
                  ====================================== */}

                  <div className="md:col-span-3 space-y-5">

                    {/* STATUS */}

                    <div className="space-y-2">

                      <h4 className="font-semibold">
                        Post Status
                      </h4>

                      <Badge
                        variant={
                          submission.status ===
                            'pending'
                            ? 'secondary'
                            : submission.status ===
                              'approved'
                              ? 'default'
                              : 'destructive'
                        }
                        className="capitalize"
                      >

                        {submission.status ===
                          'pending' && (
                            <Clock className="mr-2 h-4 w-4" />
                          )}

                        {submission.status ===
                          'approved' && (
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                          )}

                        {submission.status ===
                          'rejected' && (
                            <XCircle className="mr-2 h-4 w-4" />
                          )}

                        {submission.status}

                      </Badge>

                      {/* PENDING */}

                      {submission.status ===
                        'pending' && (
                          <p className="text-xs text-muted-foreground">
                            Your Reel is currently
                            being verified. You
                            cannot change the
                            submitted Reel until
                            verification is
                            complete.
                          </p>
                        )}

                      {/* APPROVED */}

                      {/* APPROVED STATUS */}
                      {submission.status === 'approved' && (
                        <p className="text-xs text-muted-foreground">
                          {submission.postUrl
                            ? 'Your Reel has been verified successfully. You can update your Reel if needed.'
                            : 'Your profile has been approved. Submit your campaign Reel to begin verification.'}
                        </p>
                      )}

                      {/* REJECTED */}

                      {submission.status ===
                        'rejected' && (
                          <p className="text-xs text-muted-foreground">
                            Your Reel was rejected.
                            Submit a new Reel to
                            start verification again.
                          </p>
                        )}

                    </div>

                    {/* REJECTION */}

                    {submission.status ===
                      'rejected' &&
                      submission.rejectionReason && (
                        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">

                          <h5 className="font-semibold text-sm text-destructive">
                            Rejection Feedback
                          </h5>

                          <p className="text-xs mt-1 text-muted-foreground">
                            {
                              submission.rejectionReason
                            }
                          </p>

                        </div>
                      )}

                    {/* POST LINK */}

                    <div className="space-y-2">

                      <div className="flex items-center justify-between gap-3">

                        <h4 className="font-semibold">
                          Post Link
                        </h4>

                        {/* APPROVED:
                            UPDATE
                        */}

                        {/* SUBMIT / UPDATE / RESUBMIT */}

                        {/* APPROVED + NO REEL → SUBMIT REEL */}
                        {submission.status === 'approved' && !submission.postUrl && (
                          <SubmitContentModal
                            submissionId={submission.id}
                          >
                            <Button
                              variant="default"
                              size="sm"
                              className="h-8"
                            >
                              Submit Reel
                            </Button>
                          </SubmitContentModal>
                        )}

                        {/* APPROVED + REEL EXISTS → UPDATE REEL */}
                        {submission.status === 'approved' && submission.postUrl && (
                          <SubmitContentModal
                            submissionId={submission.id}
                            currentPostUrl={submission.postUrl}
                          >
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-8"
                            >
                              Update Reel
                            </Button>
                          </SubmitContentModal>
                        )}

                        {/* REJECTED → RESUBMIT REEL */}
                        {submission.status === 'rejected' && (
                          <SubmitContentModal
                            submissionId={submission.id}
                            currentPostUrl={submission.postUrl}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8"
                            >
                              Resubmit Reel
                            </Button>
                          </SubmitContentModal>
                        )}

                        {/* REJECTED:
                            RESUBMIT
                        */}

                        {submission.status ===
                          'rejected' && (
                            <SubmitContentModal
                              submissionId={
                                submission.id
                              }
                              currentPostUrl={
                                submission.postUrl
                              }
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8"
                              >
                                Resubmit Reel
                              </Button>
                            </SubmitContentModal>
                          )}

                      </div>

                      {submission.postUrl ? (

                        <a
                          href={
                            submission.postUrl
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline break-all flex items-center gap-2"
                        >

                          <LinkIcon className="h-4 w-4 flex-shrink-0" />

                          {submission.postUrl}

                        </a>

                      ) : (

                        <p className="text-sm text-muted-foreground">
                          No Reel link submitted.
                        </p>

                      )}

                    </div>

                    {/* SUBMITTED DATE */}

                    {submission.submittedAt && (
                      <div className="space-y-1">

                        <h4 className="font-semibold">
                          Submitted On
                        </h4>

                        <p className="text-sm text-muted-foreground">
                          {getFormattedDate(
                            submission.submittedAt
                          )}
                        </p>

                      </div>
                    )}

                  </div>

                </div>
              )}

            </CardContent>

          </Card>

        </div>

        {/* =================================================
            RIGHT COLUMN
        ================================================= */}

        <div className="lg:col-span-1 space-y-6">

          {/* CAMPAIGN INFO */}

          <Card>

            <CardHeader>
              <CardTitle>
                Campaign Info
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 text-sm">

              <div className="flex items-center gap-3">

                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Banknote className="h-4 w-4" />
                </div>

                <div>

                  <p className="text-muted-foreground">
                    Total Budget
                  </p>

                  <p className="font-semibold">
                    ₹
                    {(
                      campaign.budget ??
                      0
                    ).toLocaleString(
                      'en-IN'
                    )}
                  </p>

                </div>

              </div>

              {campaign.endDate && (
                <div className="flex items-center gap-3">

                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-4 w-4" />
                  </div>

                  <div>

                    <p className="text-muted-foreground">
                      End Date
                    </p>

                    <p className="font-semibold">
                      {getFormattedDate(
                        campaign.endDate
                      )}
                    </p>

                  </div>

                </div>
              )}

            </CardContent>

          </Card>

          {/* CAMPAIGN BRIEF */}

          <Card>

            <CardHeader>
              <CardTitle>
                Campaign Brief
              </CardTitle>
            </CardHeader>

            <CardContent>

              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {campaign.description}
              </p>

              <Button
                variant="link"
                asChild
                className="p-0 h-auto mt-2"
              >
                <Link
                  href={`/campaigns/${campaignId}`}
                >
                  View Full Campaign Details
                </Link>
              </Button>

            </CardContent>

          </Card>

        </div>

      </div>

    </div>
  );
}
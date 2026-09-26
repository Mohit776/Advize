'use client';

import {
  ArrowLeft,
  Calendar,
  Instagram,
  Youtube,
  ChevronRight,
  CheckCircle2,
  Gem,
  Mic2,
  Tags,
  Check,
  X,
  Linkedin,
  Facebook,
  Ghost,
  Heart,
  ShieldCheck,
  Wallet,
  Pencil,
  ExternalLink,
  Users,
  Copy,
  CheckCheck,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { doc, serverTimestamp, collection, query, where } from 'firebase/firestore';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useDoc,
  useFirestore,
  useMemoFirebase,
  useUser,
  useCollection,
  setDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';
import type { Campaign, CreatorPerformance, Submission, WishlistItem } from '@/lib/types';
import { JoinCampaignModal } from './_components/join-campaign-modal';
import { SubmitContentModal } from './_components/submit-content-modal';
import { CreatorPost } from '@/components/shared/creator-post';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { Sidebar } from '@/components/layout/sidebar';

const platformIcons: { [key: string]: React.ReactNode } = {
  Instagram: <Instagram className="h-4 w-4 sm:h-5 sm:w-5" />,
  YouTube: <Youtube className="h-4 w-4 sm:h-5 sm:w-5" />,
  Moj: <Gem className="h-4 w-4 sm:h-5 sm:w-5" />,
  ShareChat: <Mic2 className="h-4 w-4 sm:h-5 sm:w-5" />,
  LinkedIn: <Linkedin className="h-4 w-4 sm:h-5 sm:w-5" />,
  Facebook: <Facebook className="h-4 w-4 sm:h-5 sm:w-5" />,
  Snapchat: <Ghost className="h-4 w-4 sm:h-5 sm:w-5" />,
};

/** Splits text on URLs and renders each URL as a clickable <a> tag. */
function renderWithLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 break-all hover:opacity-80"
      >
        {part}
      </a>
    ) : (
      part
    )
  );
}

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [copiedCoupon, setCopiedCoupon] = useState(false);

  const campaignRef = useMemoFirebase(
    () => (campaignId ? doc(firestore, 'campaigns', campaignId) : null),
    [campaignId, firestore]
  );
  const { data: campaign, isLoading } = useDoc<Campaign>(campaignRef);

  const wishlistItemRef = useMemoFirebase(
    () => (user && campaignId ? doc(firestore, `users/${user.uid}/wishlist`, campaignId) : null),
    [user, firestore, campaignId]
  );
  const { data: wishlistItem } = useDoc<WishlistItem>(wishlistItemRef);

  const isWishlisted = !!wishlistItem;

  // Check if creator already submitted to this campaign
  const existingSubmissionQuery = useMemoFirebase(
    () =>
      user && campaignId
        ? query(
            collection(firestore, 'submissions'),
            where('campaignId', '==', campaignId),
            where('creatorId', '==', user.uid)
          )
        : null,
    [user, campaignId, firestore]
  );
  const { data: existingSubmissions } = useCollection<Submission>(existingSubmissionQuery);
  const existingSubmission = existingSubmissions?.[0] ?? null;

  const isOwner = Boolean(user && campaign?.businessId && user.uid === campaign.businessId);

  const handleWishlistToggle = () => {
    if (!user || !wishlistItemRef) {
      toast({
        variant: 'destructive',
        title: 'Please log in',
        description: 'You must be logged in as a creator to wishlist campaigns.',
      });
      return;
    }

    if (isWishlisted) {
      deleteDocumentNonBlocking(wishlistItemRef);
      toast({ title: 'Removed from wishlist' });
    } else {
      setDocumentNonBlocking(
        wishlistItemRef,
        {
          campaignId: campaignId,
          addedAt: serverTimestamp(),
        },
        { merge: false }
      );
      toast({ title: 'Added to wishlist!' });
    }
  };

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCoupon(true);
    toast({ title: 'Coupon copied!', description: `"${code}" copied to clipboard.` });
    setTimeout(() => setCopiedCoupon(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <PublicHeader />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 overflow-x-hidden overflow-y-auto">
            <div className="container max-w-6xl mx-auto space-y-6 px-4 py-6 md:py-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                  <div className="space-y-2">
                    <Skeleton className="h-7 w-48 sm:w-64" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <Skeleton className="h-10 w-32 self-end sm:self-center" />
              </div>
              <div className="grid grid-cols-2 gap-3 lg:hidden">
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-20 rounded-xl" />
              </div>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                  <Skeleton className="h-48 rounded-xl" />
                  <Skeleton className="h-64 rounded-xl" />
                </div>
                <div className="space-y-6">
                  <Skeleton className="h-56 rounded-xl" />
                </div>
              </div>
            </div>
          </main>
        </div>
        <PublicFooter />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <PublicHeader />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 flex items-center justify-center p-4">
            <div className="text-center py-12 max-w-md mx-auto">
              <h2 className="text-2xl font-bold">Campaign not found</h2>
              <p className="text-muted-foreground mt-2 text-sm">
                This campaign may have ended or does not exist.
              </p>
              <Button asChild className="mt-6">
                <Link href="/campaigns">Browse All Campaigns</Link>
              </Button>
            </div>
          </main>
        </div>
        <PublicFooter />
      </div>
    );
  }

  const dosList = campaign.dos?.split('\n').filter((item) => item.trim() !== '');
  const dontsList = campaign.donts?.split('\n').filter((item) => item.trim() !== '');
  const topCreators: CreatorPerformance[] = []; // Placeholder for real data

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <PublicHeader />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="container max-w-6xl mx-auto space-y-6 px-4 py-6 md:py-8 pb-28 sm:pb-8">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <Button variant="outline" size="icon" asChild className="shrink-0 mt-0.5 sm:mt-0 h-9 w-9 sm:h-10 sm:w-10">
                  <Link href="/campaigns">
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </Button>

                {/* Brand Logo / Avatar */}
                <Avatar className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl shrink-0 border border-border/50 bg-muted">
                  <AvatarImage
                    src={campaign.brandLogo}
                    alt={campaign.brandName || campaign.name}
                    className="object-cover"
                  />
                  <AvatarFallback className="rounded-xl font-bold text-sm bg-primary/10 text-primary">
                    {(campaign.brandName || campaign.name || 'B').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight font-headline break-words leading-tight">
                    {campaign.name}
                  </h1>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-muted-foreground mt-1">
                    <span className="font-medium text-foreground/90">{campaign.brandName || 'Brand'}</span>
                    <span>•</span>
                    <span className="capitalize">{campaign.type}</span>
                    {campaign.category && (
                      <>
                        <span>•</span>
                        <span>{campaign.category}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Desktop / Tablet Header Actions */}
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <Badge
                  variant={campaign.status === 'Active' ? 'default' : 'secondary'}
                  className="bg-green-500/10 text-green-400 border-green-500/20"
                >
                  {campaign.status}
                </Badge>
                {user && !isOwner && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleWishlistToggle}
                    title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                  >
                    <Heart className={cn('h-5 w-5', isWishlisted && 'fill-red-500 text-red-500')} />
                  </Button>
                )}
                {isOwner ? (
                  <Button asChild variant="outline" className="gap-2">
                    <Link href={`/business/campaigns/${campaign.id}/edit`}>
                      <Pencil className="h-4 w-4" />
                      Edit Campaign
                    </Link>
                  </Button>
                ) : existingSubmission ? (
                  <div className="flex items-center gap-2">
                    {existingSubmission.status === 'approved' ? (
                      <SubmitContentModal submissionId={existingSubmission.id}>
                        <Button
                          variant={existingSubmission.postUrl ? 'secondary' : 'default'}
                          className={cn(
                            'gap-2',
                            !existingSubmission.postUrl && 'bg-green-600 hover:bg-green-700 text-white'
                          )}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {existingSubmission.postUrl ? 'Resubmit Content' : 'Submit Content'}
                        </Button>
                      </SubmitContentModal>
                    ) : (
                      <Button
                        variant="outline"
                        className="gap-2 border-green-500/40 text-green-500 hover:bg-green-500/10 hover:text-green-500"
                        asChild
                      >
                        <Link href={`/creator/campaigns/${campaignId}`}>
                          <CheckCircle2 className="h-4 w-4" />
                          Already Joined
                        </Link>
                      </Button>
                    )}
                    <Badge
                      variant="secondary"
                      className={cn(
                        'capitalize',
                        existingSubmission.status === 'approved' &&
                          'bg-green-500/10 text-green-500 border-green-500/20',
                        existingSubmission.status === 'pending' &&
                          'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
                        existingSubmission.status === 'rejected' &&
                          'bg-red-500/10 text-red-500 border-red-500/20'
                      )}
                    >
                      {existingSubmission.status}
                    </Badge>
                  </div>
                ) : (
                  <JoinCampaignModal
                    campaignId={campaign.id}
                    campaignName={campaign.name}
                    visibility={campaign.visibility}
                    businessId={campaign.businessId}
                  >
                    <Button>Join Campaign</Button>
                  </JoinCampaignModal>
                )}
              </div>

              {/* Mobile Header Quick Badges & Save Action */}
              <div className="flex sm:hidden items-center justify-between gap-2 pt-1 border-t border-border/40">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={campaign.status === 'Active' ? 'default' : 'secondary'}
                    className="bg-green-500/10 text-green-400 border-green-500/20 text-xs"
                  >
                    {campaign.status}
                  </Badge>
                  {campaign.visibility && (
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {campaign.visibility}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {user && !isOwner && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 gap-1.5 text-xs"
                      onClick={handleWishlistToggle}
                    >
                      <Heart className={cn('h-4 w-4', isWishlisted && 'fill-red-500 text-red-500')} />
                      {isWishlisted ? 'Saved' : 'Save'}
                    </Button>
                  )}
                  {isOwner && (
                    <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                      <Link href={`/business/campaigns/${campaign.id}/edit`}>
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Quick Stats Strip (visible on < lg screens) */}
            <div className="grid grid-cols-2 gap-3 lg:hidden">
              {/* Rate / Payout */}
              <Card className="p-3.5 bg-card/70 border-border/60 shadow-sm">
                <p className="text-xs text-muted-foreground font-medium">
                  {campaign.visibility === 'public' ? 'CPM Rate' : 'Fixed Pay'}
                </p>
                <p className="text-base sm:text-lg font-bold text-primary mt-0.5 truncate">
                  {campaign.visibility === 'public' && campaign.cpmRate
                    ? `₹${campaign.cpmRate.toLocaleString('en-IN')}`
                    : campaign.visibility === 'private' && campaign.fixedPayPerCreator
                    ? `₹${campaign.fixedPayPerCreator.toLocaleString('en-IN')}`
                    : campaign.type}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  {campaign.visibility === 'public' ? 'per 1,000 views' : 'flat fee / creator'}
                </p>
              </Card>

              {/* Max Payout */}
              <Card className="p-3.5 bg-card/70 border-border/60 shadow-sm">
                <p className="text-xs text-muted-foreground font-medium">Max Pay / Creator</p>
                <p className="text-base sm:text-lg font-bold text-foreground mt-0.5 truncate">
                  {campaign.maxPayPerCreator
                    ? `₹${campaign.maxPayPerCreator.toLocaleString('en-IN')}`
                    : 'No Cap'}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  {campaign.budget ? `Total: ₹${campaign.budget.toLocaleString('en-IN')}` : 'Allocated budget'}
                </p>
              </Card>

              {/* Platforms */}
              <Card className="p-3.5 bg-card/70 border-border/60 shadow-sm col-span-2 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground font-medium">Platforms Required</p>
                  <p className="text-xs font-medium text-foreground mt-0.5 truncate">
                    {campaign.platforms?.join(', ') || 'Any platform'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {campaign.platforms?.map((p) => (
                    <div
                      key={p}
                      className="p-1.5 rounded-md bg-muted/60 text-foreground border border-border/40"
                      title={p}
                    >
                      {platformIcons[p] || <Tags className="h-4 w-4" />}
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left column */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg sm:text-xl">About the Campaign</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Brief */}
                    <div>
                      <h3 className="font-semibold text-sm sm:text-base mb-2">Brief</h3>
                      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                        {renderWithLinks(campaign.description ?? '')}
                      </p>
                    </div>

                    {/* Requirements */}
                    <div className="border-t pt-6">
                      <h3 className="font-semibold text-sm sm:text-base mb-2">Requirements</h3>
                      <p className="text-sm sm:text-base text-muted-foreground whitespace-pre-wrap leading-relaxed break-words">
                        {campaign.requirements}
                      </p>
                    </div>

                    {/* Do's & Don'ts */}
                    {(dosList && dosList.length > 0) || (dontsList && dontsList.length > 0) ? (
                      <div className="border-t pt-6 grid sm:grid-cols-2 gap-6">
                        {dosList && dosList.length > 0 && (
                          <div>
                            <h3 className="font-semibold mb-3 text-green-600 dark:text-green-400 flex items-center gap-2 text-sm sm:text-base">
                              <Check className="h-4 w-4 shrink-0" /> Do's
                            </h3>
                            <ul className="space-y-2.5">
                              {dosList.map((item, index) => (
                                <li key={index} className="text-xs sm:text-sm text-muted-foreground flex items-start gap-2">
                                  <span className="text-green-500 font-bold shrink-0 mt-0.5">•</span>
                                  <span className="break-words flex-1 leading-relaxed">{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {dontsList && dontsList.length > 0 && (
                          <div>
                            <h3 className="font-semibold mb-3 text-red-600 dark:text-red-400 flex items-center gap-2 text-sm sm:text-base">
                              <X className="h-4 w-4 shrink-0" /> Don'ts
                            </h3>
                            <ul className="space-y-2.5">
                              {dontsList.map((item, index) => (
                                <li key={index} className="text-xs sm:text-sm text-muted-foreground flex items-start gap-2">
                                  <span className="text-red-500 font-bold shrink-0 mt-0.5">•</span>
                                  <span className="break-words flex-1 leading-relaxed">{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : null}

                    {/* Reference & Demo Content */}
                    {((campaign.demoContent && campaign.demoContent.length > 0) || campaign.demoContentLink) && (
                      <div className="border-t pt-6">
                        <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm sm:text-base">
                          <ExternalLink className="h-4 w-4 text-primary shrink-0" /> Reference & Demo Content
                        </h3>
                        <p className="text-xs text-muted-foreground mb-4">
                          Reference posts, videos, or documents provided by the brand.
                        </p>
                        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                          {campaign.demoContent &&
                            campaign.demoContent.map((item, index) => (
                              <a
                                key={index}
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors group min-w-0"
                              >
                                <div className="min-w-0 flex-1 pr-2">
                                  <p className="text-xs sm:text-sm font-medium truncate group-hover:text-primary transition-colors">
                                    {item.description}
                                  </p>
                                  <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{item.link}</p>
                                </div>
                                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                              </a>
                            ))}
                          {!campaign.demoContent?.length && campaign.demoContentLink && (
                            <a
                              href={campaign.demoContentLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors group min-w-0"
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <p className="text-xs sm:text-sm font-medium truncate group-hover:text-primary transition-colors">
                                  Demo Link
                                </p>
                                <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{campaign.demoContentLink}</p>
                              </div>
                              <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Top Performing Creators */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg sm:text-xl">Top Performing Creators</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Get inspired by what top creators have made for this campaign.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {topCreators.length > 0 ? (
                      <>
                        {/* Mobile Creator List (< sm) */}
                        <div className="block sm:hidden space-y-3">
                          {topCreators.map((creator) => (
                            <div
                              key={creator.id}
                              className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 gap-3"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <Avatar className="h-9 w-9 shrink-0">
                                  <AvatarImage src={creator.avatarUrl} alt={creator.name} />
                                  <AvatarFallback>{creator.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-sm truncate">{creator.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {creator.views.toLocaleString('en-IN')} views
                                  </p>
                                </div>
                              </div>
                              <CreatorPost creatorName={creator.name} postUrl={creator.postUrl}>
                                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs shrink-0">
                                  View <ChevronRight className="ml-1 h-3.5 w-3.5" />
                                </Button>
                              </CreatorPost>
                            </div>
                          ))}
                        </div>

                        {/* Desktop Table (>= sm) */}
                        <div className="hidden sm:block overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Creator</TableHead>
                                <TableHead className="text-right">Views</TableHead>
                                <TableHead className="text-right">Engagement</TableHead>
                                <TableHead className="text-right">Post</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {topCreators.map((creator) => (
                                <TableRow key={creator.id}>
                                  <TableCell>
                                    <div className="flex items-center gap-3">
                                      <Avatar className="h-8 w-8">
                                        <AvatarImage src={creator.avatarUrl} alt={creator.name} />
                                        <AvatarFallback>{creator.name.charAt(0)}</AvatarFallback>
                                      </Avatar>
                                      <span className="font-medium">{creator.name}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {creator.views.toLocaleString('en-IN')}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {creator.engagement.toFixed(1)}%
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <CreatorPost creatorName={creator.name} postUrl={creator.postUrl}>
                                      <Button variant="ghost" size="sm">
                                        View Post <ChevronRight className="ml-1 h-4 w-4" />
                                      </Button>
                                    </CreatorPost>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 sm:py-10 text-muted-foreground">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-35" />
                        <p className="text-sm font-medium">No creators have joined this campaign yet.</p>
                        <p className="text-xs text-muted-foreground/75 mt-1">Be among the first to participate and earn.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right column */}
              <div className="lg:col-span-1 space-y-6">
                {/* Desktop Sticky Stats Card */}
                <Card className="hidden lg:block sticky top-20">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Campaign Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    {campaign.visibility === 'public' && campaign.cpmRate && (
                      <div className="flex items-center justify-between">
                        <p className="text-muted-foreground">CPM Rate</p>
                        <p className="font-bold text-lg text-primary">
                          ₹{campaign.cpmRate.toLocaleString('en-IN')} / 1K views
                        </p>
                      </div>
                    )}
                    {campaign.visibility === 'private' && campaign.fixedPayPerCreator && (
                      <div className="flex items-center justify-between">
                        <p className="text-muted-foreground">Fixed Pay</p>
                        <p className="font-bold text-lg text-primary">
                          ₹{campaign.fixedPayPerCreator.toLocaleString('en-IN')}
                        </p>
                      </div>
                    )}
                    {campaign.maxPayPerCreator && (
                      <div className="flex items-center justify-between">
                        <p className="text-muted-foreground">Max Pay / Creator</p>
                        <p className="font-bold">₹{campaign.maxPayPerCreator.toLocaleString('en-IN')}</p>
                      </div>
                    )}
                    {campaign.budget && (
                      <div className="flex items-center justify-between">
                        <p className="text-muted-foreground">Total Budget</p>
                        <p className="font-bold">₹{campaign.budget.toLocaleString('en-IN')}</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="text-muted-foreground">Platforms</p>
                      <div className="flex items-center gap-2 font-bold">
                        {campaign.platforms?.map((p) => (
                          <div key={p} title={p}>
                            {platformIcons[p] || <Tags className="h-5 w-5" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Barter Items Card */}
                {campaign.type === 'Barter Collab' &&
                  campaign.tryItemDetails &&
                  campaign.tryItemDetails.length > 0 && (
                    <Card>
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                          <Tags className="h-5 w-5 text-primary" /> Barter Items
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                          Free products provided to creators for content creation.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {existingSubmission?.status === 'approved' && campaign.couponCode && (
                          <div className="bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20 p-3.5 sm:p-4 rounded-lg">
                            <p className="text-xs sm:text-sm font-medium mb-2">Use this coupon code on checkout:</p>
                            <div className="flex items-center gap-2">
                              <code className="text-base sm:text-xl font-bold bg-background px-3 py-1.5 rounded inline-block border tracking-wider select-all">
                                {campaign.couponCode}
                              </code>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 shrink-0"
                                onClick={() => handleCopyCoupon(campaign.couponCode!)}
                                title="Copy coupon"
                              >
                                {copiedCoupon ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                        {campaign.tryItemDetails.map((item, index) => (
                          <div
                            key={index}
                            className="flex gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg bg-muted/20 items-center"
                          >
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="h-16 w-16 sm:h-20 sm:w-20 object-cover rounded-md border shrink-0 bg-background"
                              />
                            ) : (
                              <div className="h-16 w-16 sm:h-20 sm:w-20 bg-muted rounded-md border shrink-0 flex items-center justify-center">
                                <span className="text-muted-foreground text-[10px] sm:text-xs font-medium text-center px-1">
                                  No Image
                                </span>
                              </div>
                            )}
                            <div className="flex flex-col justify-center space-y-1 min-w-0 flex-1">
                              <p className="font-medium text-xs sm:text-base break-words line-clamp-2">{item.name}</p>
                              {item.productLink && (
                                <Button
                                  variant="link"
                                  size="sm"
                                  asChild
                                  className="p-0 h-auto justify-start text-xs sm:text-sm"
                                >
                                  <a
                                    href={item.productLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="truncate inline-flex items-center gap-1 text-primary"
                                  >
                                    <span>View Product</span>
                                    <ExternalLink className="h-3 w-3 shrink-0" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                {/* NGO Donation Details Card */}
                {campaign.type === 'NGO Support' && campaign.ngoPaymentDetails && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <Heart className="h-5 w-5 text-red-500" /> NGO Donation Details
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Verified payment information for this NGO campaign.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs sm:text-sm">
                      {campaign.ngoPaymentDetails.upiId && (
                        <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                          <span className="text-muted-foreground">UPI ID</span>
                          <code className="font-semibold select-all">{campaign.ngoPaymentDetails.upiId}</code>
                        </div>
                      )}
                      {campaign.ngoPaymentDetails.bankAccountName && (
                        <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                          <span className="text-muted-foreground">Account Name</span>
                          <span className="font-semibold">{campaign.ngoPaymentDetails.bankAccountName}</span>
                        </div>
                      )}
                      {campaign.ngoPaymentDetails.bankAccountNumber && (
                        <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                          <span className="text-muted-foreground">Account Number</span>
                          <code className="font-semibold select-all">
                            {campaign.ngoPaymentDetails.bankAccountNumber}
                          </code>
                        </div>
                      )}
                      {campaign.ngoPaymentDetails.ifsc && (
                        <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                          <span className="text-muted-foreground">IFSC</span>
                          <code className="font-semibold select-all">{campaign.ngoPaymentDetails.ifsc}</code>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
      <PublicFooter />

      {/* Mobile Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/60 p-3 sm:hidden shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-muted-foreground truncate leading-none">
              {campaign.visibility === 'public' ? 'Payout Rate' : 'Fixed Pay'}
            </p>
            <p className="text-base font-bold text-primary truncate leading-tight mt-0.5">
              {campaign.visibility === 'public' && campaign.cpmRate
                ? `₹${campaign.cpmRate.toLocaleString('en-IN')} / 1K views`
                : campaign.fixedPayPerCreator
                ? `₹${campaign.fixedPayPerCreator.toLocaleString('en-IN')}`
                : campaign.type}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {user && !isOwner && (
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={handleWishlistToggle}
                aria-label="Wishlist campaign"
              >
                <Heart className={cn('h-5 w-5', isWishlisted && 'fill-red-500 text-red-500')} />
              </Button>
            )}

            {isOwner ? (
              <Button asChild className="gap-2 h-10 px-4">
                <Link href={`/business/campaigns/${campaign.id}/edit`}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Link>
              </Button>
            ) : existingSubmission ? (
              existingSubmission.status === 'approved' ? (
                <SubmitContentModal submissionId={existingSubmission.id}>
                  <Button
                    className={cn(
                      'gap-1.5 h-10 px-4',
                      !existingSubmission.postUrl && 'bg-green-600 hover:bg-green-700 text-white'
                    )}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {existingSubmission.postUrl ? 'Resubmit' : 'Submit Reel'}
                  </Button>
                </SubmitContentModal>
              ) : (
                <Button
                  variant="outline"
                  className="gap-1.5 h-10 px-4 border-green-500/40 text-green-500 hover:bg-green-500/10 hover:text-green-500"
                  asChild
                >
                  <Link href={`/creator/campaigns/${campaignId}`}>
                    <CheckCircle2 className="h-4 w-4" />
                    Joined
                  </Link>
                </Button>
              )
            ) : (
              <JoinCampaignModal
                campaignId={campaign.id}
                campaignName={campaign.name}
                visibility={campaign.visibility}
                businessId={campaign.businessId}
              >
                <Button className="h-10 px-5 font-semibold shadow-md">
                  Join Campaign
                </Button>
              </JoinCampaignModal>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

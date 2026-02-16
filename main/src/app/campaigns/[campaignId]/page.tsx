
'use client';

import {
  ArrowLeft,
  Calendar,
  Instagram,
  Youtube,
  ChevronRight,
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
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { doc, serverTimestamp } from 'firebase/firestore';

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
import { useDoc, useFirestore, useMemoFirebase, useUser, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import type { Campaign, CreatorPerformance, WishlistItem } from '@/lib/types';
import { JoinCampaignModal } from './_components/join-campaign-modal';
import { CreatorPost } from '@/components/shared/creator-post';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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
  const { user } = useUser();
  const { toast } = useToast();

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
      setDocumentNonBlocking(wishlistItemRef, {
        campaignId: campaignId,
        addedAt: serverTimestamp(),
      }, { merge: false });
      toast({ title: 'Added to wishlist!' });
    }
  };

  if (isLoading) {
    return (
      <div className="container flex-1 space-y-6 p-4 pt-6 md:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-9 w-48 md:w-64" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-96" />
          </div>
          <div className="lg:col-span-1">
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="container text-center py-10 px-4 md:px-6">
        <p>Campaign not found.</p>
        <Button asChild variant="link">
          <Link href="/campaigns">Go back to campaigns</Link>
        </Button>
      </div>
    );
  }

  const dosList = campaign.dos?.split('\n').filter(item => item.trim() !== '');
  const dontsList = campaign.donts?.split('\n').filter(item => item.trim() !== '');
  const topCreators: CreatorPerformance[] = []; // Placeholder for real data

  return (
    <div className="container flex-1 space-y-6 py-6 md:py-10 px-4 md:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/campaigns">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight font-headline">
              {campaign.name}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-center">
          <Badge
            variant={campaign.status === 'Active' ? 'default' : 'secondary'}
            className="bg-green-500/10 text-green-400 border-green-500/20"
          >
            {campaign.status}
          </Badge>
          {user && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleWishlistToggle}
            >
              <Heart className={cn("h-5 w-5", isWishlisted && "fill-red-500 text-red-500")} />
            </Button>
          )}
          <JoinCampaignModal
            campaignId={campaign.id}
            campaignName={campaign.name}
            visibility={campaign.visibility}
            businessId={campaign.businessId}
          >
            <Button>Join Campaign</Button>
          </JoinCampaignModal>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>About the Campaign</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Brief</h3>
                <p className="text-muted-foreground leading-relaxed">{campaign.description}</p>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-2">Requirements</h3>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{campaign.requirements}</p>
              </div>

              {(dosList && dosList.length > 0) || (dontsList && dontsList.length > 0) ? (
                <div className="border-t pt-6 grid sm:grid-cols-2 gap-6">
                  {dosList && dosList.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3 text-green-600 flex items-center gap-2">
                        <Check className="h-4 w-4" /> Do's
                      </h3>
                      <ul className="space-y-2">
                        {dosList.map((item, index) => (
                          <li key={index} className="text-sm text-muted-foreground flex gap-2">
                            <span className="text-green-500">•</span> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {dontsList && dontsList.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3 text-red-600 flex items-center gap-2">
                        <X className="h-4 w-4" /> Don'ts
                      </h3>
                      <ul className="space-y-2">
                        {dontsList.map((item, index) => (
                          <li key={index} className="text-sm text-muted-foreground flex gap-2">
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
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Creators</CardTitle>
              <CardDescription>
                Get inspired by what top creators have made for this campaign.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topCreators.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Creator</TableHead>
                        <TableHead className="text-right">Views</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">Engagement</TableHead>
                        <TableHead className="text-right">Post</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topCreators.map((creator) => (
                        <TableRow key={creator.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage
                                  src={creator.avatarUrl}
                                  alt={creator.name}
                                />
                                <AvatarFallback>
                                  {creator.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{creator.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {creator.views.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right hidden sm:table-cell">
                            {creator.engagement.toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right">
                            <CreatorPost
                              creatorName={creator.name}
                              postUrl={creator.postUrl}
                            >
                              <Button variant="ghost" size="sm">
                                View <span className="hidden sm:inline-block ml-1">Post</span> <ChevronRight className="ml-1 h-4 w-4" />
                              </Button>
                            </CreatorPost>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  No creators have joined this campaign yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Stats</CardTitle>
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
                  <p className="text-muted-foreground">Max Pay/Creator</p>
                  <p className="font-bold">₹{campaign.maxPayPerCreator.toLocaleString('en-IN')}</p>
                </div>
              )}
              {campaign.budget && (
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground">Total Budget</p>
                  <p className="font-bold">
                    ₹{campaign.budget.toLocaleString('en-IN')}
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">Platforms</p>
                <div className="flex items-center gap-2 font-bold">
                  {campaign.platforms?.map((p) => <div key={p}>{platformIcons[p]}</div>)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

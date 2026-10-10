
'use client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Gem, Instagram, Mic2, Youtube, Linkedin, Facebook, Ghost, Heart } from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Campaign, WishlistItem } from '@/lib/types';

const platformIcons: { [key: string]: React.ReactNode } = {
  Instagram: <Instagram className="h-5 w-5" />,
  YouTube: <Youtube className="h-5 w-5" />,
  Moj: <Gem className="h-5 w-5" />,
  ShareChat: <Mic2 className="h-5 w-5" />,
  LinkedIn: <Linkedin className="h-5 w-5" />,
  Facebook: <Facebook className="h-5 w-5" />,
  Snapchat: <Ghost className="h-5 w-5" />,
};

export interface CampaignCardProps extends Campaign {
  campaignUrl?: string; // Optional URL for the campaign
  // Mocked for now
  views: string;
  progress: number;
  paid: number;
}

export function CampaignCard({
  id,
  brandLogo,
  name,
  brandName,
  businessId,
  cpmRate,
  fixedPayPerCreator,
  visibility,
  budget,
  type,
  platforms = [],
  campaignUrl,
  views,
  progress,
  paid
}: CampaignCardProps) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const wishlistItemRef = useMemoFirebase(
    () => (user ? doc(firestore, `users/${user.uid}/wishlist`, id) : null),
    [user, firestore, id]
  );
  const { data: wishlistItem } = useDoc<WishlistItem>(wishlistItemRef);

  const isWishlisted = !!wishlistItem;

  const getJoinUrl = () => {
    if (campaignUrl) return campaignUrl; // Use specific URL if provided
    if (isUserLoading) return '#';
    if (user) return `/campaigns/${id}`;
    return '/login?role=creator';
  };

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
        campaignId: id,
        addedAt: serverTimestamp(),
      }, { merge: false });
      toast({ title: 'Added to wishlist!' });
    }
  };


  return (
    <Card className="flex flex-col shadow-sm hover:shadow-md transition-all duration-300 bg-card border-border/50">
      <CardHeader className="relative pb-4 flex flex-row items-center gap-4">
        <Link href={`/business/profile?userId=${businessId}`} className="shrink-0">
          <Avatar className="h-12 w-12 border border-border">
            <AvatarImage src={brandLogo} alt={`${brandName} logo`} />
            <AvatarFallback>{brandName.charAt(0)}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <CardTitle className="text-base font-bold leading-tight truncate">{name}</CardTitle>
          <CardDescription className="text-sm truncate">{brandName}</CardDescription>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
            {visibility === 'public' && cpmRate ? `₹${cpmRate} CPM` : `₹${fixedPayPerCreator ?? 0}`}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-grow space-y-4 px-6 pb-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="flex -space-x-2">
              {platforms.map(p => (
                <div key={p} className="bg-background rounded-full p-1 border border-border">
                  {platformIcons[p] || <div className="h-4 w-4" />}
                </div>
              ))}
            </div>
            <span className="text-xs">{type}</span>
          </div>
          {visibility === 'public' && (
            <div className="text-xs text-muted-foreground font-medium">
              {views} views
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleWishlistToggle}
          disabled={isUserLoading || !user}
          className="hover:bg-primary/10 hover:text-primary shrink-0"
        >
          <Heart className={cn("h-5 w-5", isWishlisted && "fill-red-500 text-red-500")} />
        </Button>
        <Button asChild className="w-full" disabled={isUserLoading}>
          <Link href={getJoinUrl()}>
            {isUserLoading ? 'Loading...' : 'View Details'}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

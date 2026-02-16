
'use client';

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
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { ArrowRight, Eye, Instagram, TrendingUp, Youtube, Gem, Mic2, Linkedin, Facebook, Ghost, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export type Campaign = {
  id: string;
  name: string;
  cpmRate?: number;
  budget?: number;
  maxPayPerCreator?: number;
  status: 'Active' | 'Completed' | 'Pending';
  platforms: string[];
  // These will be calculated
  views: number;
  progress: number;
  acquiredCpm?: number;
};

interface CampaignPostProps {
  campaign: Campaign;
}

const platformIcons: { [key: string]: React.ReactNode } = {
  Instagram: <Instagram className="h-4 w-4" />,
  YouTube: <Youtube className="h-4 w-4" />,
  Moj: <Gem className="h-4 w-4" />,
  ShareChat: <Mic2 className="h-4 w-4" />,
  LinkedIn: <Linkedin className="h-4 w-4" />,
  Facebook: <Facebook className="h-4 w-4" />,
  Snapchat: <Ghost className="h-4 w-4" />,
};

export function CampaignPost({ campaign }: CampaignPostProps) {
  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(0)}K`;
    return views.toString();
  }

  const primaryPlatform = campaign.platforms?.[0] || 'Campaign';
  const budget = campaign.budget ?? 0;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
            <div>
                 <CardTitle className="text-lg font-headline">{campaign.name}</CardTitle>
                 <CardDescription className="flex items-center gap-2 pt-1">
                    {platformIcons[primaryPlatform] || <TrendingUp className="h-4 w-4" />}
                    {primaryPlatform} Campaign
                </CardDescription>
            </div>
            <Badge
                variant={campaign.status === 'Active' ? 'default' : 'secondary'}
                className={cn(
                campaign.status === 'Active' &&
                    'bg-green-500/10 text-green-400 border-green-500/20',
                campaign.status === 'Completed' &&
                    'bg-gray-500/10 text-gray-400 border-gray-500/20'
                )}
            >
                {campaign.status}
            </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Payout Progress</span>
                <span className="font-semibold">{campaign.progress.toFixed(0)}%</span>
            </div>
            <Progress value={campaign.progress} />
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Total Views</span>
                <span className="flex items-center gap-1.5 font-semibold">
                    <Eye className="h-4 w-4" /> {formatViews(campaign.views)}
                </span>
            </div>
            <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Budget</span>
                <span className="flex items-center gap-1.5 font-semibold">
                     ₹{budget.toLocaleString('en-IN')}
                </span>
            </div>
            {campaign.cpmRate && (
              <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Target CPM</span>
                  <span className="font-semibold">₹{campaign.cpmRate.toLocaleString('en-IN')}</span>
              </div>
            )}
            {campaign.maxPayPerCreator && (
              <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Max Pay/Creator</span>
                  <span className="flex items-center gap-1.5 font-semibold">
                      <ShieldCheck className="h-4 w-4" /> ₹{campaign.maxPayPerCreator.toLocaleString('en-IN')}
                  </span>
              </div>
            )}
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" className="w-full">
          <Link href={`/business/campaigns/${campaign.id}`}>
            View Details <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

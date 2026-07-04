'use client';

import { useState } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  BadgeCheck,
  MapPin,
  Globe,
  Twitter,
  Instagram,
  Youtube,
  Linkedin,
  Mail,
  Briefcase,
  Share2,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { InstagramAnalyticsCard } from '@/app/creator/profile/_components/instagram-analytics-card';
import { FeaturedPostsSection } from '@/app/creator/profile/_components/featured-posts-section';
import type { InstagramAnalytics } from '@/lib/instagram-types';
import type { FeaturedPost } from '@/lib/types';

// ── Types for serialised data passed from server ────────────────────────────

export interface PublicCampaign {
  id: string;
  name: string;
  brandName: string;
  brandLogo?: string;
  status: string;
  category?: string;
  contentType?: string;
  platforms?: string[];
  startDate?: string;
  endDate?: string;
}

export interface PublicProfileData {
  creatorId: string;
  username?: string;
  // User doc
  name: string;
  email: string;
  logoUrl?: string;
  // Creator profile
  bannerUrl?: string;
  bio?: string;
  categories?: string[];
  creatorType?: string;
  // Structured location (new)
  city?: string;
  state?: string;
  country?: string;
  // Legacy single-string location
  location?: string;
  age?: number;
  platformLinks?: string[];
  instagramAnalyticsMulti?: Record<string, InstagramAnalytics>;
  // Portfolio
  campaigns?: PublicCampaign[];
  totalViews?: number;
  totalEngagements?: number;
  featuredPosts?: FeaturedPost[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatNumber(num: number): string {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function getSocialIcon(link: string) {
  if (link.includes('instagram.com')) return { Icon: Instagram, name: 'Instagram' };
  if (link.includes('youtube.com')) return { Icon: Youtube, name: 'YouTube' };
  if (link.includes('twitter.com') || link.includes('x.com')) return { Icon: Twitter, name: 'Twitter' };
  if (link.includes('linkedin.com')) return { Icon: Linkedin, name: 'LinkedIn' };
  return { Icon: Globe, name: 'Website' };
}

// ── Static Campaign Portfolio (no Firebase hooks) ───────────────────────────

function StaticCampaignPortfolio({ campaigns, totalViews = 0, totalEngagements = 0 }: {
  campaigns: PublicCampaign[];
  totalViews?: number;
  totalEngagements?: number;
}) {
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
            const startDate = campaign.startDate ? new Date(campaign.startDate) : null;
            const endDate = campaign.endDate ? new Date(campaign.endDate) : null;

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

// ── Main Public Profile View ────────────────────────────────────────────────

export function PublicProfileView({ data }: { data: PublicProfileData }) {
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const isLoggedIn = !isUserLoading && !!user;
  const isOwnProfile = isLoggedIn && user.uid === data.creatorId;
  const [activeAccountTab, setActiveAccountTab] = useState<string>('');

  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [messageSubject, setMessageSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSendMessage = async () => {
    if (!user || !firestore) return;
    setIsSending(true);
    try {
      const requestsRef = collection(firestore, `users/${data.creatorId}/collaborationRequests`);
      await addDoc(requestsRef, {
        fromUserId: user.uid,
        fromUserName: user.displayName || 'Unknown User',
        toUserId: data.creatorId,
        subject: messageSubject,
        body: messageBody,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      
      const notificationsRef = collection(firestore, `users/${data.creatorId}/notifications`);
      await addDoc(notificationsRef, {
        userId: data.creatorId,
        type: 'new_message',
        title: 'New Collaboration Request',
        message: `${user.displayName || 'A brand'} sent you a message: ${messageSubject}`,
        isRead: false,
        createdAt: serverTimestamp(),
      });

      toast({
        title: 'Message sent!',
        description: `Your message has been sent to ${data.name}.`,
      });
      setIsMessageOpen(false);
      setMessageSubject('');
      setMessageBody('');
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send message.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const socialLinks = data.platformLinks?.map((link: string) => {
    const { Icon, name } = getSocialIcon(link);
    return { Icon, href: link, name };
  }) || [];

  const instagramUrls = data.platformLinks?.filter((link: string) => link.includes('instagram.com')) || [];
  const instagramAnalyticsMulti = data.instagramAnalyticsMulti || {};
  const accountUsernames = Object.keys(instagramAnalyticsMulti);

  const handleShare = async () => {
    const shareUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${data.name} | Advize Creator Profile`,
          text: `Check out ${data.name}'s creator profile on Advize!`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: 'Link Copied',
          description: 'Profile link copied to clipboard.',
        });
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error sharing:', err);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to share the profile.',
        });
      }
    }
  };

  return (
    <div className="w-full mx-auto space-y-6">
      {/* Header Section */}
      <Card className="overflow-hidden shadow-lg border-white/10 bg-card">
        <div className="relative h-36 md:h-48 w-full bg-accent/10">
          <Image
            src={data.bannerUrl || "https://picsum.photos/seed/creator-banner/1200/400"}
            alt="Creator Banner"
            fill
            priority
            sizes="100vw"
            style={{ objectFit: 'cover' }}
          />
        </div>
        <div className="p-4 md:p-6">
          <div className="relative flex flex-col md:flex-row md:items-end md:gap-6 -mt-[4.5rem]">
            <div className="relative h-28 w-28 md:h-32 md:w-32 rounded-full border-4 border-background overflow-hidden shadow-lg flex-shrink-0">
              <Image
                src={data.logoUrl || "https://picsum.photos/seed/creator-avatar/200/200"}
                alt="Creator Avatar"
                fill
                sizes="(max-width: 768px) 112px, 128px"
                style={{ objectFit: 'cover' }}
              />
            </div>
            <div className="mt-4 md:mt-0 flex-1 min-w-0">
              <div className="md:flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl md:text-3xl font-bold font-headline truncate">
                      {data.name}
                    </h1>
                    <BadgeCheck className="h-6 w-6 text-primary flex-shrink-0" />
                  </div>
                  {data.bio && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {data.bio}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0 mt-4 md:mt-0">
                  <Button size="sm" variant="outline" onClick={handleShare} className="gap-2">
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                  {isLoggedIn ? (
                    isOwnProfile ? (
                      <Button asChild size="sm">
                        <Link href="/feed">Go to Dashboard</Link>
                      </Button>
                    ) : (
                      <Dialog open={isMessageOpen} onOpenChange={setIsMessageOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm">Message Creator</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Message {data.name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="subject">Subject</Label>
                              <Input 
                                id="subject" 
                                placeholder="e.g., Collaboration Inquiry" 
                                value={messageSubject}
                                onChange={(e) => setMessageSubject(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="message">Message</Label>
                              <Textarea 
                                id="message" 
                                placeholder="Hi, I'd like to work with you on a campaign..." 
                                rows={4}
                                value={messageBody}
                                onChange={(e) => setMessageBody(e.target.value)}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsMessageOpen(false)}>Cancel</Button>
                            <Button onClick={handleSendMessage} disabled={isSending || !messageSubject.trim() || !messageBody.trim()}>
                              {isSending ? 'Sending...' : 'Send Message'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )
                  ) : (
                    <Button asChild size="sm">
                      <Link href="/signup">Collaborate on Advize</Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2">
            {/* Creator Type */}
            {data.creatorType && (
              <Badge variant="default" className="bg-primary/10 text-primary border-primary/30">
                {data.creatorType}
              </Badge>
            )}
            {/* Niche badges */}
            {(data.categories || []).map((cat: string) => (
              <Badge key={cat} variant="secondary">{cat}</Badge>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {/* Structured location (new fields) */}
            {(data.city || data.state || data.country) && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {[data.city, data.state, data.country].filter(Boolean).join(', ')}
              </div>
            )}
            {/* Fallback to legacy location string */}
            {!data.city && data.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {data.location}
              </div>
            )}
            {/* Age */}
            {data.age && (
              <div className="flex items-center gap-1.5 font-medium">
                {data.age} yrs
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Campaign Portfolio */}
          <StaticCampaignPortfolio
            campaigns={data.campaigns || []}
            totalViews={data.totalViews}
            totalEngagements={data.totalEngagements}
          />

          {/* Featured Posts */}
          <FeaturedPostsSection
            featuredPosts={data.featuredPosts || []}
            isOwnProfile={false}
            onAdd={async () => {}}
            onRemove={async () => {}}
          />

          {/* Instagram Analytics */}
          {accountUsernames.length > 0 && (
            <div className="space-y-4">
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
                    isOwnProfile={false}
                    creatorId={data.creatorId}
                    username={data.username}
                  />
                );
              })}
            </div>
          )}
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
                <a href={`mailto:${data.email}`} className="hover:underline truncate">{data.email}</a>
              </div>
              {socialLinks.map(({ Icon, href, name }: { Icon: React.ElementType; href: string; name: string }) => (
                <div key={href} className="flex items-center gap-3 text-sm">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <a href={href} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary truncate">{name}</a>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* CTA Card — content differs for logged-in vs. guest visitors */}
          <Card className="shadow-lg border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="p-6 text-center space-y-4">
              {isLoggedIn ? (
                isOwnProfile ? (
                  <>
                    <h3 className="text-lg font-bold">Ready to work together?</h3>
                    <p className="text-sm text-muted-foreground">
                      Browse open campaigns on Advize and start collaborating with top brands.
                    </p>
                    <Button asChild className="w-full shadow-lg shadow-primary/20">
                      <Link href="/feed">Browse Campaigns</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-bold">Want to collaborate?</h3>
                    <p className="text-sm text-muted-foreground">
                      Send a message directly to {data.name} to discuss potential campaigns.
                    </p>
                    <Button className="w-full shadow-lg shadow-primary/20" onClick={() => setIsMessageOpen(true)}>
                      Message {data.name}
                    </Button>
                  </>
                )
              ) : (
                <>
                  <h3 className="text-lg font-bold">Want to collaborate?</h3>
                  <p className="text-sm text-muted-foreground">
                    Join Advize to connect with {data.name} and other top creators for brand campaigns.
                  </p>
                  <Button asChild className="w-full shadow-lg shadow-primary/20">
                    <Link href="/signup">Sign Up on Advize</Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

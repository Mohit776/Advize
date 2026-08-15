'use client';

import { useState } from 'react';
import {
  BadgeCheck,
  MapPin,
  Globe,
  Twitter,
  Instagram,
  Linkedin,
  Mail,
  Building2,
  Briefcase,
  Share2,
  Star,
  TrendingUp,
  BarChart2,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  Users,
} from 'lucide-react';
import { useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { FollowButton } from '@/components/ui/follow-button';

// ── Types ────────────────────────────────────────────────────────────────────

export interface PublicBusinessCampaign {
  id: string;
  name: string;
  status: string;
  category?: string;
  platforms?: string[];
  startDate?: string;
  endDate?: string;
  totalViews?: number;
  totalSpend?: number;
}

export interface PublicBusinessProfileData {
  businessId: string;
  username?: string;
  // User doc
  name: string;
  email: string;
  logoUrl?: string;
  // Business profile doc
  bannerUrl?: string;
  tagline?: string;
  about?: string;
  industryType?: string;
  location?: string;
  companyWebsite?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  // Stats
  campaigns?: PublicBusinessCampaign[];
  campaignsRun?: number;
  activeCampaigns?: number;
  totalViews?: number;
  totalPaid?: number;
  approvalRate?: number;
  averageCpm?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatNumber(num: number): string {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function formatCurrency(num: number): string {
  if (!num) return '₹0';
  if (num >= 1000000) return '₹' + (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return '₹' + (num / 1000).toFixed(1) + 'K';
  return '₹' + num.toLocaleString('en-IN');
}

// ── Campaign Grid ────────────────────────────────────────────────────────────

function CampaignShowcase({ campaigns }: { campaigns: PublicBusinessCampaign[] }) {
  if (!campaigns || campaigns.length === 0) {
    return (
      <Card className="glass-card shadow-lg border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-muted-foreground" />
            Campaigns
          </CardTitle>
          <CardDescription>Brand campaigns and collaborations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl bg-white/5 border border-white/5 mx-auto max-w-md my-4">
            <div className="relative p-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 mb-3">
              <Briefcase className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold">No Campaigns Yet</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs mx-auto">
              This brand's campaigns will appear here once they launch.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary animate-pulse" />
          Campaigns
        </CardTitle>
        <CardDescription>Brand campaigns and collaborations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.slice(0, 6).map((campaign, i) => (
            <div
              key={campaign.id}
              className="group relative rounded-xl glass-card hover:bg-card/80 hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] transition-all duration-300 p-4 space-y-3 animate-fade-in-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm truncate flex-1 mr-2">{campaign.name}</h4>
                <Badge
                  variant="secondary"
                  className={
                    campaign.status === 'Completed'
                      ? 'bg-green-500/10 text-green-500 border-green-500/30 text-[10px]'
                      : campaign.status === 'Active'
                        ? 'bg-blue-500/10 text-blue-500 border-blue-500/30 text-[10px]'
                        : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30 text-[10px]'
                  }
                >
                  {campaign.status}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {campaign.category && (
                  <Badge variant="outline" className="text-[10px]">{campaign.category}</Badge>
                )}
                {campaign.platforms?.slice(0, 2).map((p) => (
                  <Badge key={p} variant="secondary" className="text-[10px] px-1.5 py-0">{p}</Badge>
                ))}
              </div>
              {campaign.totalViews != null && campaign.totalViews > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">{formatNumber(campaign.totalViews)}</span> views
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Business Profile View ───────────────────────────────────────────────

export function PublicBusinessProfileView({ data }: { data: PublicBusinessProfileData }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [copied, setCopied] = useState(false);
  const [followerCount, setFollowerCount] = useState<number | null>(null);

  useEffect(() => {
    if (!data.businessId || !firestore) return;
    const fetchFollowers = async () => {
      try {
        const q = query(collection(firestore, 'follows'), where('followingId', '==', data.businessId));
        const snapshot = await getCountFromServer(q);
        setFollowerCount(snapshot.data().count);
      } catch (err) {
        console.error('Failed to fetch followers count:', err);
      }
    };
    fetchFollowers();
  }, [data.businessId, firestore]);


  const handleShare = async () => {
    const shareUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${data.name} | Advize Brand Profile`,
          text: `Check out ${data.name}'s brand profile on Advize!`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({ title: 'Link Copied', description: 'Profile link copied to clipboard.' });
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to share.' });
      }
    }
  };

  const handleCopyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: 'Link Copied!', description: 'Profile link copied to clipboard.' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not copy link.' });
    }
  };

  const socialLinks: { Icon: React.ElementType; href: string; label: string }[] = [];
  if (data.companyWebsite) socialLinks.push({ Icon: Globe, href: data.companyWebsite, label: data.companyWebsite.replace(/^https?:\/\//, '') });
  if (data.twitter) socialLinks.push({ Icon: Twitter, href: `https://twitter.com/${data.twitter.replace('@', '')}`, label: data.twitter });
  if (data.instagram) socialLinks.push({ Icon: Instagram, href: `https://instagram.com/${data.instagram.replace('@', '')}`, label: data.instagram });
  if (data.linkedin) socialLinks.push({ Icon: Linkedin, href: data.linkedin, label: 'LinkedIn' });

  const stats = [
    { label: 'Campaigns Run', value: data.campaignsRun ?? (data.campaigns?.length ?? 0), color: 'from-blue-500/10 to-cyan-500/10 border-blue-500/30', textColor: 'text-blue-400', icon: Briefcase },
    { label: 'Active Now', value: data.activeCampaigns ?? 0, color: 'from-emerald-500/10 to-green-500/10 border-emerald-500/30', textColor: 'text-emerald-400', icon: CheckCircle2 },
    { label: 'Total Views', value: formatNumber(data.totalViews ?? 0), color: 'from-pink-500/10 to-rose-500/10 border-pink-500/30', textColor: 'text-pink-400', icon: TrendingUp },
    { label: 'Total Paid', value: formatCurrency(data.totalPaid ?? 0), color: 'from-amber-500/10 to-orange-500/10 border-amber-500/30', textColor: 'text-amber-400', icon: BarChart2 },
  ];

  return (
    <div className="w-full mx-auto space-y-8 animate-fade-in">
      {/* Header Card */}
      <Card className="overflow-hidden shadow-2xl border-white/5 bg-card relative">
        {/* Banner */}
        <div className="relative h-44 md:h-64 w-full bg-accent/10">
          <Image
            src={data.bannerUrl || 'https://picsum.photos/seed/business-banner/1200/400'}
            alt="Brand Banner"
            fill
            priority
            sizes="100vw"
            style={{ objectFit: 'cover' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          {/* Industry pill */}
          {data.industryType && (
            <div className="absolute top-4 right-4">
              <Badge className="bg-background/80 backdrop-blur-sm border-white/20 text-foreground shadow-md">
                <Building2 className="h-3 w-3 mr-1" />
                {data.industryType}
              </Badge>
            </div>
          )}
        </div>

        <div className="p-4 md:p-8 relative z-10">
          <div className="relative flex flex-col md:flex-row md:items-end md:gap-8 -mt-16 md:-mt-24">
            {/* Logo */}
            <div className="relative h-28 w-28 md:h-36 md:w-36 rounded-2xl border-4 border-background overflow-hidden shadow-[0_0_24px_rgba(59,130,246,0.35)] flex-shrink-0 bg-background">
              <Image
                src={data.logoUrl || 'https://picsum.photos/seed/brand-logo/200/200'}
                alt={`${data.name} Logo`}
                fill
                sizes="(max-width: 768px) 112px, 144px"
                style={{ objectFit: 'cover' }}
              />
            </div>

            {/* Name / Tagline / Actions */}
            <div className="mt-4 md:mt-0 flex-1 min-w-0">
              <div className="md:flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl md:text-3xl font-bold font-headline">{data.name}</h1>
                    <BadgeCheck className="h-6 w-6 text-primary flex-shrink-0" />
                    <Badge className="bg-primary/10 text-primary border-primary/30 text-xs">Brand</Badge>
                  </div>
                  {data.tagline && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{data.tagline}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5 font-medium text-purple-400">
                      <Users className="h-4 w-4" />
                      {followerCount !== null ? followerCount.toLocaleString() : '—'} followers
                    </span>
                    {data.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" />
                        {data.location}
                      </span>
                    )}
                    {data.companyWebsite && (
                      <a
                        href={data.companyWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 hover:text-primary transition-colors"
                      >
                        <Globe className="h-4 w-4" />
                        {data.companyWebsite.replace(/^https?:\/\//, '').split('/')[0]}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center justify-start md:justify-end gap-2 flex-shrink-0 flex-wrap mt-4 md:mt-0 w-full md:w-auto">
                  <FollowButton targetUserId={data.businessId} size="sm" />
                  <Button size="sm" variant="outline" onClick={handleShare} className="gap-2">
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                  <Button asChild size="sm" className="btn-primary shadow-lg shadow-primary/20">
                    <Link href="/signup">Collaborate on Advize</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

    

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(({ label, value, color, textColor, icon: Icon }) => (
          <div
            key={label}
            className={`rounded-xl glass bg-gradient-to-br ${color} border p-4 text-center hover:-translate-y-1 transition-transform duration-300`}
          >
            <Icon className={`h-4 w-4 mx-auto mb-1 ${textColor}`} />
            <p className={`text-xl md:text-2xl font-bold ${textColor}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Campaigns + About */}
        <div className="lg:col-span-2 space-y-6">
          {/* About */}
          {data.about && (
            <Card className="shadow-lg border-white/10">
              <CardHeader>
                <CardTitle>About {data.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{data.about}</p>
              </CardContent>
            </Card>
          )}

          {/* Campaigns */}
          <CampaignShowcase campaigns={data.campaigns || []} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Brand Stats */}
          <Card className="shadow-lg border-white/10">
            <CardHeader>
              <CardTitle>Brand Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Average CPM', value: data.averageCpm != null ? `₹${data.averageCpm.toFixed(2)}` : '—' },
                { label: 'Campaigns Run', value: data.campaignsRun ?? data.campaigns?.length ?? 0 },
                { label: 'Active Campaigns', value: data.activeCampaigns ?? 0 },
                { label: 'Approval Rate', value: data.approvalRate != null ? `${data.approvalRate.toFixed(1)}%` : '—', icon: Star },
              ].map(({ label, value, icon: Icon }, idx, arr) => (
                <div key={label}>
                  <div className="flex items-center justify-between py-1">
                    <p className="text-muted-foreground text-sm">{label}</p>
                    <div className="flex items-center gap-1 font-semibold text-sm">
                      {Icon && <Icon className="h-3.5 w-3.5 text-yellow-400" />}
                      {value}
                    </div>
                  </div>
                  {idx < arr.length - 1 && <Separator />}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Contact & Links */}
          <Card className="shadow-lg border-white/10">
            <CardHeader>
              <CardTitle>Contact & Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.email && (
                <div className="flex items-center gap-3 text-sm group glass-hover p-2 rounded-lg -mx-2 transition-all">
                  <div className="p-2 rounded-md bg-white/5 group-hover:bg-primary/20 transition-colors">
                    <Mail className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <a href={`mailto:${data.email}`} className="hover:underline truncate group-hover:text-primary transition-colors">
                    {data.email}
                  </a>
                </div>
              )}
              {socialLinks.map(({ Icon, href, label }) => (
                <div key={href} className="flex items-center gap-3 text-sm group glass-hover p-2 rounded-lg -mx-2 transition-all">
                  <div className="p-2 rounded-md bg-white/5 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline text-primary truncate"
                  >
                    {label}
                  </a>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* CTA */}
          <Card className="shadow-lg border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="p-6 text-center space-y-4">
              <h3 className="text-lg font-bold">Want to collaborate?</h3>
              <p className="text-sm text-muted-foreground">
                Join Advize to connect with {data.name} and launch creator campaigns.
              </p>
              <Button asChild className="btn-primary w-full shadow-lg shadow-primary/20">
                <Link href="/signup">Sign Up on Advize</Link>
              </Button>
              <p className="text-xs text-muted-foreground">Already have an account?{' '}
                <Link href="/login" className="text-primary hover:underline">Login</Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
    Instagram,
    Heart,
    MessageCircle,
    TrendingUp,
    Users,
    Eye,
    ExternalLink,
    Loader2,
    BarChart3,
    CheckCircle
} from 'lucide-react';
import Image from 'next/image';
import type { InstagramAnalytics } from '@/lib/instagram-types';

interface CreatorInstagramStatsProps {
    creatorId: string;
    creatorName: string;
    creatorAvatar?: string;
    instagramUrl?: string;
    cachedAnalytics?: InstagramAnalytics | null;
}

function formatNumber(num: number): string {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function MiniStatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
    return (
        <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-full ${color}`}>
                <Icon className="h-3 w-3 text-white" />
            </div>
            <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-semibold">{value}</p>
            </div>
        </div>
    );
}

export function CreatorInstagramStats({
    creatorId,
    creatorName,
    creatorAvatar,
    instagramUrl,
    cachedAnalytics
}: CreatorInstagramStatsProps) {
    const [data, setData] = useState<InstagramAnalytics | null>(cachedAnalytics || null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    const fetchInstagramData = async () => {
        if (!instagramUrl) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/instagram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: instagramUrl, type: 'profile' }),
            });

            const result = await response.json();

            if (result.success && result.data) {
                setData(result.data);
            } else {
                setError(result.error || 'Failed to fetch data');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch data');
        } finally {
            setIsLoading(false);
        }
    };

    // Compact card for table/list view
    if (!instagramUrl) {
        return (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Instagram className="h-4 w-4" />
                <span>Not connected</span>
            </div>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                        if (!data && !isLoading) {
                            fetchInstagramData();
                        }
                    }}
                >
                    <Instagram className="h-4 w-4" />
                    {data ? (
                        <span className="flex items-center gap-1">
                            {formatNumber(data.profile.followersCount)}
                            <span className="text-muted-foreground text-xs">followers</span>
                        </span>
                    ) : (
                        'View Stats'
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500">
                            <Instagram className="h-5 w-5 text-white" />
                        </div>
                        Instagram Analytics - {creatorName}
                    </DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-3 text-muted-foreground">Fetching Instagram data...</span>
                    </div>
                ) : error ? (
                    <div className="text-center py-8">
                        <Instagram className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="mt-4 text-muted-foreground">{error}</p>
                        <Button onClick={fetchInstagramData} className="mt-4" variant="outline">
                            Try Again
                        </Button>
                    </div>
                ) : data ? (
                    <div className="space-y-6">
                        {/* Profile Header */}
                        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                            <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-primary bg-gradient-to-br from-pink-500 to-purple-500">
                                {data.profile.profilePicUrl ? (
                                    <Image
                                        src={data.profile.profilePicUrl}
                                        alt={data.profile.fullName || data.profile.username}
                                        fill
                                        className="object-cover"
                                        unoptimized
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                                        {data.profile.username?.charAt(0)?.toUpperCase() || 'U'}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-lg">@{data.profile.username}</h3>
                                    {data.profile.isVerified && (
                                        <CheckCircle className="h-5 w-5 text-primary fill-primary" />
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground">{data.profile.fullName}</p>
                                {data.profile.businessCategoryName && (
                                    <Badge variant="secondary" className="mt-1">{data.profile.businessCategoryName}</Badge>
                                )}
                            </div>
                            <a
                                href={instagramUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Button variant="outline" size="sm">
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    View Profile
                                </Button>
                            </a>
                        </div>

                        {/* Stats Overview */}
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="p-4 bg-muted/30 rounded-lg">
                                <p className="text-2xl font-bold">{formatNumber(data.profile.postsCount)}</p>
                                <p className="text-xs text-muted-foreground">Posts</p>
                            </div>
                            <div className="p-4 bg-muted/30 rounded-lg">
                                <p className="text-2xl font-bold">{formatNumber(data.profile.followersCount)}</p>
                                <p className="text-xs text-muted-foreground">Followers</p>
                            </div>
                            <div className="p-4 bg-muted/30 rounded-lg">
                                <p className="text-2xl font-bold">{formatNumber(data.profile.followingCount)}</p>
                                <p className="text-xs text-muted-foreground">Following</p>
                            </div>
                        </div>

                        {/* Engagement Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="p-3 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                                <div className="flex items-center gap-2 text-white/80">
                                    <TrendingUp className="h-4 w-4" />
                                    <span className="text-xs">Engagement</span>
                                </div>
                                <p className="text-xl font-bold mt-1">{data.stats.avgEngagementRate}%</p>
                            </div>
                            <div className="p-3 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 text-white">
                                <div className="flex items-center gap-2 text-white/80">
                                    <Heart className="h-4 w-4" />
                                    <span className="text-xs">Avg. Likes</span>
                                </div>
                                <p className="text-xl font-bold mt-1">{formatNumber(data.stats.avgLikesPerPost)}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                                <div className="flex items-center gap-2 text-white/80">
                                    <MessageCircle className="h-4 w-4" />
                                    <span className="text-xs">Avg. Comments</span>
                                </div>
                                <p className="text-xl font-bold mt-1">{formatNumber(data.stats.avgCommentsPerPost)}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 text-white">
                                <div className="flex items-center gap-2 text-white/80">
                                    <BarChart3 className="h-4 w-4" />
                                    <span className="text-xs">Posting</span>
                                </div>
                                <p className="text-sm font-bold mt-1">{data.stats.postingFrequency}</p>
                            </div>
                        </div>

                        {/* Top Hashtags */}
                        {data.stats.topHashtags.length > 0 && (
                            <div>
                                <h4 className="font-semibold mb-2 text-sm">Top Hashtags</h4>
                                <div className="flex flex-wrap gap-2">
                                    {data.stats.topHashtags.slice(0, 8).map(({ tag, count }) => (
                                        <Badge
                                            key={tag}
                                            variant="outline"
                                            className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-pink-500/30"
                                        >
                                            #{tag}
                                            <span className="ml-1 text-muted-foreground">({count})</span>
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recent Posts Preview */}
                        {data.recentPosts.length > 0 && (
                            <div>
                                <h4 className="font-semibold mb-2 text-sm">Recent Posts</h4>
                                <div className="grid grid-cols-4 gap-2">
                                    {data.recentPosts.slice(0, 4).map((post) => (
                                        <a
                                            key={post.id}
                                            href={post.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="relative aspect-square rounded-lg overflow-hidden bg-muted group"
                                        >
                                            {post.displayUrl ? (
                                                <Image
                                                    src={post.displayUrl}
                                                    alt="Post"
                                                    fill
                                                    className="object-cover group-hover:opacity-80 transition-opacity"
                                                    unoptimized
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-500 to-purple-500">
                                                    <Instagram className="h-6 w-6 text-white/50" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="flex items-center gap-3 text-white text-xs">
                                                    <span className="flex items-center gap-1">
                                                        <Heart className="h-3 w-3 fill-white" />
                                                        {formatNumber(post.likesCount)}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <MessageCircle className="h-3 w-3 fill-white" />
                                                        {formatNumber(post.commentsCount)}
                                                    </span>
                                                </div>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        <p className="text-xs text-muted-foreground text-center">
                            Last updated: {new Date(data.lastUpdated).toLocaleDateString()}
                        </p>
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <Instagram className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="mt-4 text-muted-foreground">Click to load Instagram analytics</p>
                        <Button onClick={fetchInstagramData} className="mt-4">
                            Load Analytics
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

// Compact inline stats for table rows
export function CreatorInstagramStatsInline({
    instagramUrl,
    cachedAnalytics
}: {
    instagramUrl?: string;
    cachedAnalytics?: InstagramAnalytics | null;
}) {
    if (!instagramUrl) {
        return <span className="text-muted-foreground text-xs">-</span>;
    }

    if (!cachedAnalytics) {
        return (
            <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline text-sm"
            >
                <Instagram className="h-3 w-3" />
                View
            </a>
        );
    }

    return (
        <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1">
                <Users className="h-3 w-3 text-muted-foreground" />
                {formatNumber(cachedAnalytics.profile.followersCount)}
            </span>
            <span className="flex items-center gap-1 text-green-500">
                <TrendingUp className="h-3 w-3" />
                {cachedAnalytics.stats.avgEngagementRate}%
            </span>
        </div>
    );
}

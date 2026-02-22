'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
    Instagram,
    Heart,
    MessageCircle,
    Eye,
    TrendingUp,
    Users,
    BarChart3,
    RefreshCw,
    ExternalLink,
    Play,
    Image as ImageIcon,
    Hash,
    Calendar,
    Loader2,
    CheckCircle
} from 'lucide-react';
import Image from 'next/image';
import type { InstagramAnalytics, InstagramPost } from '@/lib/instagram-types';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    Legend,
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

interface InstagramAnalyticsCardProps {
    instagramUrl?: string;
    cachedData?: InstagramAnalytics | null;
    onDataUpdate?: (data: InstagramAnalytics) => void;
    isOwnProfile?: boolean;
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

function StatCard({
    icon: Icon,
    label,
    value,
    subValue,
    gradient
}: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    subValue?: string;
    gradient: string;
}) {
    return (
        <div className={`relative overflow-hidden rounded-xl p-4 ${gradient}`}>
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
                <div className="flex items-center gap-2 text-white/80">
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{label}</span>
                </div>
                <p className="mt-2 text-2xl font-bold text-white">{value}</p>
                {subValue && <p className="text-xs text-white/70 mt-1">{subValue}</p>}
            </div>
        </div>
    );
}

/**
 * Routes Instagram CDN URLs through our server-side proxy to bypass
 * hotlink protection and CORS restrictions on Instagram image URLs.
 */
function getProxiedImageUrl(url: string): string {
    if (!url) return '';
    // Only proxy Instagram/Facebook CDN URLs
    if (url.includes('cdninstagram.com') || url.includes('fbcdn.net') || url.includes('instagram.com')) {
        return `/api/image-proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
}

function PostCard({ post }: { post: InstagramPost }) {
    return (
        <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative aspect-square overflow-hidden rounded-lg bg-muted transition-transform hover:scale-[1.02]"
        >
            {post.displayUrl ? (
                <img
                    src={getProxiedImageUrl(post.displayUrl)}
                    alt={post.caption?.substring(0, 50) || 'Instagram post'}
                    className="absolute inset-0 w-full h-full object-cover transition-opacity group-hover:opacity-80"
                    loading="lazy"
                    onError={(e) => {
                        // If proxy also fails, show gradient fallback
                        (e.target as HTMLImageElement).style.display = 'none';
                    }}
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-500 to-purple-500">
                    <Instagram className="h-8 w-8 text-white/50" />
                </div>
            )}

            {/* Post type indicator */}
            <div className="absolute top-2 right-2">
                {post.type === 'Video' && (
                    <div className="rounded-full bg-black/60 p-1.5">
                        <Play className="h-3 w-3 text-white fill-white" />
                    </div>
                )}
                {post.type === 'Sidecar' && (
                    <div className="rounded-full bg-black/60 p-1.5">
                        <ImageIcon className="h-3 w-3 text-white" />
                    </div>
                )}
            </div>

            {/* Hover overlay with stats */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex items-center gap-6 text-white">
                    <div className="flex items-center gap-1.5">
                        <Heart className="h-5 w-5 fill-white" />
                        <span className="font-semibold">{formatNumber(post.likesCount)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <MessageCircle className="h-5 w-5 fill-white" />
                        <span className="font-semibold">{formatNumber(post.commentsCount)}</span>
                    </div>
                    {post.videoViewsCount && (
                        <div className="flex items-center gap-1.5">
                            <Eye className="h-5 w-5" />
                            <span className="font-semibold">{formatNumber(post.videoViewsCount)}</span>
                        </div>
                    )}
                </div>
            </div>
        </a>
    );
}

export function InstagramAnalyticsCard({
    instagramUrl,
    cachedData,
    onDataUpdate,
    isOwnProfile = false
}: InstagramAnalyticsCardProps) {
    const [data, setData] = useState<InstagramAnalytics | null>(cachedData || null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchInstagramData = async () => {
        if (!instagramUrl) {
            toast({
                variant: 'destructive',
                title: 'No Instagram URL',
                description: 'Please add your Instagram URL to your profile first.',
            });
            return;
        }

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
                onDataUpdate?.(result.data);
                toast({
                    title: 'Instagram Data Updated',
                    description: 'Your Instagram analytics have been refreshed.',
                });
            } else {
                setError(result.error || 'Failed to fetch Instagram data');
                toast({
                    variant: 'destructive',
                    title: 'Scraping Failed',
                    description: result.error || 'Could not fetch Instagram data.',
                });
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to connect to the server.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <Card className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
                    <div className="flex items-center gap-3 text-white">
                        <Instagram className="h-6 w-6" />
                        <div>
                            <CardTitle className="text-white">Instagram Analytics</CardTitle>
                            <CardDescription className="text-white/70">Fetching your data...</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-3 text-muted-foreground">Scraping Instagram data...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // No data state - prompt to fetch
    if (!data) {
        return (
            <Card className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-white">
                            <Instagram className="h-6 w-6" />
                            <div>
                                <CardTitle className="text-white">Instagram Analytics</CardTitle>
                                <CardDescription className="text-white/70">Connect your Instagram to see insights</CardDescription>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="text-center py-8">
                        <Instagram className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-medium">No Instagram Data Yet</h3>
                        <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                            {instagramUrl
                                ? 'Click the button below to fetch your Instagram analytics and showcase your reach.'
                                : 'Add your Instagram URL to your profile to import your analytics.'}
                        </p>
                        {isOwnProfile && (
                            <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                                {instagramUrl ? (
                                    <Button onClick={fetchInstagramData} disabled={isLoading}>
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Import Instagram Data
                                    </Button>
                                ) : (
                                    <Button asChild>
                                        <a href="/creator/profile/edit">
                                            <Instagram className="mr-2 h-4 w-4" />
                                            Add Instagram URL
                                        </a>
                                    </Button>
                                )}
                            </div>
                        )}
                        {error && (
                            <p className="mt-4 text-sm text-destructive">{error}</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const { profile, recentPosts, stats } = data;

    // Guard: if cached data is malformed / missing profile, treat as no data
    if (!profile || !recentPosts || !stats) {
        return (
            <Card className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
                    <div className="flex items-center gap-3 text-white">
                        <Instagram className="h-6 w-6" />
                        <div>
                            <CardTitle className="text-white">Instagram Analytics</CardTitle>
                            <CardDescription className="text-white/70">Data incomplete — please refresh</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6 text-center py-8">
                    <Instagram className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-3 text-sm text-muted-foreground">Analytics data is incomplete. Click Refresh to re-import.</p>
                    {isOwnProfile && (
                        <Button onClick={fetchInstagramData} disabled={isLoading} className="mt-4">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh Data
                        </Button>
                    )}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="overflow-hidden">
            {/* Header with gradient */}
            <CardHeader className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 pb-20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-white">
                        <Instagram className="h-6 w-6" />
                        <div>
                            <CardTitle className="text-white">Instagram Analytics</CardTitle>
                            <CardDescription className="text-white/70">
                                Last updated: {new Date(data.lastUpdated).toLocaleDateString()}
                            </CardDescription>
                        </div>
                    </div>
                    {isOwnProfile && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={fetchInstagramData}
                            disabled={isLoading}
                            className="bg-white/20 hover:bg-white/30 text-white border-0"
                        >
                            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    )}
                </div>
            </CardHeader>

            <CardContent className="p-6 -mt-16">
                {/* Profile Card */}
                <div className="bg-card rounded-xl border shadow-lg p-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-primary bg-gradient-to-br from-pink-500 to-purple-500">
                            {profile.profilePicUrl ? (
                                <img
                                    src={getProxiedImageUrl(profile.profilePicUrl)}
                                    alt={profile.fullName || profile.username}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                                    {profile.username?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-lg truncate">@{profile.username}</h3>
                                {profile.isVerified && (
                                    <CheckCircle className="h-5 w-5 text-primary fill-primary" />
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{profile.fullName}</p>
                            {profile.businessCategoryName && (
                                <Badge variant="secondary" className="mt-1">{profile.businessCategoryName}</Badge>
                            )}
                        </div>
                        <a
                            href={instagramUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0"
                        >
                            <Button variant="outline" size="sm">
                                <ExternalLink className="h-4 w-4" />
                            </Button>
                        </a>
                    </div>

                    {/* Quick Stats Row */}
                    <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                        <div className="text-center">
                            <p className="text-2xl font-bold">{formatNumber(profile.postsCount)}</p>
                            <p className="text-xs text-muted-foreground">Posts</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold">{formatNumber(profile.followersCount)}</p>
                            <p className="text-xs text-muted-foreground">Followers</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold">{formatNumber(profile.followingCount)}</p>
                            <p className="text-xs text-muted-foreground">Following</p>
                        </div>
                    </div>
                </div>

                {/* Performance Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <StatCard
                        icon={TrendingUp}
                        label="Engagement Rate"
                        value={`${stats.avgEngagementRate}%`}
                        gradient="bg-gradient-to-br from-green-500 to-emerald-600"
                    />
                    <StatCard
                        icon={Heart}
                        label="Avg. Likes"
                        value={formatNumber(stats.avgLikesPerPost)}
                        subValue="per post"
                        gradient="bg-gradient-to-br from-pink-500 to-rose-600"
                    />
                    <StatCard
                        icon={MessageCircle}
                        label="Avg. Comments"
                        value={formatNumber(stats.avgCommentsPerPost)}
                        subValue="per post"
                        gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
                    />
                    <StatCard
                        icon={Calendar}
                        label="Posting"
                        value={stats.postingFrequency}
                        gradient="bg-gradient-to-br from-orange-500 to-amber-600"
                    />
                </div>

                {/* Engagement Trend Chart */}
                {stats.engagementTrend.length > 1 && (
                    <div className="mb-6">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Engagement Trend
                        </h4>
                        <div className="h-48 bg-muted/30 rounded-lg p-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={stats.engagementTrend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.2)" />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 10 }}
                                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    />
                                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => formatNumber(value)} />
                                    <Tooltip
                                        formatter={(value: number) => [formatNumber(value), 'Engagement']}
                                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="engagement"
                                        stroke="hsl(var(--primary))"
                                        strokeWidth={2}
                                        dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Advanced Analytics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Media Mix */}
                    {stats.mediaMix && (
                        <div className="bg-card border rounded-xl p-4 shadow-sm">
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <ImageIcon className="h-4 w-4" />
                                Content Mix
                            </h4>
                            <div className="h-48 text-xs">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Image', value: stats.mediaMix.imagePercent },
                                                { name: 'Video', value: stats.mediaMix.videoPercent },
                                                { name: 'Carousel', value: stats.mediaMix.sidecarPercent },
                                            ].filter(item => item.value > 0)}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={40}
                                            outerRadius={60}
                                            fill="#8884d8"
                                            paddingAngle={5}
                                            dataKey="value"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        >
                                            {[
                                                { name: 'Image', value: stats.mediaMix.imagePercent },
                                                { name: 'Video', value: stats.mediaMix.videoPercent },
                                                { name: 'Carousel', value: stats.mediaMix.sidecarPercent },
                                            ].filter(item => item.value > 0).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Engagement by Type */}
                    {stats.avgEngagementByType && (
                        <div className="bg-card border rounded-xl p-4 shadow-sm">
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <BarChart3 className="h-4 w-4" />
                                Engagement by Type
                            </h4>
                            <div className="h-48 text-xs">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={[
                                            { name: 'Image', engagement: stats.avgEngagementByType.image },
                                            { name: 'Video', engagement: stats.avgEngagementByType.video },
                                            { name: 'Carousel', engagement: stats.avgEngagementByType.sidecar },
                                        ]}
                                        layout="vertical"
                                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={50} tick={{ fontSize: 10 }} />
                                        <Tooltip formatter={(value: number) => formatNumber(value)} />
                                        <Bar dataKey="engagement" fill="#8884d8" radius={[0, 4, 4, 0]}>
                                            {[
                                                { name: 'Image', engagement: stats.avgEngagementByType.image },
                                                { name: 'Video', engagement: stats.avgEngagementByType.video },
                                                { name: 'Carousel', engagement: stats.avgEngagementByType.sidecar },
                                            ].map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Best Time to Post (Day) */}
                    {stats.dayOfWeekAnalysis && stats.dayOfWeekAnalysis.length > 0 && (
                        <div className="bg-card border rounded-xl p-4 shadow-sm">
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Best Days to Post
                            </h4>
                            <div className="space-y-3">
                                {stats.dayOfWeekAnalysis.slice(0, 3).map((day, i) => (
                                    <div key={day.day} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge variant={i === 0 ? "default" : "secondary"} className="w-6 h-6 flex items-center justify-center p-0 rounded-full">
                                                {i + 1}
                                            </Badge>
                                            <span className="text-sm font-medium">{day.day}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-bold block">{formatNumber(day.avgEngagement)}</span>
                                            <span className="text-xs text-muted-foreground">avg. engagement</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Best Time to Post (Hour) */}
                    {stats.hourAnalysis && stats.hourAnalysis.length > 0 && (
                        <div className="bg-card border rounded-xl p-4 shadow-sm">
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" />
                                Best Hours to Post
                            </h4>
                            <div className="space-y-3">
                                {stats.hourAnalysis.slice(0, 3).map((hour, i) => (
                                    <div key={hour.hour} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge variant={i === 0 ? "default" : "secondary"} className="w-6 h-6 flex items-center justify-center p-0 rounded-full">
                                                {i + 1}
                                            </Badge>
                                            <span className="text-sm font-medium">
                                                {hour.hour === 0 ? '12 AM' : hour.hour < 12 ? `${hour.hour} AM` : hour.hour === 12 ? '12 PM' : `${hour.hour - 12} PM`}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-bold block">{formatNumber(hour.avgEngagement)}</span>
                                            <span className="text-xs text-muted-foreground">avg. engagement</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Top Mentions */}
                {stats.topMentions && stats.topMentions.length > 0 && (
                    <div className="mb-6">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Top Mentions
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {stats.topMentions.map(({ mention, count }) => (
                                <Badge
                                    key={mention}
                                    variant="outline"
                                    className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                >
                                    @{mention}
                                    <span className="ml-1 text-blue-400">({count})</span>
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* Top Hashtags */}
                {stats.topHashtags.length > 0 && (
                    <div className="mb-6">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            Top Hashtags
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {stats.topHashtags.map(({ tag, count }) => (
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

                {/* Recent Posts Grid */}
                {recentPosts.length > 0 && (
                    <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <ImageIcon className="h-4 w-4" />
                            Recent Posts
                        </h4>
                        <div className="grid grid-cols-3 gap-2">
                            {recentPosts.slice(0, 9).map((post) => (
                                <PostCard key={post.id} post={post} />
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

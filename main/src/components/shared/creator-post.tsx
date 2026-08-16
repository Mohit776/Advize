
'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, Eye, Heart, MessageCircle, Play, ImageIcon, Images, AlertCircle } from 'lucide-react';
import { useState, useCallback } from 'react';

interface PostData {
    id: string;
    shortCode: string;
    url: string;
    type: 'Image' | 'Video' | 'Sidecar';
    caption?: string;
    timestamp: string;
    likesCount: number;
    commentsCount: number;
    videoViewsCount?: number;
    displayUrl: string;
    hashtags?: string[];
    ownerUsername?: string;
}

interface CreatorPostProps {
    children: React.ReactNode;
    creatorName: string;
    postUrl: string;
}

export function CreatorPost({
    children,
    creatorName,
    postUrl,
}: CreatorPostProps) {
    const [postData, setPostData] = useState<PostData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasFetched, setHasFetched] = useState(false);
    const [imgError, setImgError] = useState(false);

    const fetchPostData = useCallback(async () => {
        if (hasFetched || !postUrl) return;

        setIsLoading(true);
        setError(null);
        setHasFetched(true);

        try {
            const res = await fetch('/api/instagram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: postUrl, type: 'post' }),
            });

            const result = await res.json();

            if (result.success && result.data) {
                const post = result.data.recentPosts?.[0];
                if (post) {
                    setPostData({
                        ...post,
                        ownerUsername: result.data.profile?.username,
                    });
                } else {
                    setError('No post data found.');
                }
            } else {
                setError(result.error || 'Failed to fetch post data.');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred while fetching data.');
        } finally {
            setIsLoading(false);
        }
    }, [postUrl, hasFetched]);

    const handleOpenChange = (open: boolean) => {
        if (open) {
            fetchPostData();
        }
    };

    const formatNumber = (num: number): string => {
        if (num < 0) return '0';
        if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
        if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
        return num.toString();
    };

    const typeIcon = {
        Video: <Play className="h-3 w-3" />,
        Image: <ImageIcon className="h-3 w-3" />,
        Sidecar: <Images className="h-3 w-3" />,
    };

    const typeLabel = {
        Video: 'Reel / Video',
        Image: 'Photo',
        Sidecar: 'Carousel',
    };

    return (
        <Dialog onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Post by {creatorName}</DialogTitle>
                    <DialogDescription>
                        Instagram post preview &amp; engagement details.
                    </DialogDescription>
                </DialogHeader>

                {/* Loading State */}
                {isLoading && (
                    <div className="space-y-4 mt-2">
                        <Skeleton className="w-full aspect-square rounded-lg" />
                        <div className="flex gap-4">
                            <Skeleton className="h-8 w-20" />
                            <Skeleton className="h-8 w-20" />
                            <Skeleton className="h-8 w-20" />
                        </div>
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                )}

                {/* Error State */}
                {error && !isLoading && (
                    <div className="mt-4 space-y-4">
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-destructive">Could not load preview</p>
                                <p className="text-xs text-muted-foreground mt-1">{error}</p>
                            </div>
                        </div>
                        <div className="text-center">
                            <Button variant="outline" size="sm" asChild>
                                <a href={postUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Open on Instagram
                                </a>
                            </Button>
                        </div>
                    </div>
                )}

                {/* Post Data */}
                {postData && !isLoading && (
                    <div className="mt-2 space-y-4">
                        {/* Post Type Badge */}
                        <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="flex items-center gap-1.5">
                                {typeIcon[postData.type]}
                                {typeLabel[postData.type]}
                            </Badge>
                            {postData.ownerUsername && (
                                <span className="text-xs text-muted-foreground">
                                    @{postData.ownerUsername}
                                </span>
                            )}
                        </div>

                        {/* Post Thumbnail - using regular img to avoid Next.js optimization issues with Instagram CDN */}
                        {postData.displayUrl && !imgError ? (
                            <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-muted">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={postData.displayUrl}
                                    alt={`Post by ${creatorName}`}
                                    className="w-full h-full object-cover rounded-lg"
                                    onError={() => setImgError(true)}
                                    referrerPolicy="no-referrer"
                                    crossOrigin="anonymous"
                                />
                                {postData.type === 'Video' && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                        <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                                            <Play className="h-7 w-7 text-black fill-black ml-1" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : postData.displayUrl && imgError ? (
                            /* Fallback: Instagram embed iframe when image fails to load */
                            <div className="w-full rounded-lg overflow-hidden bg-muted border border-border">
                                <iframe
                                    src={`${postData.url}embed/`}
                                    className="w-full border-0"
                                    style={{ minHeight: '450px' }}
                                    allowTransparency
                                    scrolling="no"
                                    title={`Instagram post by ${creatorName}`}
                                />
                            </div>
                        ) : null}

                        {/* Engagement Stats */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-pink-500/10 border border-pink-500/20">
                                <Heart className="h-4 w-4 text-pink-500" />
                                <div>
                                    <p className="text-sm font-bold">{formatNumber(postData.likesCount)}</p>
                                    <p className="text-[10px] text-muted-foreground">Likes</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                <MessageCircle className="h-4 w-4 text-blue-500" />
                                <div>
                                    <p className="text-sm font-bold">{formatNumber(postData.commentsCount)}</p>
                                    <p className="text-[10px] text-muted-foreground">Comments</p>
                                </div>
                            </div>
                            {postData.videoViewsCount !== undefined && postData.videoViewsCount > 0 && (
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                    <Eye className="h-4 w-4 text-purple-500" />
                                    <div>
                                        <p className="text-sm font-bold">{formatNumber(postData.videoViewsCount)}</p>
                                        <p className="text-[10px] text-muted-foreground">Views</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Caption */}
                        {postData.caption && (
                            <div className="p-3 rounded-lg bg-muted/50 border border-border">
                                <p className="text-xs text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                                    {postData.caption}
                                </p>
                            </div>
                        )}

                        {/* Hashtags */}
                        {postData.hashtags && postData.hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {postData.hashtags.slice(0, 8).map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-[10px] px-2 py-0.5">
                                        #{tag}
                                    </Badge>
                                ))}
                                {postData.hashtags.length > 8 && (
                                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-muted-foreground">
                                        +{postData.hashtags.length - 8} more
                                    </Badge>
                                )}
                            </div>
                        )}

                        {/* Timestamp + Link */}
                        <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-xs text-muted-foreground">
                                {new Date(postData.timestamp).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                })}
                            </span>
                            <Button variant="outline" size="sm" asChild>
                                <a href={postUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="mr-2 h-3.5 w-3.5" />
                                    View on Instagram
                                </a>
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

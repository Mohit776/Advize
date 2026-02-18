import { ApifyClient } from 'apify-client';
import type { InstagramProfile, InstagramPost, InstagramAnalytics, InstagramScrapeResult } from './instagram-types';

// Initialize the ApifyClient with API token
const getApifyClient = () => {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) {
        throw new Error('APIFY_API_TOKEN environment variable is not set');
    }
    return new ApifyClient({ token });
};

// Extract username from Instagram URL
export function extractUsernameFromUrl(url: string): string | null {
    const patterns = [
        /instagram\.com\/([^\/\?]+)/,
        /^@?([a-zA-Z0-9._]+)$/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1] && !['p', 'reel', 'stories', 'explore'].includes(match[1])) {
            return match[1].replace('@', '');
        }
    }
    return null;
}

// Scrape Instagram profile data
export async function scrapeInstagramProfile(username: string): Promise<InstagramScrapeResult> {
    try {
        const client = getApifyClient();

        // Prepare Actor input for Instagram Profile Scraper
        // The scraper expects directUrls with full Instagram profile URLs
        const input = {
            directUrls: [`https://www.instagram.com/${username}/`],
            resultsLimit: 1, // 'details' returns 1 item per URL
            resultsType: 'details', // Get full profile details + latest posts
            checkOldPosts: false,
        };

        // Run the Actor and wait for it to finish
        const run = await client.actor("apify/instagram-scraper").call(input);

        // Fetch Actor results from the run's dataset
        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        if (!items || items.length === 0) {
            return { success: false, error: 'No data found for this Instagram profile' };
        }

        // Process the scraped data
        const profileData = items[0] as any;
        const posts = profileData.latestPosts || []; // Posts are now inside the profile object

        // Build profile object
        const profile: InstagramProfile = {
            id: profileData.id || profileData.ownerId || username,
            username: profileData.username || username,
            fullName: profileData.fullName || '',
            biography: profileData.biography || '',
            profilePicUrl: profileData.profilePicUrl || profileData.profilePicUrlHD || '',
            followersCount: profileData.followersCount || 0,
            followingCount: profileData.followsCount || 0, // 'details' usually returns followsCount
            postsCount: profileData.postsCount || posts.length,
            isVerified: profileData.verified || profileData.isVerified || false,
            isBusinessAccount: profileData.isBusinessAccount || false,
            externalUrl: profileData.externalUrl,
            businessCategoryName: profileData.businessCategoryName,
        };

        // Build posts array
        const recentPosts: InstagramPost[] = posts.slice(0, 12).map((post: any) => ({
            id: post.id || post.shortCode,
            shortCode: post.shortCode || '',
            url: post.url || `https://www.instagram.com/p/${post.shortCode}/`,
            type: post.type === 'Video' ? 'Video' : post.type === 'Sidecar' ? 'Sidecar' : 'Image',
            caption: post.caption || '',
            timestamp: (post.timestamp || post.takenAtTimestamp) ? new Date((post.takenAtTimestamp ? post.takenAtTimestamp * 1000 : post.timestamp)).toISOString() : new Date().toISOString(),
            likesCount: post.likesCount || 0,
            commentsCount: post.commentsCount || 0,
            videoViewsCount: post.videoViewCount || post.videoPlayCount,
            displayUrl: post.displayUrl || post.imageUrl || '',
            hashtags: post.hashtags || extractHashtags(post.caption || ''),
            mentions: post.mentions || extractMentions(post.caption || ''),
            isSponsored: post.isSponsored || false,
            locationName: post.locationName,
        }));

        // Calculate statistics
        const totalLikes = recentPosts.reduce((sum, post) => sum + post.likesCount, 0);
        const totalComments = recentPosts.reduce((sum, post) => sum + post.commentsCount, 0);
        const totalViews = recentPosts.reduce((sum, post) => sum + (post.videoViewsCount || 0), 0);
        const avgLikesPerPost = recentPosts.length > 0 ? Math.round(totalLikes / recentPosts.length) : 0;
        const avgCommentsPerPost = recentPosts.length > 0 ? Math.round(totalComments / recentPosts.length) : 0;
        const avgEngagementRate = profile.followersCount > 0
            ? parseFloat(((avgLikesPerPost + avgCommentsPerPost) / profile.followersCount * 100).toFixed(2))
            : 0;

        // Calculate top hashtags
        const hashtagCounts: { [key: string]: number } = {};
        recentPosts.forEach(post => {
            post.hashtags?.forEach(tag => {
                hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
            });
        });
        const topHashtags = Object.entries(hashtagCounts)
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Calculate engagement trend (group by date)
        const engagementByDate: { [key: string]: number } = {};
        recentPosts.forEach(post => {
            const date = post.timestamp.split('T')[0];
            const engagement = post.likesCount + post.commentsCount;
            engagementByDate[date] = (engagementByDate[date] || 0) + engagement;
        });
        const engagementTrend = Object.entries(engagementByDate)
            .map(([date, engagement]) => ({ date, engagement }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Calculate posting frequency
        let postingFrequency = 'Unknown';
        if (recentPosts.length >= 2) {
            const timestamps = recentPosts.map(p => new Date(p.timestamp).getTime()).sort((a, b) => b - a);
            const daysDiff = (timestamps[0] - timestamps[timestamps.length - 1]) / (1000 * 60 * 60 * 24);
            const postsPerWeek = (recentPosts.length / daysDiff) * 7;
            if (postsPerWeek >= 7) postingFrequency = 'Daily';
            else if (postsPerWeek >= 3) postingFrequency = 'Every 2-3 days';
            else if (postsPerWeek >= 1) postingFrequency = 'Weekly';
            else postingFrequency = 'Less than weekly';
        }

        // --- Advanced Analytics Calculations ---

        // 1. Media Mix & Engagement by Type
        const typeCounts = { Image: 0, Video: 0, Sidecar: 0 };
        const typeEngagement = { Image: 0, Video: 0, Sidecar: 0 };

        recentPosts.forEach(post => {
            const type = post.type;
            const engagement = post.likesCount + post.commentsCount;
            if (type in typeCounts) {
                typeCounts[type]++;
                typeEngagement[type] += engagement;
            }
        });

        const totalPosts = recentPosts.length || 1;
        const mediaMix = {
            imagePercent: Math.round((typeCounts.Image / totalPosts) * 100),
            videoPercent: Math.round((typeCounts.Video / totalPosts) * 100),
            sidecarPercent: Math.round((typeCounts.Sidecar / totalPosts) * 100),
        };

        const avgEngagementByType = {
            image: typeCounts.Image ? Math.round(typeEngagement.Image / typeCounts.Image) : 0,
            video: typeCounts.Video ? Math.round(typeEngagement.Video / typeCounts.Video) : 0,
            sidecar: typeCounts.Sidecar ? Math.round(typeEngagement.Sidecar / typeCounts.Sidecar) : 0,
        };

        // 2. Day of Week & Hour Analysis
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayStats = Array(7).fill(0).map(() => ({ engagement: 0, count: 0 }));
        const hourStats = Array(24).fill(0).map(() => ({ engagement: 0, count: 0 }));

        recentPosts.forEach(post => {
            const date = new Date(post.timestamp);
            const dayIndex = date.getDay();
            const hourIndex = date.getHours();
            const engagement = post.likesCount + post.commentsCount;

            dayStats[dayIndex].engagement += engagement;
            dayStats[dayIndex].count++;

            hourStats[hourIndex].engagement += engagement;
            hourStats[hourIndex].count++;
        });

        const dayOfWeekAnalysis = days.map((day, index) => ({
            day,
            avgEngagement: dayStats[index].count ? Math.round(dayStats[index].engagement / dayStats[index].count) : 0,
            postCount: dayStats[index].count
        })).sort((a, b) => b.avgEngagement - a.avgEngagement);

        const hourAnalysis = hourStats.map((stat, index) => ({
            hour: index,
            avgEngagement: stat.count ? Math.round(stat.engagement / stat.count) : 0,
            postCount: stat.count
        })).sort((a, b) => b.avgEngagement - a.avgEngagement);
        // We might want to keep hours sorted by time for a chart, but for "best time" sorting by engagement is good.
        // Let's settle on returning them sorted by engagement for "insights" but maybe the frontend re-sorts for charts.
        // I will return sorted by engagement to highlight "Best Time".

        // 3. Top Mentions
        const mentionCounts: { [key: string]: number } = {};
        recentPosts.forEach(post => {
            post.mentions?.forEach(mention => {
                mentionCounts[mention] = (mentionCounts[mention] || 0) + 1;
            });
        });
        const topMentions = Object.entries(mentionCounts)
            .map(([mention, count]) => ({ mention, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Update profile with calculated stats
        profile.engagementRate = avgEngagementRate;
        profile.avgLikesPerPost = avgLikesPerPost;
        profile.avgCommentsPerPost = avgCommentsPerPost;

        const analytics: InstagramAnalytics = {
            profile,
            recentPosts,
            stats: {
                totalEngagement: totalLikes + totalComments,
                avgEngagementRate,
                avgLikesPerPost,
                avgCommentsPerPost,
                totalViews,
                postingFrequency,
                topHashtags,
                engagementTrend,
                mediaMix,
                avgEngagementByType,
                topMentions,
                dayOfWeekAnalysis,
                hourAnalysis,
            },
            lastUpdated: new Date().toISOString(),
        };

        return { success: true, data: analytics };
    } catch (error: any) {
        console.error('Instagram scraping error:', error);
        return {
            success: false,
            error: error.message || 'Failed to scrape Instagram profile'
        };
    }
}

// Helper function to extract hashtags from caption
function extractHashtags(caption: string): string[] {
    const matches = caption.match(/#[\w\u0080-\uFFFF]+/g);
    return matches ? matches.map(tag => tag.substring(1)) : [];
}

// Helper function to extract mentions from caption
function extractMentions(caption: string): string[] {
    const matches = caption.match(/@[\w.]+/g);
    return matches ? matches.map(mention => mention.substring(1)) : [];
}

// Scrape a specific Instagram post
export async function scrapeInstagramPost(postUrl: string): Promise<InstagramScrapeResult> {
    try {
        const client = getApifyClient();

        const input = {
            directUrls: [postUrl],
            resultsLimit: 1,
        };

        const run = await client.actor("apify/instagram-scraper").call(input);
        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        if (!items || items.length === 0) {
            return { success: false, error: 'No data found for this Instagram post' };
        }

        const postData = items[0] as any;

        const post: InstagramPost = {
            id: postData.id || postData.shortCode,
            shortCode: postData.shortCode || '',
            url: postData.url || postUrl,
            type: postData.type === 'Video' ? 'Video' : postData.type === 'Sidecar' ? 'Sidecar' : 'Image',
            caption: postData.caption || '',
            timestamp: postData.timestamp || new Date().toISOString(),
            likesCount: postData.likesCount || 0,
            commentsCount: postData.commentsCount || 0,
            videoViewsCount: postData.videoViewCount || postData.videoPlayCount,
            displayUrl: postData.displayUrl || '',
            hashtags: postData.hashtags || extractHashtags(postData.caption || ''),
            mentions: postData.mentions || extractMentions(postData.caption || ''),
            isSponsored: postData.isSponsored || false,
            locationName: postData.locationName,
        };

        // Calculate engagement rate if owner data is available
        if (postData.ownerFollowersCount) {
            post.engagementRate = parseFloat(
                ((post.likesCount + post.commentsCount) / postData.ownerFollowersCount * 100).toFixed(2)
            );
        }

        return {
            success: true,
            data: {
                profile: {
                    id: postData.ownerId || '',
                    username: postData.ownerUsername || '',
                    fullName: postData.ownerFullName || '',
                    biography: '',
                    profilePicUrl: '',
                    followersCount: postData.ownerFollowersCount || 0,
                    followingCount: 0,
                    postsCount: 0,
                    isVerified: postData.ownerIsVerified || false,
                    isBusinessAccount: false,
                },
                recentPosts: [post],
                stats: {
                    totalEngagement: post.likesCount + post.commentsCount,
                    avgEngagementRate: post.engagementRate || 0,
                    avgLikesPerPost: post.likesCount,
                    avgCommentsPerPost: post.commentsCount,
                    totalViews: post.videoViewsCount || 0,
                    postingFrequency: 'N/A',
                    topHashtags: (post.hashtags || []).map(tag => ({ tag, count: 1 })),

                    engagementTrend: [],
                    mediaMix: {
                        imagePercent: postData.type === 'Image' ? 100 : 0,
                        videoPercent: postData.type === 'Video' ? 100 : 0,
                        sidecarPercent: postData.type === 'Sidecar' ? 100 : 0,
                    },
                    avgEngagementByType: {
                        image: postData.type === 'Image' ? post.likesCount + post.commentsCount : 0,
                        video: postData.type === 'Video' ? post.likesCount + post.commentsCount : 0,
                        sidecar: postData.type === 'Sidecar' ? post.likesCount + post.commentsCount : 0,
                    },
                    topMentions: (post.mentions || []).map(mention => ({ mention, count: 1 })),
                    dayOfWeekAnalysis: [],
                    hourAnalysis: [],
                },
                lastUpdated: new Date().toISOString(),
            },
        };
    } catch (error: any) {
        console.error('Instagram post scraping error:', error);
        return {
            success: false,
            error: error.message || 'Failed to scrape Instagram post',
        };
    }
}

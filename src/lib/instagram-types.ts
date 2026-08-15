// Types for Instagram data scraped from Apify

export interface InstagramProfile {
  id: string;
  username: string;
  fullName: string;
  biography: string;
  profilePicUrl: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isVerified: boolean;
  isBusinessAccount: boolean;
  externalUrl?: string;
  businessCategoryName?: string;
  engagementRate?: number;
  avgLikesPerPost?: number;
  avgCommentsPerPost?: number;
}

export interface InstagramPost {
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
  mentions?: string[];
  isSponsored?: boolean;
  locationName?: string;
  engagementRate?: number;
}

export interface InstagramAnalytics {
  profile: InstagramProfile;
  recentPosts: InstagramPost[];
  stats: {
    totalEngagement: number;
    avgEngagementRate: number;
    avgLikesPerPost: number;
    avgCommentsPerPost: number;
    totalViews: number;
    postingFrequency: string;
    topHashtags: { tag: string; count: number }[];
    engagementTrend: { date: string; engagement: number }[];
    mediaMix: {
      imagePercent: number;
      videoPercent: number;
      sidecarPercent: number;
    };
    avgEngagementByType: {
      image: number;
      video: number;
      sidecar: number;
    };
    topMentions: { mention: string; count: number }[];
    dayOfWeekAnalysis: { day: string; avgEngagement: number; postCount: number }[];
    hourAnalysis: { hour: number; avgEngagement: number; postCount: number }[];
  };
  lastUpdated: string;
}

export interface InstagramScrapeResult {
  success: boolean;
  data?: InstagramAnalytics;
  error?: string;
}

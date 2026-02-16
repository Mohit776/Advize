

export type Campaign = {
  id: string;
  name: string;
  description: string;
  type: string;
  visibility: 'public' | 'private';
  budget?: number; // Optional for private campaigns
  cpmRate?: number; // Optional for private campaigns
  maxPayPerCreator?: number;
  fixedPayPerCreator?: number; // For private campaigns
  numberOfCreators?: number; // For private campaigns
  minFollowers?: number; // For private campaigns
  maxFollowers?: number; // For private campaigns
  startDate: any;
  endDate: any;
  requirements: string;
  dos: string;
  donts: string;
  status: 'Active' | 'Completed' | 'Pending';
  platforms: string[];
  demoContentLink?: string;
  businessId: string;
  brandName: string; // Denormalized
  brandLogo: string; // Denormalized
  creatorIds: string[];
  tryItems?: string[];
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'creator' | 'business';
  logoUrl?: string;
}

export type BusinessProfile = {
  id: string;
  userId: string;
  name: string;
  tagline: string;
  city: string;
  state: string;
  isVerified: boolean;
  description: string;
  website: string;
  logoUrl: string;
  bannerUrl: string;
  socialLinks: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
    linkedin?: string;
  };
  industry: string;
};

export type CreatorPerformance = {
  id: string;
  name: string;
  avatarUrl: string;
  views: number;
  engagement: number;
  postUrl: string;
};

export type CampaignDetails = {
  id: string;
  name: string;
  description: string;
  platforms: string[];
  type?: string;
  status: 'Active' | 'Completed';
  startDate: string;
  endDate: string;
  totalSpend: number;
  totalBudget: number;
  budget: number;
  views: number;
  fixedCPM: number; // This is the original cpmRate from Campaign type
  cpmRate: number; // This can be removed if fixedCPM is used
  obtainedCPM: number;
  engagementRate: number;
  roi: number;
  viewsOverTime: { date: string; views: number }[];
  topCreators: CreatorPerformance[];
  requirements: string;
  dos: string;
  donts: string;
};

export type PortfolioItem = {
  id: string;
  brandName: string;
  campaignType: 'UGC' | 'Product Demo' | 'Review';
  category: string;
  platform: 'Instagram' | 'YouTube' | 'Moj' | 'ShareChat';
  thumbnailUrl: string;
  views: number;
  likes: number;
  comments: number;
};

export type Submission = {
  id: string;
  campaignId: string;
  creatorId: string;
  creatorName: string;
  postUrl: string;
  username: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: any; // Using `any` for serverTimestamp
  rejectionReason?: string;
};


export type WishlistItem = {
  campaignId: string;
  addedAt: {
    seconds: number;
    nanoseconds: number;
  };
};

export type Review = {
  id: string;
  name: string;
  role: string;
  reviewText: string;
  rating: number;
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
  isApproved: boolean;
};

export type Group = {
  id: string;
  name: string;
  campaignId: string;
  adminId: string;
  memberIds: string[];
}

export type Message = {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text?: string;
  attachment?: {
    url: string;
    type: 'image' | 'file';
    name: string;
  };
  reactions?: { [emoji: string]: string[] }; // e.g., { '👍': ['userId1', 'userId2'] }
  replyTo?: {
    messageId: string;
    senderName: string;
    textSnippet: string;
  };
  createdAt: any;
}

export type Earning = {
  id: string;
  creatorId: string;
  campaignId: string;
  amount: number;
  views: number;
  earnedAt: any;
}

export type Transaction = {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'payout' | 'spend';
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  date: any;
  details?: string;
}

export type CollaborationRequest = {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  subject: string;
  body: string;
  status: 'pending' | 'accepted' | 'rejected' | 'read';
  createdAt: any;
  campaignId?: string;
};

export type Notification = {
  id: string;
  userId: string;
  type: 'submission_approved' | 'submission_rejected' | 'campaign_update' | 'payout_received';
  title: string;
  message: string;
  campaignId?: string;
  campaignName?: string;
  isRead: boolean;
  createdAt: any;
};

export type ExploreVideo = {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  creatorName: string;
  aspectRatio: '9:16' | '4:5' | '16:9' | '1:1';
  category?: string;
  uploadedBy: string; // business userId who uploaded
  isActive: boolean;
  createdAt: any;
};

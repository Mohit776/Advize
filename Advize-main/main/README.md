# Advize

Advize is a two-sided platform connecting brands with verified creators for transparent, data-driven influencer campaigns.

## Overview

This is a Next.js application built with Firebase, featuring role-based authentication and dashboards for both Creators and Businesses.

### Key Features:

- **Dual User Roles**: Separate experiences for Creators and Businesses.
- **Campaign Marketplace**: A central hub for businesses to post campaigns and for creators to discover opportunities.
- **Analytics Dashboards**: Real-time tracking of campaign performance, earnings, and engagement.
- **Instagram Analytics**: Scrape and visualize Instagram profile data including followers, engagement rates, top hashtags, and recent posts.
- **Secure Authentication**: Powered by Firebase for safe and reliable login/signup.
- **Profile Management**: Easy-to-use interfaces for users to manage their information.

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and add your API keys:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Apify API token:

```env
APIFY_API_TOKEN=your_apify_api_token_here
```

You can get your Apify API token from: https://console.apify.com/account/integrations

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the result.

## Instagram Analytics Integration

The platform uses the Apify Instagram Scraper to fetch and visualize Instagram data for creators:

### Features:
- **Profile Stats**: Followers, following, post count
- **Engagement Metrics**: Average likes, comments, and engagement rate per post
- **Posting Frequency**: How often the creator posts content
- **Top Hashtags**: Most used hashtags in recent posts
- **Engagement Trend**: Visual chart showing engagement over time
- **Recent Posts Grid**: Display of the latest 9 posts with hover stats

### How to Use:
1. Creators add their Instagram URL to their profile
2. Navigate to the Analytics tab on the profile page
3. Click "Import Instagram Data" to fetch the latest data
4. Data is visualized with beautiful charts and stats cards

## Main Pages

- `/` - The landing page.
- `/login` & `/signup` - Authentication pages.
- `/campaigns` - The public marketplace for campaigns.
- `/creator/*` - The dashboard for creators.
- `/business/*` - The dashboard for businesses.
- `/creator/profile/{id}` - Creator profile with Instagram Analytics (Analytics tab).


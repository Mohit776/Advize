import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { PublicProfileView, type PublicProfileData, type PublicCampaign } from '@/app/profile/_components/public-profile-view';
import { PublicBusinessProfileView, type PublicBusinessProfileData, type PublicBusinessCampaign } from '@/app/profile/_components/public-business-profile-view';
import { resolveProfileSlug } from '@/lib/username-utils';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://advize.in';

// ── Unified profile data fetcher ─────────────────────────────────────────────

type ProfileResult =
  | { type: 'creator'; data: PublicProfileData }
  | { type: 'business'; data: PublicBusinessProfileData }
  | null;

async function getProfileData(slug: string): Promise<ProfileResult> {
  const db = getAdminFirestore();

  // Resolve slug → uid
  const resolved = await resolveProfileSlug(db, slug);
  if (!resolved) return null;
  const uid = resolved.uid;

  const userSnap = await db.collection('users').doc(uid).get();
  if (!userSnap.exists) return null;

  const userData = userSnap.data()!;
  const rawRole = userData.role;

  // Check if business profile document exists to handle older accounts missing the role field
  const businessProfileSnap = await db.collection(`users/${uid}/businessProfile`).doc(uid).get();
  const isBusiness = rawRole === 'business' || (!rawRole && businessProfileSnap.exists);

  // Helper to remove undefined values for Next.js Server->Client component serialization
  const removeUndefined = <T extends Record<string, any>>(obj: T): T => {
    return JSON.parse(JSON.stringify(obj));
  };

  // ── Business profile ───────────────────────────────────────────────────────
  if (isBusiness) {
    const profileData = businessProfileSnap.exists ? businessProfileSnap.data()! : {};

    // Campaigns by this business
    const campaignsSnap = await db
      .collection('campaigns')
      .where('businessId', '==', uid)
      .get();

    const campaigns: PublicBusinessCampaign[] = campaignsSnap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        name: d.name || '',
        status: d.status || 'Draft',
        category: d.category || undefined,
        platforms: d.platforms || [],
        startDate: d.startDate?.toDate?.()?.toISOString() || undefined,
        endDate: d.endDate?.toDate?.()?.toISOString() || undefined,
      };
    });

    // Views & spend from earnings
    const earningsSnap = await db
      .collection('earnings')
      .where('businessId', '==', uid)
      .get();
    const totalViews = earningsSnap.docs.reduce((sum, d) => sum + (d.data().views || 0), 0);
    const totalPaid = earningsSnap.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0);

    // Approval rate from submissions
    const submissionsSnap = await db
      .collection('submissions')
      .where('businessId', '==', uid)
      .get();
    const approvedCount = submissionsSnap.docs.filter(
      (d) => d.data().status === 'approved'
    ).length;
    const approvalRate =
      submissionsSnap.docs.length > 0
        ? (approvedCount / submissionsSnap.docs.length) * 100
        : 0;

    const activeCampaigns = campaigns.filter((c) => c.status === 'Active').length;
    const averageCpm =
      totalViews > 0 ? (totalPaid / totalViews) * 1000 : 0;

    const businessData: PublicBusinessProfileData = {
      businessId: uid,
      username: userData.username || undefined,
      name: userData.name || 'Brand',
      email: userData.email || '',
      logoUrl: userData.logoUrl || undefined,
      bannerUrl: profileData.bannerUrl || undefined,
      tagline: profileData.tagline || undefined,
      about: profileData.about || undefined,
      industryType: profileData.industryType || undefined,
      location: profileData.location || undefined,
      companyWebsite: profileData.companyWebsite || undefined,
      twitter: profileData.twitter || undefined,
      instagram: profileData.instagram || undefined,
      linkedin: profileData.linkedin || undefined,
      campaigns,
      campaignsRun: campaigns.length,
      activeCampaigns,
      totalViews,
      totalPaid,
      approvalRate,
      averageCpm,
    };

    return { type: 'business', data: removeUndefined(businessData) };
  }

  // ── Creator profile (default) ──────────────────────────────────────────────
  const profileSnap = await db
    .collection(`users/${uid}/creatorProfile`)
    .doc(uid)
    .get();
  const creatorProfileData = profileSnap.exists ? profileSnap.data()! : {};

  const campaignsSnap = await db
    .collection('campaigns')
    .where('creatorIds', 'array-contains', uid)
    .get();

  const campaigns: PublicCampaign[] = campaignsSnap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      name: d.name || '',
      brandName: d.brandName || '',
      brandLogo: d.brandLogo || undefined,
      status: d.status || 'Draft',
      category: d.category || undefined,
      contentType: d.contentType || undefined,
      platforms: d.platforms || [],
      startDate: d.startDate?.toDate?.()?.toISOString() || undefined,
      endDate: d.endDate?.toDate?.()?.toISOString() || undefined,
    };
  });

  const earningsSnap = await db
    .collection('earnings')
    .where('creatorId', '==', uid)
    .get();
  const totalViews = earningsSnap.docs.reduce(
    (sum, d) => sum + (d.data().views || 0),
    0
  );

  const submissionsSnap = await db
    .collection('submissions')
    .where('creatorId', '==', uid)
    .get();
  const totalEngagements = submissionsSnap.docs.filter(
    (d) => d.data().status === 'approved'
  ).length;

  const creatorData: PublicProfileData = {
    creatorId: uid,
    username: userData.username || undefined,
    name: userData.name || 'Creator',
    email: userData.email || '',
    logoUrl: userData.logoUrl || undefined,
    bannerUrl: creatorProfileData.bannerUrl || undefined,
    bio: creatorProfileData.bio || undefined,
    categories: creatorProfileData.categories || [],
    creatorType: creatorProfileData.creatorType || undefined,
    city: creatorProfileData.city || undefined,
    state: creatorProfileData.state || undefined,
    country: creatorProfileData.country || undefined,
    location: creatorProfileData.location || undefined,
    age: creatorProfileData.age || undefined,
    platformLinks: creatorProfileData.platformLinks || [],
    instagramAnalyticsMulti: creatorProfileData.instagramAnalyticsMulti || {},
    featuredPosts: creatorProfileData.featuredPosts || [],
    campaigns,
    totalViews,
    totalEngagements,
  };

  return { type: 'creator', data: removeUndefined(creatorData) };
}

// ── OpenGraph Metadata ────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { creatorId: string };
}): Promise<Metadata> {
  const result = await getProfileData(params.creatorId);

  if (!result) {
    return { title: 'Profile Not Found | Advize' };
  }

  const profileData = result.data;
  const name = profileData.name;
  const isBusiness = result.type === 'business';
  const bio =
    isBusiness
      ? (result.data as PublicBusinessProfileData).tagline
      : (result.data as PublicProfileData).bio;

  const title = `${name} | Advize ${isBusiness ? 'Brand' : 'Creator'} Profile`;
  const description = bio
    ? bio.substring(0, 160)
    : `Check out ${name}'s ${isBusiness ? 'brand' : 'creator'} profile on Advize — the platform connecting creators with brands.`;
  const imageUrl = profileData.logoUrl || `${APP_URL}/android-chrome-512x512.png`;
  const slug =
    (isBusiness
      ? (result.data as PublicBusinessProfileData).username
      : (result.data as PublicProfileData).username) ||
    (isBusiness
      ? (result.data as PublicBusinessProfileData).businessId
      : (result.data as PublicProfileData).creatorId);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${APP_URL}/profile/${slug}`,
      images: [{ url: imageUrl, width: 400, height: 400, alt: `${name}'s profile picture` }],
      type: 'profile',
      siteName: 'Advize',
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: [imageUrl],
    },
  };
}

// ── Page Component ────────────────────────────────────────────────────────────

export default async function PublicProfilePage({
  params,
}: {
  params: { creatorId: string };
}) {
  const result = await getProfileData(params.creatorId);

  if (!result) {
    notFound();
  }

  if (result.type === 'business') {
    return <PublicBusinessProfileView data={result.data} />;
  }

  return <PublicProfileView data={result.data} />;
}

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { PublicProfileView, type PublicProfileData, type PublicCampaign } from '@/app/profile/_components/public-profile-view';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://advize.in';

// ── Fetch profile data from Firestore (server-side) ─────────────────────────

async function getPublicProfileData(creatorId: string): Promise<PublicProfileData | null> {
  const db = getAdminFirestore();

  const [userSnap, profileSnap] = await Promise.all([
    db.collection('users').doc(creatorId).get(),
    db.collection(`users/${creatorId}/creatorProfile`).doc(creatorId).get(),
  ]);

  if (!userSnap.exists) return null;

  const userData = userSnap.data()!;
  const creatorProfileData = profileSnap.exists ? profileSnap.data()! : {};

  // Fetch campaigns this creator participated in
  const campaignsSnap = await db
    .collection('campaigns')
    .where('creatorIds', 'array-contains', creatorId)
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

  // Fetch total views from earnings
  const earningsSnap = await db
    .collection('earnings')
    .where('creatorId', '==', creatorId)
    .get();
  const totalViews = earningsSnap.docs.reduce((sum, doc) => sum + (doc.data().views || 0), 0);

  // Fetch total engagements from submissions
  const submissionsSnap = await db
    .collection('submissions')
    .where('creatorId', '==', creatorId)
    .get();
  const totalEngagements = submissionsSnap.docs.filter(doc => doc.data().status === 'approved').length;

  return {
    creatorId,
    name: userData.name || 'Creator',
    email: userData.email || '',
    logoUrl: userData.logoUrl || undefined,
    bannerUrl: creatorProfileData.bannerUrl || undefined,
    bio: creatorProfileData.bio || undefined,
    categories: creatorProfileData.categories || [],
    location: creatorProfileData.location || undefined,
    platformLinks: creatorProfileData.platformLinks || [],
    instagramAnalyticsMulti: creatorProfileData.instagramAnalyticsMulti || {},
    campaigns,
    totalViews,
    totalEngagements,
  };
}

// ── OpenGraph Metadata ──────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { creatorId: string };
}): Promise<Metadata> {
  const data = await getPublicProfileData(params.creatorId);

  if (!data) {
    return { title: 'Creator Not Found | Advize' };
  }

  const title = `${data.name} | Advize Creator Profile`;
  const description = data.bio
    ? data.bio.substring(0, 160)
    : `Check out ${data.name}'s creator profile on Advize — the platform connecting creators with brands.`;
  const imageUrl = data.logoUrl || `${APP_URL}/android-chrome-512x512.png`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${APP_URL}/profile/${data.creatorId}`,
      images: [
        {
          url: imageUrl,
          width: 400,
          height: 400,
          alt: `${data.name}'s profile picture`,
        },
      ],
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

// ── Page Component ──────────────────────────────────────────────────────────

export default async function PublicCreatorProfilePage({
  params,
}: {
  params: { creatorId: string };
}) {
  const data = await getPublicProfileData(params.creatorId);

  if (!data) {
    notFound();
  }

  return <PublicProfileView data={data} />;
}

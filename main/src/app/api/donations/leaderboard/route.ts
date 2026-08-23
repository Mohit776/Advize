import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

/**
 * GET /api/donations/leaderboard?campaignId=xxx
 *
 * Returns the top 25 donors (attributed via a creator referral) for a given
 * NGO Support campaign, ordered by total donated amount descending.
 *
 * This uses the Admin SDK so we bypass Firestore security rules — the public
 * donate page can call this without requiring the visitor to be authenticated.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');

    if (!campaignId) {
      return NextResponse.json({ error: 'Missing campaignId parameter.' }, { status: 400 });
    }

    const db = getAdminFirestore();

    // Verify the campaign exists and is NGO Support
    const campaignSnap = await db.collection('campaigns').doc(campaignId).get();
    if (!campaignSnap.exists) {
      return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
    }
    const campaign = campaignSnap.data()!;
    if (campaign.type !== 'NGO Support') {
      return NextResponse.json({ error: 'Not an NGO Support campaign.' }, { status: 400 });
    }

    // Fetch all donations for this campaign that have a creator attribution
    const donationsSnap = await db
      .collection('donations')
      .where('campaignId', '==', campaignId)
      .where('creatorId', '!=', null)
      .get();

    // Build a map: donorEmail → aggregated donation info
    // We use donorEmail as the unique key because donors are unauthenticated
    const donorMap = new Map<
      string,
      { donorName: string; donorEmail: string; totalAmount: number; creatorName: string | null; latestDate: number }
    >();

    for (const docSnap of donationsSnap.docs) {
      const d = docSnap.data();
      const email = (d.donorEmail || '').toLowerCase();
      if (!email) continue;

      const amount = Number(d.amount) || 0;
      const dateMs = d.createdAt?.toMillis?.() || d.createdAt?._seconds * 1000 || 0;

      const existing = donorMap.get(email);
      if (existing) {
        existing.totalAmount += amount;
        // Keep the most recent donor name in case they changed it
        if (dateMs > existing.latestDate) {
          existing.donorName = d.donorName || existing.donorName;
          existing.latestDate = dateMs;
        }
      } else {
        donorMap.set(email, {
          donorName: d.donorName || 'Anonymous',
          donorEmail: email,
          totalAmount: amount,
          creatorName: d.creatorName || null,
          latestDate: dateMs,
        });
      }
    }

    // Sort by total amount descending and take top 25
    const leaderboard = Array.from(donorMap.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 25)
      .map((entry, index) => ({
        rank: index + 1,
        donorName: entry.donorName,
        totalAmount: entry.totalAmount,
        creatorName: entry.creatorName,
      }));

    return NextResponse.json({
      campaignId,
      campaignName: campaign.name || 'NGO Campaign',
      totalDonors: donorMap.size,
      leaderboard,
    });
  } catch (error) {
    console.error('Leaderboard fetch failed', error);
    return NextResponse.json({ error: 'Could not fetch leaderboard.' }, { status: 500 });
  }
}

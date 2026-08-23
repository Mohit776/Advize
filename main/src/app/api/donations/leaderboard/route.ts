import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/donations/leaderboard?campaignId=X&creatorId=Y
 *
 * Public endpoint — no auth required — that returns the top 25 verified
 * donors who came through a specific creator's referral link for a given
 * campaign. Uses the Admin SDK to bypass Firestore client security rules,
 * which only allow the businessId / creatorId owner to read donations.
 *
 * Only verified donations are included — submitted/under_review donations
 * haven't been confirmed by the NGO yet, and rejected ones are excluded.
 *
 * Returned donor records are stripped to public-safe fields only:
 * donorName and amount. Email, phone, and internal IDs are never exposed.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId')?.trim();
    const creatorId = searchParams.get('creatorId')?.trim();

    if (!campaignId) {
      return NextResponse.json(
        { error: 'campaignId is required.' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();

    // Build query: verified donations for this campaign, optionally scoped
    // to a specific creator's referral link, sorted by amount descending.
    let q = db
      .collection('donations')
      .where('campaignId', '==', campaignId)
      .where('status', '==', 'verified')
      .orderBy('amount', 'desc')
      .limit(25);

    if (creatorId) {
      q = db
        .collection('donations')
        .where('campaignId', '==', campaignId)
        .where('creatorId', '==', creatorId)
        .where('status', '==', 'verified')
        .orderBy('amount', 'desc')
        .limit(25);
    }

    const snap = await q.get();

    const donors = snap.docs.map((doc, index) => {
      const d = doc.data();
      return {
        rank: index + 1,
        // Only expose safe public fields — never email / phone / internal IDs
        donorName: String(d.donorName || 'Anonymous'),
        amount: Number(d.amount) || 0,
        creatorName: d.creatorName || null,
        creatorUsername: d.creatorUsername || null,
      };
    });

    return NextResponse.json({ donors }, { status: 200 });
  } catch (error) {
    console.error('Leaderboard fetch failed', error);
    return NextResponse.json(
      { error: 'Could not fetch leaderboard.' },
      { status: 500 }
    );
  }
}

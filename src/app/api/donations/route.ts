import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { campaignId, creatorId, donorName, donorEmail, amount, currency = 'INR', paymentMethod, transactionReference, paymentDate, paymentProofUrl } = body || {};

    // Validate required fields
    if (!campaignId || !donorName || !donorEmail || !amount || Number(amount) <= 0 || !paymentMethod) {
      return NextResponse.json({ error: 'Missing or invalid donation details.' }, { status: 400 });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donorEmail)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }

    // Validate input length
    if (String(donorName).length > 120) {
      return NextResponse.json({ error: 'Donor name is too long.' }, { status: 400 });
    }

    const db = getAdminFirestore();
    const campaignSnap = await db.collection('campaigns').doc(campaignId).get();
    if (!campaignSnap.exists) {
      return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
    }

    const campaign = campaignSnap.data()!;
    if (campaign.type !== 'NGO Support') {
      return NextResponse.json({ error: 'This campaign is not an NGO Support campaign.' }, { status: 400 });
    }
    if (campaign.status !== 'Active') {
      return NextResponse.json({ error: 'This campaign is not accepting donations.' }, { status: 400 });
    }

    // Verify creator if provided
    let verifiedCreatorId: string | null = null;
    let creatorName: string | null = null;
    let creatorUsername: string | null = null;

    if (creatorId) {
      const cleanRef = String(creatorId).trim().replace(/^@/, '');
      // 1. Try lookup by direct document ID (UID)
      const creatorByUidSnap = await db.collection('users').doc(cleanRef).get();
      if (creatorByUidSnap.exists && (campaign.creatorIds || []).includes(cleanRef)) {
        verifiedCreatorId = cleanRef;
        const data = creatorByUidSnap.data()!;
        creatorName = data.name || null;
        creatorUsername = data.username || null;
      } else {
        // 2. Try lookup by username
        const creatorByUsernameQuery = await db.collection('users').where('username', '==', cleanRef).limit(1).get();
        if (!creatorByUsernameQuery.empty) {
          const docSnap = creatorByUsernameQuery.docs[0];
          if ((campaign.creatorIds || []).includes(docSnap.id)) {
            verifiedCreatorId = docSnap.id;
            const data = docSnap.data();
            creatorName = data.name || null;
            creatorUsername = data.username || null;
          }
        }
      }

      // Note: We allow donations even if creator verification fails - just attribute will be missing
      if (!verifiedCreatorId) {
        console.warn('Creator referral not verified:', creatorId);
      }
    }

    // Generate or use provided transaction reference
    const finalTransactionReference = transactionReference 
      ? String(transactionReference).trim() 
      : `ADVIZE-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Use provided payment date or current date
    const finalPaymentDate = paymentDate ? new Date(paymentDate) : new Date();
    const donationDateStr = finalPaymentDate.toISOString();

    // Check for duplicate only if transaction reference was provided
    if (transactionReference) {
      const duplicate = await db.collection('donations')
        .where('campaignId', '==', campaignId)
        .where('transactionReference', '==', finalTransactionReference)
        .limit(1)
        .get();

      if (!duplicate.empty) {
        return NextResponse.json({ error: 'This transaction reference has already been submitted.' }, { status: 409 });
      }
    }

    // Fetch NGO / Business User details
    let ngoName = campaign.brandName || 'NGO Partner';
    if (campaign.businessId) {
      const businessSnap = await db.collection('users').doc(campaign.businessId).get();
      if (businessSnap.exists) {
        ngoName = businessSnap.data()?.name || ngoName;
      }
    }

    const ref = db.collection('donations').doc();
    const formattedAmount = Number(amount);

    const donationData = {
      id: ref.id,
      campaignId,
      campaignName: campaign.name || 'NGO Campaign',
      businessId: campaign.businessId,
      ngoName,
      creatorId: verifiedCreatorId,
      creatorName,
      creatorUsername,
      donorName: String(donorName).trim(),
      donorEmail: String(donorEmail).trim().toLowerCase(),
      amount: formattedAmount,
      currency,
      paymentMethod: String(paymentMethod),
      transactionReference: finalTransactionReference,
      paymentDate: finalPaymentDate,
      paymentProofUrl: paymentProofUrl ? String(paymentProofUrl) : null,
      status: 'submitted',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await ref.set(donationData);

    return NextResponse.json({
      success: true,
      donationId: ref.id,
      receipt: {
        receiptNumber: ref.id,
        campaignName: campaign.name || 'NGO Campaign',
        ngoName,
        donorName: String(donorName).trim(),
        donorEmail: String(donorEmail).trim().toLowerCase(),
        amount: formattedAmount,
        currency,
        paymentMethod: String(paymentMethod),
        transactionReference: finalTransactionReference,
        paymentDate: donationDateStr,
        creatorName: creatorName ? `${creatorName}${creatorUsername ? ` (@${creatorUsername})` : ''}` : null,
        submittedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Donation submission failed', error);
    return NextResponse.json({ error: 'Could not submit donation.' }, { status: 500 });
  }
}


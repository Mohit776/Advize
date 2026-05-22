import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ── Firebase Admin initialisation (server-side only) ─────────────────────────
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const INSTAGRAM_CLIENT_ID = process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID!;
const INSTAGRAM_CLIENT_SECRET = process.env.INSTAGRAM_CLIENT_SECRET!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
const REDIRECT_URI = `${APP_URL}/api/instagram-auth/callback`;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // uid encoded in state
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      `${APP_URL}/creator/profile/${state}?instagram_auth=error&reason=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${APP_URL}/creator/profile/${state ?? ''}?instagram_auth=error&reason=missing_params`
    );
  }

  try {
    // ── Step 1: Exchange code for short-lived token ────────────────────────
    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: INSTAGRAM_CLIENT_ID,
        client_secret: INSTAGRAM_CLIENT_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
        code,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('Instagram token exchange failed:', err);
      return NextResponse.redirect(
        `${APP_URL}/creator/profile/${state}?instagram_auth=error&reason=token_exchange_failed`
      );
    }

    const tokenData = await tokenRes.json();
    const { access_token: shortToken, user_id: igUserId } = tokenData;

    // ── Step 2: Upgrade to long-lived token (60-day) ─────────────────────
    const longLivedRes = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${INSTAGRAM_CLIENT_SECRET}&access_token=${shortToken}`
    );

    let accessToken = shortToken;
    let expiresIn = 3600;

    if (longLivedRes.ok) {
      const llData = await longLivedRes.json();
      accessToken = llData.access_token ?? shortToken;
      expiresIn = llData.expires_in ?? 3600;
    }

    // ── Step 3: Fetch Instagram profile info ─────────────────────────────
    const profileRes = await fetch(
      `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${accessToken}`
    );

    let igUsername = `ig_${igUserId}`;
    let igAccountType = 'PERSONAL';
    let finalIgUserId = String(igUserId);

    if (profileRes.ok) {
      const profileData = await profileRes.json();
      igUsername = profileData.username ?? igUsername;
      igAccountType = profileData.account_type ?? igAccountType;
      if (profileData.id) finalIgUserId = String(profileData.id);
    }

    // ── Step 4: Persist to Firestore ─────────────────────────────────────
    const db = getFirestore();
    const uid = state; // state param carries the Firebase UID

    await db
      .collection('instagram_accounts')
      .doc(uid)
      .set({
        uid,
        ig_user_id: finalIgUserId,
        username: igUsername,
        account_type: igAccountType,
        access_token: accessToken,
        token_expires_at: Date.now() + expiresIn * 1000,
        connected_at: Date.now(),
      });

    return NextResponse.redirect(
      `${APP_URL}/creator/profile/${uid}?instagram_auth=success&tab=auto-dm`
    );
  } catch (err: any) {
    console.error('Instagram OAuth callback error:', err);
    return NextResponse.redirect(
      `${APP_URL}/creator/profile/${state}?instagram_auth=error&reason=${encodeURIComponent(err.message)}`
    );
  }
}

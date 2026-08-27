import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import {
  matchMessageToRule,
  sendInstagramReply,
  type AutoDMRule,
} from '@/lib/instagram-messaging';

// ── Firebase Admin initialisation (singleton) ────────────────────────────────
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN!;

// ── GET: Webhook Verification (Meta challenge) ──────────────────────────────
// Meta sends: GET /api/instagram-webhook?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
// We return the challenge value if the token matches, or 403 otherwise.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[Webhook] Verification successful');
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn('[Webhook] Verification failed — token mismatch');
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// ── POST: Incoming Webhook Events ───────────────────────────────────────────
// Meta sends messaging events here. We match against the user's rules and auto-reply.
export async function POST(request: NextRequest) {
  // Always respond 200 quickly — Meta expects acknowledgement within 20 seconds
  // We process asynchronously within the same invocation.
  try {
    const body = await request.json();
    console.log('[Webhook] Received payload:', JSON.stringify(body, null, 2));

    // Instagram webhooks have object = 'instagram'
    if (body.object !== 'instagram') {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const entries = body.entry ?? [];

    for (const entry of entries) {
      const messagingEvents = entry.messaging ?? [];

      for (const event of messagingEvents) {
        // Skip echo messages (messages sent BY the page)
        if (event.message?.is_echo) continue;

        // Skip non-text messages (images, stickers, etc.)
        const messageText = event.message?.text;
        if (!messageText) continue;

        const senderId = event.sender?.id; // IG-scoped ID of the person who sent the DM
        const recipientId = event.recipient?.id; // IG user ID of the page receiving the DM

        if (!senderId || !recipientId) continue;

        console.log(
          `[Auto-DM] Incoming DM from ${senderId} to ${recipientId}: "${messageText}"`
        );

        await processIncomingMessage(recipientId, senderId, messageText);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error('[Webhook] Error processing webhook:', err);
    // Still return 200 to prevent Meta from retrying
    return NextResponse.json({ received: true }, { status: 200 });
  }
}

// ── Core Auto-Reply Logic ───────────────────────────────────────────────────

async function processIncomingMessage(
  igUserId: string,
  senderId: string,
  messageText: string
) {
  try {
    // 1. Find the connected account by ig_user_id (String)
    let accountsSnap = await db
      .collection('instagram_accounts')
      .where('ig_user_id', '==', igUserId)
      .limit(1)
      .get();

    // Fallback: check if it was previously saved as a Number
    if (accountsSnap.empty) {
      accountsSnap = await db
        .collection('instagram_accounts')
        .where('ig_user_id', '==', Number(igUserId))
        .limit(1)
        .get();
    }

    // Fallback: check ig_user_id_token (IGSID from token exchange)
    // The webhook uses IGSID which may differ from the app-scoped ID from /me
    if (accountsSnap.empty) {
      accountsSnap = await db
        .collection('instagram_accounts')
        .where('ig_user_id_token', '==', igUserId)
        .limit(1)
        .get();
    }

    if (accountsSnap.empty) {
      console.log(`[Auto-DM] No connected account found for IG user ${igUserId}`);
      return;
    }

    const accountDoc = accountsSnap.docs[0];
    const accountData = accountDoc.data();
    const creatorUid = accountData.uid;
    const accessToken = accountData.access_token;

    // Check if token is expired
    if (accountData.token_expires_at && accountData.token_expires_at < Date.now()) {
      console.warn(`[Auto-DM] Token expired for ${accountData.username}. Skipping.`);
      return;
    }

    // 2. Fetch enabled rules for this creator
    const rulesSnap = await db
      .collection('instagram_rules')
      .where('creator_id', '==', creatorUid)
      .where('enabled', '==', true)
      .get();

    if (rulesSnap.empty) {
      console.log(`[Auto-DM] No enabled rules for creator ${creatorUid}`);
      return;
    }

    const rules: AutoDMRule[] = rulesSnap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<AutoDMRule, 'id'>),
    }));

    // 3. Match against rules
    const matchedRule = matchMessageToRule(messageText, rules);

    if (!matchedRule) {
      console.log(`[Auto-DM] No rule matched for message: "${messageText}"`);
      return;
    }

    console.log(
      `[Auto-DM] Rule matched! keyword="${matchedRule.keyword}" (${matchedRule.match_type}) → sending reply`
    );

    // 4. Send the auto-reply
    const result = await sendInstagramReply(accessToken, senderId, matchedRule.reply);

    if (result.success) {
      console.log(`[Auto-DM] Reply sent successfully (messageId: ${result.messageId})`);

      // 5. Log the auto-reply to Firestore for analytics
      await db.collection('instagram_dm_logs').add({
        creator_id: creatorUid,
        ig_user_id: igUserId,
        sender_id: senderId,
        incoming_message: messageText,
        matched_rule_id: matchedRule.id,
        matched_keyword: matchedRule.keyword,
        reply_sent: matchedRule.reply,
        message_id: result.messageId,
        timestamp: Date.now(),
      });
    } else {
      console.error(`[Auto-DM] Failed to send reply: ${result.error}`);
    }
  } catch (err: any) {
    console.error('[Auto-DM] Error in processIncomingMessage:', err);
  }
}

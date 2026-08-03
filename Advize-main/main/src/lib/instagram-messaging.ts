// ── Instagram Messaging Utilities ─────────────────────────────────────────────
// Keyword matching engine + Instagram Graph API message sender for Auto-DM.

export type MatchType = 'exact' | 'contains' | 'starts_with';

export interface AutoDMRule {
  id: string;
  creator_id: string;
  keyword: string;
  match_type: MatchType;
  reply: string;
  enabled: boolean;
  created_at: any;
}

/**
 * Check whether `messageText` matches a single rule's keyword
 * according to its match_type. Case-insensitive.
 */
export function doesMessageMatchRule(
  messageText: string,
  rule: Pick<AutoDMRule, 'keyword' | 'match_type'>
): boolean {
  const msg = messageText.toLowerCase().trim();
  const kw = rule.keyword.toLowerCase().trim();

  if (!msg || !kw) return false;

  switch (rule.match_type) {
    case 'exact':
      return msg === kw;
    case 'contains':
      return msg.includes(kw);
    case 'starts_with':
      return msg.startsWith(kw);
    default:
      return false;
  }
}

/**
 * Given a message and an ordered array of rules, return the first matching
 * rule (oldest first). Returns `null` when no rule matches.
 */
export function matchMessageToRule(
  messageText: string,
  rules: AutoDMRule[]
): AutoDMRule | null {
  for (const rule of rules) {
    if (rule.enabled && doesMessageMatchRule(messageText, rule)) {
      return rule;
    }
  }
  return null;
}

/**
 * Send a text message to an Instagram user via the Instagram Graph API.
 *
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging
 */
export async function sendInstagramReply(
  accessToken: string,
  recipientId: string,
  messageText: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const res = await fetch(
      `https://graph.instagram.com/v21.0/me/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: messageText },
        }),
      }
    );

    if (!res.ok) {
      const errBody = await res.text();
      console.error('[Auto-DM] Instagram Send failed:', res.status, errBody);
      return { success: false, error: errBody };
    }

    const data = await res.json();
    return { success: true, messageId: data.message_id };
  } catch (err: any) {
    console.error('[Auto-DM] Instagram Send exception:', err);
    return { success: false, error: err.message };
  }
}

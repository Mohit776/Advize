import { type Firestore } from 'firebase-admin/firestore';

/**
 * Converts a display name into a URL-safe lowercase slug.
 * e.g. "Gaurav Kumar" → "gaurav_kumar"
 */
export function generateSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')   // remove non-word chars (except spaces & hyphens)
    .replace(/[\s-]+/g, '_')    // spaces/hyphens → underscore
    .replace(/^_+|_+$/g, '')    // trim leading/trailing underscores
    .slice(0, 30);              // max 30 chars
}

/**
 * Ensures the slug is unique in the `usernames` collection.
 * If `gaurav_kumar` is taken by a *different* uid, tries `gaurav_kumar_2`, `_3`, etc.
 *
 * @param db      Admin Firestore instance
 * @param slug    Base slug to check
 * @param ownUid  UID of the creator who will own this username (skip if already theirs)
 * @returns       A unique slug that is safe to claim
 */
export async function ensureUniqueUsername(
  db: Firestore,
  slug: string,
  ownUid: string,
): Promise<string> {
  let candidate = slug;
  let suffix = 2;

  while (true) {
    const snap = await db.collection('usernames').doc(candidate).get();
    if (!snap.exists) {
      // Slot is free
      return candidate;
    }
    const existingUid = snap.data()?.uid;
    if (existingUid === ownUid) {
      // Already owned by this creator
      return candidate;
    }
    candidate = `${slug}_${suffix}`;
    suffix++;
  }
}

/**
 * Writes the username claim atomically.
 * - `users/{uid}.username` ← username
 * - `usernames/{username}` ← { uid }
 */
export async function claimUsername(
  db: Firestore,
  uid: string,
  username: string,
): Promise<void> {
  const batch = db.batch();
  batch.set(db.collection('users').doc(uid), { username }, { merge: true });
  batch.set(db.collection('usernames').doc(username), { uid });
  await batch.commit();
}

/**
 * Resolves a profile slug (username OR uid) to the canonical uid.
 * 1. Checks `usernames/{slug}` first (fast path)
 * 2. Falls back to treating slug as a UID directly (backward compat)
 *
 * Returns `null` only if neither lookup finds a user.
 */
export async function resolveProfileSlug(
  db: Firestore,
  slug: string,
): Promise<{ uid: string; isUsername: boolean } | null> {
  // 1. Try username lookup
  const usernameSnap = await db.collection('usernames').doc(slug).get();
  if (usernameSnap.exists) {
    const uid = usernameSnap.data()?.uid as string | undefined;
    if (uid) return { uid, isUsername: true };
  }

  // 2. Fall back to UID — check user document exists
  const userSnap = await db.collection('users').doc(slug).get();
  if (userSnap.exists) {
    return { uid: slug, isUsername: false };
  }

  return null;
}

import {
  Firestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
  serverTimestamp,
  doc,
  getDoc,
  runTransaction,
  onSnapshot,
  deleteDoc,
  Timestamp,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { FirebaseStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FeedPost {
  id: string;
  authorId: string;
  authorRole: 'creator' | 'business';
  authorName: string;
  authorAvatar?: string;
  authorUsername?: string;    // slug/username, used for pretty profile URLs
  title?: string;
  tags?: string[];
  targetAge?: string;
  content: string;
  imageUrl?: string;
  likeCount: number;
  commentCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FeedComment {
  id: string;
  authorId: string;
  authorRole: 'creator' | 'business';
  authorName: string;
  authorAvatar?: string;
  text: string;
  createdAt: Timestamp;
}

export interface CreatePostInput {
  authorId: string;
  authorRole: 'creator' | 'business';
  authorName: string;
  authorAvatar?: string;
  authorUsername?: string;
  title?: string;
  tags?: string[];
  targetAge?: string;
  content: string;
  imageFile?: File;
}

export interface CreateCommentInput {
  authorId: string;
  authorRole: 'creator' | 'business';
  authorName: string;
  authorAvatar?: string;
  text: string;
}

// ─── Post Operations ──────────────────────────────────────────────────────────

/**
 * Upload an image to Firebase Storage and return its download URL.
 */
async function uploadPostImage(storage: FirebaseStorage, file: File, postId: string): Promise<string> {
  const storageRef = ref(storage, `feed/${postId}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

/**
 * Create a new feed post (with optional image upload).
 */
export async function createPost(
  firestore: Firestore,
  storage: FirebaseStorage,
  input: CreatePostInput
): Promise<string> {
  const postsRef = collection(firestore, 'posts');

  // Create post doc first (to get the ID for Storage path)
  const docRef = await addDoc(postsRef, {
    authorId: input.authorId,
    authorRole: input.authorRole,
    authorName: input.authorName,
    authorAvatar: input.authorAvatar ?? null,
    authorUsername: input.authorUsername ?? null,
    title: input.title?.trim() || null,
    tags: input.tags ?? [],
    targetAge: input.targetAge?.trim() || null,
    content: input.content,
    imageUrl: null,
    likeCount: 0,
    commentCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // If there's an image, upload and update the doc
  if (input.imageFile) {
    const imageUrl = await uploadPostImage(storage, input.imageFile, docRef.id);
    await updateDoc(docRef, { imageUrl });
  }

  return docRef.id;
}

/**
 * Fetch a paginated list of posts, newest first.
 * Pass `cursor` (last DocumentSnapshot) for pagination.
 */
export async function getPosts(
  firestore: Firestore,
  pageLimit = 10,
  cursor?: DocumentSnapshot
): Promise<{ posts: FeedPost[]; lastDoc: DocumentSnapshot | null }> {
  const postsRef = collection(firestore, 'posts');

  let q = query(postsRef, orderBy('createdAt', 'desc'), limit(pageLimit));
  if (cursor) {
    q = query(postsRef, orderBy('createdAt', 'desc'), startAfter(cursor), limit(pageLimit));
  }

  const snapshot = await getDocs(q);
  const posts: FeedPost[] = snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<FeedPost, 'id'>),
  }));

  const lastDoc = snapshot.docs[snapshot.docs.length - 1] ?? null;
  return { posts, lastDoc };
}

/**
 * Score and re-rank posts using a blended Interest + Freshness signal.
 *
 * Formula (weights configurable):
 *   score = INTEREST_WEIGHT * interestScore + FRESHNESS_WEIGHT * freshnessScore
 *
 * interestScore  — Jaccard similarity between post tags and user interests (0–1).
 *                  Falls back to 0 when either set is empty (pure freshness mode).
 * freshnessScore — Exponential decay: 1 / (1 + ageHours / HALF_LIFE_HOURS)
 *                  A 6-hour-old post scores ~0.5; a 24-hour post ~0.2.
 *
 * When userInterests is empty the function returns posts sorted purely by
 * Firestore's createdAt DESC (no change from the default behaviour).
 */
const INTEREST_WEIGHT = 0.8;
const FRESHNESS_WEIGHT = 0.2;
const HALF_LIFE_HOURS = 6; // freshness halves every 6 hours

export function scorePosts(
  posts: FeedPost[],
  userInterests: string[]   // user's categories / interest tags (lowercase-normalised)
): FeedPost[] {
  const interestSet = new Set(userInterests.map((i) => i.toLowerCase()));
  const hasInterests = interestSet.size > 0;

  const now = Date.now();

  const scored = posts.map((post) => {
    // ── Freshness ─────────────────────────────────────────────────────────────
    const createdMs =
      post.createdAt instanceof Timestamp
        ? post.createdAt.toMillis()
        : (post.createdAt as unknown as { seconds: number }).seconds * 1000;
    const ageHours = (now - createdMs) / (1000 * 60 * 60);
    const freshnessScore = 1 / (1 + ageHours / HALF_LIFE_HOURS);

    // ── Interest (Jaccard) ────────────────────────────────────────────────────
    let interestScore = 0;
    if (hasInterests && post.tags && post.tags.length > 0) {
      const postTagSet = new Set(post.tags.map((t) => t.toLowerCase()));
      const intersection = [...postTagSet].filter((t) => interestSet.has(t)).length;
      const union = new Set([...postTagSet, ...interestSet]).size;
      interestScore = intersection / union;
    }

    const score = hasInterests
      ? INTEREST_WEIGHT * interestScore + FRESHNESS_WEIGHT * freshnessScore
      : freshnessScore; // pure freshness fallback

    return { post, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map(({ post }) => post);
}

/**
 * Delete a post by ID (author only — enforced by Firestore rules).
 */
export async function deletePost(firestore: Firestore, postId: string): Promise<void> {
  await deleteDoc(doc(firestore, 'posts', postId));
}

// ─── Like Operations ──────────────────────────────────────────────────────────

/**
 * Check if a user has liked a post.
 */
export async function hasUserLiked(
  firestore: Firestore,
  postId: string,
  userId: string
): Promise<boolean> {
  const likeRef = doc(firestore, 'posts', postId, 'likes', userId);
  const likeDoc = await getDoc(likeRef);
  return likeDoc.exists();
}

/**
 * Batch-check which posts in `postIds` the given user has liked.
 * Returns a Set of postIds that the user has liked.
 * Uses parallel getDoc calls (one per post) — far faster than sequential,
 * and replaces N separate hasUserLiked() calls with a single Promise.all.
 */
export async function batchGetLikedPostIds(
  firestore: Firestore,
  userId: string,
  postIds: string[]
): Promise<Set<string>> {
  if (!postIds.length) return new Set();
  const likeDocs = await Promise.all(
    postIds.map((postId) => getDoc(doc(firestore, 'posts', postId, 'likes', userId)))
  );
  const liked = new Set<string>();
  likeDocs.forEach((snap, i) => {
    if (snap.exists()) liked.add(postIds[i]);
  });
  return liked;
}


/**
 * Toggle like on a post. Uses a transaction to keep the likeCount accurate.
 * Returns the new liked state.
 */
export async function toggleLike(
  firestore: Firestore,
  postId: string,
  userId: string
): Promise<boolean> {
  const postRef = doc(firestore, 'posts', postId);
  const likeRef = doc(firestore, 'posts', postId, 'likes', userId);

  let nowLiked = false;
  await runTransaction(firestore, async (transaction) => {
    const likeDoc = await transaction.get(likeRef);
    if (likeDoc.exists()) {
      // Unlike
      transaction.delete(likeRef);
      transaction.update(postRef, { likeCount: increment(-1) });
      nowLiked = false;
    } else {
      // Like
      transaction.set(likeRef, { likedAt: serverTimestamp() });
      transaction.update(postRef, { likeCount: increment(1) });
      nowLiked = true;
    }
  });

  return nowLiked;
}

// ─── Comment Operations ───────────────────────────────────────────────────────

/**
 * Add a comment to a post.
 */
export async function addComment(
  firestore: Firestore,
  postId: string,
  input: CreateCommentInput
): Promise<string> {
  const commentsRef = collection(firestore, 'posts', postId, 'comments');
  const postRef = doc(firestore, 'posts', postId);

  const commentDoc = await addDoc(commentsRef, {
    authorId: input.authorId,
    authorRole: input.authorRole,
    authorName: input.authorName,
    authorAvatar: input.authorAvatar ?? null,
    text: input.text,
    createdAt: serverTimestamp(),
  });

  // Increment comment count on the post
  await updateDoc(postRef, { commentCount: increment(1) });

  return commentDoc.id;
}

/**
 * Delete a comment (author only — enforced by Firestore rules).
 * Also decrements the commentCount on the parent post.
 */
export async function deleteComment(
  firestore: Firestore,
  postId: string,
  commentId: string
): Promise<void> {
  const commentRef = doc(firestore, 'posts', postId, 'comments', commentId);
  const postRef = doc(firestore, 'posts', postId);

  await deleteDoc(commentRef);
  await updateDoc(postRef, { commentCount: increment(-1) });
}

/**
 * Subscribe to real-time comments for a post.
 * Returns an unsubscribe function.
 */
export function subscribeToComments(
  firestore: Firestore,
  postId: string,
  callback: (comments: FeedComment[]) => void
): () => void {
  const commentsRef = collection(firestore, 'posts', postId, 'comments');
  const q = query(commentsRef, orderBy('createdAt', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const comments: FeedComment[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<FeedComment, 'id'>),
    }));
    callback(comments);
  });
}

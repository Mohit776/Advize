import { Firestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { Notification } from '@/lib/types';

type NotificationPayload = Omit<Notification, 'id' | 'createdAt' | 'isRead'> & {
  campaignId?: string;
  campaignName?: string;
};

/**
 * Writes a notification document to `users/{userId}/notifications`.
 *
 * Always sets `isRead: false` and `createdAt: serverTimestamp()` automatically.
 * Returns the Promise so callers can await if needed, but it is safe to fire-and-forget.
 */
export function sendNotification(
  firestore: Firestore,
  userId: string,
  payload: NotificationPayload,
): Promise<any> {
  const notificationsCol = collection(firestore, `users/${userId}/notifications`);
  return addDoc(notificationsCol, {
    ...payload,
    userId,
    isRead: false,
    createdAt: serverTimestamp(),
  }).catch((err) => {
    console.error('[sendNotification] Failed to write notification:', err);
  });
}

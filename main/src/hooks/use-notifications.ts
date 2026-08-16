'use client';

import { useCallback, useMemo } from 'react';
import { collection, doc, query, orderBy, updateDoc, writeBatch } from 'firebase/firestore';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import type { Notification } from '@/lib/types';

/**
 * Provides real-time notifications for the currently logged-in user.
 *
 * Returns:
 *  - `notifications` — ordered newest-first
 *  - `unreadCount`   — count of unread notifications
 *  - `markOneRead`   — marks a single notification as read
 *  - `markAllRead`   — marks every unread notification as read
 *  - `isLoading`     — true during initial fetch
 */
export function useNotifications() {
  const firestore = useFirestore();
  const { user } = useUser();

  const notificationsQuery = useMemoFirebase(
    () =>
      user
        ? query(
            collection(firestore, `users/${user.uid}/notifications`),
            orderBy('createdAt', 'desc'),
          )
        : null,
    [user, firestore],
  );

  const { data: notifications, isLoading } = useCollection<Notification>(notificationsQuery);

  const unreadCount = useMemo(
    () => notifications?.filter((n) => !n.isRead).length ?? 0,
    [notifications],
  );

  const markOneRead = useCallback(
    async (notificationId: string) => {
      if (!user) return;
      const notifRef = doc(firestore, `users/${user.uid}/notifications`, notificationId);
      await updateDoc(notifRef, { isRead: true }).catch((e) =>
        console.error('[useNotifications] markOneRead failed:', e),
      );
    },
    [user, firestore],
  );

  const markAllRead = useCallback(async () => {
    if (!user || !notifications) return;
    const unread = notifications.filter((n) => !n.isRead);
    if (unread.length === 0) return;

    const batch = writeBatch(firestore);
    unread.forEach((n) => {
      const ref = doc(firestore, `users/${user.uid}/notifications`, n.id);
      batch.update(ref, { isRead: true });
    });
    await batch.commit().catch((e) =>
      console.error('[useNotifications] markAllRead failed:', e),
    );
  }, [user, firestore, notifications]);

  return {
    notifications: notifications ?? [],
    unreadCount,
    isLoading,
    markOneRead,
    markAllRead,
  };
}

'use client';

import { useEffect } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirebaseApp, useUser, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

/**
 * Handles the full FCM lifecycle on the client:
 * 1. Requests browser notification permission
 * 2. Gets the FCM registration token (using the VAPID key)
 * 3. Persists the token to `users/{uid}/fcmToken` in Firestore
 * 4. Listens for foreground push messages and shows them as toasts
 *
 * Call this once at the app root via <FCMProvider />.
 */
export function useFCM() {
  const firebaseApp = useFirebaseApp();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    // Only run in browser with a logged-in user
    if (typeof window === 'undefined' || !user || !firebaseApp) return;

    // FCM requires a service worker
    if (!('serviceWorker' in navigator)) return;

    // Don't request if already denied
    if (Notification.permission === 'denied') return;

    let unsubscribeForeground: (() => void) | null = null;

    const initFCM = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        // Register the FCM-specific service worker
        const swRegistration = await navigator.serviceWorker.register(
          '/firebase-messaging-sw.js',
          { scope: '/' }
        );

        const messaging = getMessaging(firebaseApp);

        const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;
        if (!vapidKey) {
          console.warn('[useFCM] NEXT_PUBLIC_FCM_VAPID_KEY is not set. Push notifications will not work.');
          return;
        }

        const token = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: swRegistration,
        });

        if (!token) {
          console.warn('[useFCM] Could not get FCM token.');
          return;
        }

        // Persist the token so the Cloud Function can send push to this device
        const userRef = doc(firestore, 'users', user.uid);
        await updateDoc(userRef, { fcmToken: token });

        // Listen for foreground messages (tab is open and focused)
        unsubscribeForeground = onMessage(messaging, (payload) => {
          const title = payload.notification?.title || 'Advize';
          const body = payload.notification?.body || 'You have a new notification.';
          toast({ title, description: body });
        });
      } catch (err) {
        console.error('[useFCM] Initialization error:', err);
      }
    };

    initFCM();

    return () => {
      if (unsubscribeForeground) unsubscribeForeground();
    };
  }, [user, firebaseApp, firestore, toast]);
}

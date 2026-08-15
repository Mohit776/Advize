'use client';

import { useFCM } from '@/hooks/use-fcm';

/**
 * Mounts the FCM hook globally so push notification permission is requested
 * and the FCM token is registered as soon as the user logs in.
 *
 * Renders nothing — purely a side-effect component.
 * Place inside <FirebaseClientProvider> in the root layout.
 */
export function FCMProvider() {
  useFCM();
  return null;
}

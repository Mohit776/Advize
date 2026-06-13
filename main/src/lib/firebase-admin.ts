import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

/**
 * Shared Firebase Admin SDK initialisation (server-side only).
 * 
 * Re-uses an existing app if one has already been initialised in this
 * process to avoid the "Firebase App named '[DEFAULT]' already exists" error.
 */
function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export function getAdminFirestore(): Firestore {
  getAdminApp(); // ensure initialised
  return getFirestore();
}

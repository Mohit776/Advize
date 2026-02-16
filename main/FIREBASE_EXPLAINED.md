# How Firebase Works in Advize

This document explains the Firebase integration in the Advize project.

## 1. Initialization & Configuration

### **Config (`src/firebase/config.ts`)**
- Stores your Firebase project credentials (API Key, Auth Domain, Project ID, etc.).
- These values are typically loaded from environment variables (`.env`).

### **Initialization (`src/firebase/index.ts`)**
- **`initializeFirebase()`**: This function initializes the Firebase App.
- It enables **offline persistence** for Firestore (`persistentLocalCache`), meaning your app works faster and can function without an internet connection.
- It exports the initialized services: `auth`, `firestore`, and `storage`.

## 2. Context Provider (`src/firebase/provider.tsx`)

To make Firebase available throughout your Next.js app, we use a React Context called `FirebaseProvider`.

- **`FirebaseProvider` Component**:
  - Wraps your entire application (in `src/app/layout.tsx`).
  - Listens for **Authentication State Changes** (`onAuthStateChanged`).
  - Automatically fetches the user's **Profile Data** (like 'role', 'name') from Firestore when they log in.
  - Exposes `user`, `userProfile`, `auth`, `firestore` to any component that needs them.

- **`useFirebase()` Hook**: Use this to access the context values.
- **`useUser()` Hook**: A shortcut to get the current `user` and `userProfile`.

## 3. Custom Hooks (Making Life Easier)

We have created custom hooks to simplify data fetching.

### **`useCollection` (`src/firebase/firestore/use-collection.tsx`)**
- **Purpose**: Fetch a list of documents (e.g., "All Campaigns").
- **Real-time**: It listens for updates. If data changes in the database, the app updates instantly.
- **Safety**: Handles permission errors gracefully.

### **`useDoc` (`src/firebase/firestore/use-doc.tsx`)**
- **Purpose**: Fetch a single document (e.g., "Campaign ID 123").
- **Real-time**: Also listens for live updates.

### **Non-Blocking Updates (`src/firebase/non-blocking-updates.tsx`)**
- **Functions**: `setDocumentNonBlocking`, `updateDocumentNonBlocking`, etc.
- **Why?**: Standard Firebase writes wait for the network. These functions update the UI immediately (optimistic UI) and sync with the server in the background.

## 4. Security Rules (`firestore.rules`)

This file defines **who** can do **what**.
- **Users**: Can only edit their own profile.
- **Campaigns**: Anyone can read basic info, but only the creator/business can edit.
- **Messages**: Only members of a group can read/write messages.

## 5. Error Handling (`src/firebase/error-emitter.ts`)

- If a user tries to do something they aren't allowed to (Permission Error), the app catches it globally.
- `FirebaseErrorListener` displays a helpful toast message to the user/developer.

## Summary of Flow

1. **App Starts** -> `layout.tsx` mounts `FirebaseClientProvider`.
2. **Provider Init** -> Initializes Firebase App & Firestore with Cache.
3. **User Logs In** -> `provider.tsx` detects user -> fetches Profile from `users` collection.
4. **Data Fetching** -> Components use `useCollection('campaigns')` -> Connects to Firestore -> Returns data.
5. **Writes** -> `setDocumentNonBlocking` -> Updates local cache immediately -> Syncs to Cloud.

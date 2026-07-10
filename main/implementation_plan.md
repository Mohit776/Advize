# Firebase HTTP-Only Session Cookie Authentication

## Overview

Replace the client-side `useUser()` + `useEffect` route guards with Next.js **middleware** that reads an HTTP-only session cookie verified by the Firebase Admin SDK. This eliminates the auth loading flash on protected pages and improves security — the session cookie is never accessible to JavaScript.

The key design principle is **additive, not replacing**: the existing Firebase Client SDK (`onAuthStateChanged`) continues to work for UI state (user avatar in header, etc.). The cookie is used only for **redirects at the edge**.

---

## Architecture

```
User logs in (client SDK) → Get ID token → POST /api/auth/session → Set HTTP-only cookie
                                                                          ↓
Next.js Middleware reads cookie → Verifies with Admin SDK → Allow or Redirect
                                                                          ↓
User logs out → POST /api/auth/logout → Clear cookie → Redirect to /
```

---

## Open Questions

> [!IMPORTANT]
> **Session duration**: Firebase recommends a max of 14 days for session cookies. I'll default to **5 days** (432,000 seconds), which matches typical "stay logged in" UX without being excessively long. Is this acceptable?

> [!IMPORTANT]
> **Middleware matcher scope**: I plan to protect the following routes with redirects. Please confirm or add any you want to add/remove:
> - **Authenticated → public pages redirect to `/feed`**: `/`, `/login`, `/signup`, `/forgot-password`
> - **Unauthenticated → redirect to `/`**: `/feed`, `/notifications`, `/settings`, `/creator/*`, `/business/*`, `/post/*`

> [!WARNING]
> **Production users**: Existing logged-in users will NOT be automatically logged out. However, they **will not have a session cookie** yet and will be redirected to `/login` the first time they visit a protected route after this change. They just need to log in once for the cookie to be set. If this is unacceptable, we can add a grace-period fallback.

---

## Proposed Changes

### Session Cookie API Routes

#### [NEW] [route.ts](file:///d:/Projects/Advize/main/src/app/api/auth/session/route.ts)
- `POST`: Receives a Firebase ID token from the client, calls `adminAuth.createSessionCookie()`, and sets it as an HTTP-only, `SameSite=Strict`, `Secure` cookie.
- Returns `{ status: 'ok' }`.

#### [NEW] [route.ts](file:///d:/Projects/Advize/main/src/app/api/auth/logout/route.ts)
- `POST`: Clears the session cookie by setting `maxAge=0`.
- Returns `{ status: 'ok' }`.

---

### Firebase Admin Auth Helper

#### [MODIFY] [firebase-admin.ts](file:///d:/Projects/Advize/main/src/lib/firebase-admin.ts)
- Export a `getAdminAuth()` function (similar to existing `getAdminFirestore()`) to provide the `Auth` service for verifying and creating session cookies.

---

### Next.js Middleware

#### [NEW] [middleware.ts](file:///d:/Projects/Advize/main/src/middleware.ts)
- Runs on Edge Runtime before every matched request.
- Reads `__session` cookie.
- If cookie exists: calls `adminAuth.verifySessionCookie(cookie, true)` (with `checkRevoked: true`).
  - If valid & user is on a public-only page (`/`, `/login`, `/signup`): redirect to `/feed`.
  - If valid: allow through.
- If cookie missing or invalid:
  - If user is on a protected page: redirect to `/login`.
  - Otherwise: allow through (public pages).
- **Matcher**: excludes `_next/static`, `_next/image`, `api` routes, and `favicon`.

> [!WARNING]
> The Firebase Admin SDK cannot run on the Edge Runtime. The middleware will use the `firebase-admin` package via a **Node.js runtime** (set `export const runtime = 'nodejs'` in middleware, or use a pattern where middleware calls an internal API route for verification). The cleanest approach is to use the `firebase-admin` with `export const runtime = 'nodejs'` in the middleware file itself — Next.js supports this via `experimental.serverComponentsExternalPackages`.

---

### Login Flow Update

#### [MODIFY] [page.tsx](file:///d:/Projects/Advize/main/src/app/login/page.tsx)
- After `signInWithEmailAndPassword` succeeds, get the ID token: `await userCredential.user.getIdToken()`.
- `POST /api/auth/session` with the token.
- Proceed with the existing redirect logic (the cookie will now be set for middleware to use).

---

### Logout Flow Update

#### [MODIFY] [public-header.tsx](file:///d:/Projects/Advize/main/src/components/layout/public-header.tsx)
- In `handleLogout`: after `auth.signOut()`, also `POST /api/auth/logout` to clear the session cookie.
- Then redirect to `/`.

---

### Route Guard Simplification

#### [MODIFY] [layout.tsx](file:///d:/Projects/Advize/main/src/app/feed/layout.tsx)
- Remove the `useUser()` + `useEffect` redirect guard and the loading spinner. Middleware now handles this at the edge before the page renders.
- Keep the structural JSX layout.

#### [MODIFY] [page.tsx](file:///d:/Projects/Advize/main/src/app/page.tsx)
- Remove the `useUser()` + `useEffect` redirect for logged-in users. Middleware handles this.
- Remove unused imports (`useEffect`, `useUser`, `useRouter`).

---

### Next.js Config

#### [MODIFY] [next.config.mjs](file:///d:/Projects/Advize/main/next.config.mjs)
- Add `serverExternalPackages: ['firebase-admin']` to allow the Admin SDK to run in the Node.js middleware runtime.

---

## Verification Plan

### Automated Tests
- `npm run typecheck` — verify no TypeScript errors.

### Manual Verification
1. Visit `/feed` while logged out → should redirect to `/login`.
2. Log in → cookie should be set in DevTools (Application > Cookies), visible as `HttpOnly`.
3. Visit `/` while logged in → should redirect to `/feed` instantly (no flash).
4. Log out → cookie should be cleared, protected routes should redirect to `/login` again.
5. Refresh the page while logged in → no auth loading flash on protected pages.

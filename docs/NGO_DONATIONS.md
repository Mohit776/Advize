# NGO Donation Attribution

This feature adds an Advize-hosted donation flow for `NGO Support` campaigns. Donors pay the NGO directly using the NGO's configured UPI, QR, bank, or payment-link details; Advize only records and verifies the submitted transaction details.

## Flow

Creator referral -> `/donate/{campaignId}?ref={creatorId}` -> donor pays NGO -> donor submits transaction -> `donations` collection -> business verifies -> Cloud Function emails donor and NGO.

## Deployment

1. Deploy the Next.js app.
2. Deploy Firestore rules and indexes:
   `firebase deploy --only firestore:rules,firestore:indexes`
3. Deploy functions:
   `cd functions && npm install && npm run build && firebase deploy --only functions`
4. The donation email function reuses the existing `SMTP_HOST`, `SMTP_PORT`, `SMTP_APP_PASSWORD`, and `SMTP_MAIL` Firebase secrets.

## Important

- Advize does not process or hold donation funds.
- The public donation API uses Firebase Admin SDK and validates the campaign and creator referral server-side.
- Donor records are not publicly readable.
- A submitted donation is not considered verified until the NGO/business verifies it.

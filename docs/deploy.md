# Poker Wallet deployment guide

This guide prepares Poker Wallet for a public Vercel URL backed by Firebase Authentication and Cloud Firestore.

## 1. Firebase production setup

### Create a Firebase project

1. Go to the Firebase Console.
2. Select **Add project**.
3. Enter a project name, for example `poker-wallet-prod`.
4. Google Analytics is optional for the demo; enable it only if you want usage analytics.
5. Finish project creation.

### Add a Web app and get config values

1. In the Firebase project overview, choose **Add app** → **Web**.
2. Register the app with a nickname, for example `poker-wallet-web`.
3. Copy the Firebase web app config values into `.env.local`:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### Enable Anonymous Auth

1. Open **Build** → **Authentication**.
2. Click **Get started** if Auth is not enabled yet.
3. Go to **Sign-in method**.
4. Enable **Anonymous**.
5. Save.

### Create Cloud Firestore

1. Open **Build** → **Firestore Database**.
2. Click **Create database**.
3. Choose **Production mode**.
4. Select the closest region to your expected players.
5. Create the database.

### Deploy rules and indexes

Install/login to Firebase CLI locally, then run:

```bash
firebase login
firebase use --add
firebase deploy --only firestore:rules,firestore:indexes
```

The rules file is `firestore.rules`; indexes are in `firestore.indexes.json`.

## 2. Firestore indexes

Required query support:

- `tables` by `code`: single-field index, automatically managed by Firestore.
- `tables/{tableId}/actions` ordered by `timestamp desc`: single-field index, automatically managed by Firestore.
- `tables/{tableId}/players` ordered by `seatNumber`, then `joinedAt`: composite index in `firestore.indexes.json`.
- `tables/{tableId}/pots` ordered by `handNumber`, then `order`: composite index in `firestore.indexes.json`.

If Firestore reports a missing index during testing, use the console link it provides, then mirror it in `firestore.indexes.json`.

## 3. Vercel setup

1. Push this repository to GitHub.
2. Open Vercel and choose **Add New** → **Project**.
3. Import the GitHub repository.
4. Keep framework preset as **Next.js**.
5. Add all `NEXT_PUBLIC_FIREBASE_*` variables under **Environment Variables** for Production, Preview, and Development as needed.
6. Click **Deploy**.

### Redeploy

- Every push to the production branch triggers a production deployment.
- Pull requests create preview deployments.
- To force redeploy from Vercel UI, open the project deployment and choose **Redeploy**.

## 4. Build readiness commands

Run before deploying:

```bash
npm install
npm test
npm run typecheck
npm run build
```

## 5. Public demo checklist

Use `docs/smoke-testing.md` with 2-4 devices or separate browsers. At minimum validate:

- Create table.
- Join table by code.
- Start hand.
- Check/call/raise/fold/all-in.
- Reconnect a player.
- Resolve a side pot.
- Start next hand.

## 6. Troubleshooting

### Missing Firebase env variables

The app throws a friendly configuration error when `NEXT_PUBLIC_FIREBASE_*` values are missing. Confirm they exist in `.env.local` locally and in Vercel project settings for deployed environments.

### Anonymous Auth fails

Confirm Anonymous provider is enabled in Firebase Authentication.

### Firestore permission denied

Confirm `firestore.rules` has been deployed and the user is signed in anonymously. For table membership reads, the user must have a player document at `tables/{tableId}/players/{uid}`.

### Missing index

Firestore will show a console link when a query needs an index. Create it and update `firestore.indexes.json` so it is reproducible.

### Debug panel

The debug panel is off by default. Add `?debug=1` to a table URL during smoke testing.

## 7. Remaining production TODOs

- Harden Firestore rules after real-world demo feedback.
- Add real account identity if games need persistent user profiles.
- Add monitoring/analytics/error reporting.
- Add Playwright or Firebase Emulator e2e tests.
- Run final QA on iOS Safari and Android Chrome.

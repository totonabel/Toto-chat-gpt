# Poker Wallet

Poker Wallet is a mobile-first Next.js + TypeScript web app foundation for managing in-person poker games without physical chips. Cards are dealt and played physically at the table; this project focuses on virtual chip accounting and synchronized table state.

## Current scope

This foundation now includes a minimal player-only visual UI. The implemented layers are:

- A pure TypeScript poker wallet engine that can be tested without React, Firestore, or Auth.
- A Firebase adapter layer for anonymous Auth, Firestore references, CRUD helpers, realtime hooks, and transactional state changes.
- A simple mobile-first player UI for joining a table and acting from a phone.
- A leader UI for creating tables, managing players, controlling hands, resolving pots, and watching action history.

## Project structure

- `app/` — minimal Next.js App Router entry point.
- `components/` — reserved for future React components.
- `lib/engine/` — pure poker wallet rules engine.
- `lib/firebase/` — Firebase config, refs, schema, CRUD helpers, action logs, and Firestore transactions.
- `lib/hooks/` — realtime React hooks backed by Firestore `onSnapshot` subscriptions.
- `tests/` — unit tests and transaction simulations.

## Engine capabilities

The current engine supports seated players, dealer rotation, blinds, skipped broke/sitting-out/waiting players, check/call/raise/all-in/fold actions, side-pot calculation, tied-pot distribution, rebuys, late joins, and negative-money guards.

## Firebase transaction strategy

Firestore state-changing operations that read and then write table/player/pot state are centralized in `lib/firebase/transactions.ts` and use `runTransaction`. Each transaction rereads the table and relevant documents before writing so Firestore can retry on concurrent updates.

Concurrency protections include:

- Seat claims use an internal deterministic seat lock document at `tables/{tableId}/seats/{seatNumber}` so two players cannot occupy the same seat.
- Player actions validate `currentTurnSeat` inside the transaction, preventing out-of-turn calls or raises.
- Folded, broke, and all-in players are rejected before action writes.
- Pot resolution checks the `distributed` flag inside the transaction, preventing double payouts.
- Reloads require the leader and only allow active-hand reloads for broke players, returning them to `waitingNextHand`.
- Disconnects update `connected`/`lastSeenAt`; reconnects reuse the player document keyed by `uid` and do not duplicate the player.


## Player UI flow

The first UI pass is intentionally player-only and mobile-first:

1. `/` introduces Poker Wallet and links to the join flow.
2. `/join` lets a player enter a table code, choose a display name, pick an available seat, and join the table.
3. `/table/{tableId}/player` shows the realtime player view with pot, stack, amount to call, highest bet, turn status, a circular poker table, chip-based raise preparation, and the bottom action bar.

The UI consumes the existing Firebase hooks and transaction helpers. It does not change the pure engine rules or the transaction layer.


## Leader UI flow

The leader flow is also mobile-first and realtime:

1. `/create` signs in anonymously, creates a Firestore table, marks the creator as `isLeader`, and redirects to `/table/{tableId}/leader`.
2. The leader dashboard shows the table code, status, connected players, hand metadata, player management controls, pot resolution, and action history.
3. Leader actions call transaction helpers so seat moves, reloads, hand control, and payouts stay protected by Firestore transactions.


## Robustness and recovery

The final integration pass adds:

- Local session persistence for the last table, player id, name, seat, and leader role.
- Automatic role routing through `/table/{tableId}` so leaders return to `/leader` and players return to `/player`.
- Reconnecting banners, snapshot/auth retry, toast notifications, haptic feedback hooks, and pending-action guards.
- Additional transaction guards for showdown-only pot resolution and completed betting before round/hand advancement.


## Smoke testing and deploy readiness

Manual smoke testing steps live in `docs/smoke-testing.md`. Temporary debug tooling is available with `?debug=1` on table routes and includes current turn, round, eligible pot players, snapshot label, and a copy-state button.

Current readiness status: ready for Firebase/Vercel smoke testing once dependencies can be installed and real Firebase environment variables are configured. Remaining production TODOs are security rules, real user accounts, analytics/monitoring, and a final browser-device QA pass.


## Deployment

Production setup instructions live in `docs/deploy.md`, including Firebase project creation, Anonymous Auth, Firestore production mode, Vercel environment variables, redeploys, indexes, troubleshooting, and remaining production TODOs.

Firestore deploy files:

- `firestore.rules` — minimal demo security rules.
- `firestore.indexes.json` — composite indexes for players and pots.
- `firebase.json` — Firebase CLI config for rules/index deploy.

## Environment variables

Copy `.env.example` to `.env.local` and fill in the `NEXT_PUBLIC_FIREBASE_*` values from the Firebase web app config.

## Commands

```bash
npm test
```

The test command compiles the engine and simulations with TypeScript, then runs the generated JavaScript harnesses with Node.js.

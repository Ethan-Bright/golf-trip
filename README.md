# Golf Trip Leaderboard

A mobile-friendly leaderboard for casual golf tournaments. Players can create matches, enter scores across multiple formats (match play, Stableford, wolf, etc.), view stats, and share scorecards. The app runs on Vite + React with Firebase for auth/data and Tailwind for styling.

## Stack

- **Frontend:** React 19, Vite, TailwindCSS, React Router
- **State/Context:** Custom React contexts for auth, theme, and tournament selection
- **Backend/DB:** Firebase (Auth/Firestore/Storage) + optional seed script using `firebase-admin`
- **Tooling:** ESLint, PostCSS, html2canvas for scorecard sharing

## Prerequisites

- Node.js 18+
- npm 9+
- Firebase project (with Firestore + Storage enabled)
- Optional: Cloudinary account if you want to keep the current image upload flow

## Getting Started

```bash
git clone <repo>
cd golf-trip
npm install
cp .env.example .env
# fill in Firebase + other secrets inside .env
npm run dev
```

Vite will start on http://localhost:5173 by default.

## Environment Variables

Copy `.env.example` to `.env` and populate:

| Variable | Description |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender id |
| `VITE_FIREBASE_APP_ID` | Firebase app id |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | (optional) Path to service account JSON for the seed script |
| `SEED_TOURNAMENT_PASSWORD` | (optional) Override default tournament password when seeding |

## npm Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build |
| `npm run preview` | Preview local production build |
| `npm run lint` | Run ESLint across the repo |
| `npm run seed` | Seed Firestore with demo data (requires service account env) |

## Firestore Seeding

The `scripts/seedFirestore.js` script populates demo tournaments, teams, and games so you can explore the UI quickly.

```bash
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/serviceAccountKey.json npm run seed
# or use FIREBASE_SERVICE_ACCOUNT_JSON with inline JSON
```

Pass `--reset` to delete the demo docs before recreating them:

```bash
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/key.json node scripts/seedFirestore.js --reset
```

## Project Structure

```
src/
  components/       shared UI components & leaderboards
  context/          React context providers (auth, theme, tournament)
  data/             static course data
  pages/            route-level components
  hooks/            reusable hooks such as useModal
  lib/              scoring helpers / match format utilities
  utils/            misc helpers (shareScorecard, etc.)
```

## Linting & Formatting

Run `npm run lint` to check for common errors. The repo enforces hooks rules (exhaustive deps, hook order, etc.) and basic globals via ESLint. Add Prettier or editor integration as desired.

## Deployment

The project was bootstrapped with Vite’s SPA template, so `npm run build` emits a static bundle in `dist/`. Hosting options:

- Firebase Hosting
- Netlify / Vercel
- Any static host that supports SPA rewrites to `/index.html`

Ensure the production environment includes the `.env` values or uses your platform’s secret management to inject them at build time.

## Troubleshooting

- **Dark mode toggle doesn’t switch themes:** Confirm `tailwind.config.js` has `darkMode: "class"` and restart the dev server after changing it.
- **Seeding fails:** Verify your service account key path or `FIREBASE_SERVICE_ACCOUNT_JSON` value and that the Firestore rules allow writes from the Admin SDK.
- **Scorecard sharing broken in Safari:** Safari blocks `navigator.share` without HTTPS—fall back to the download option that automatically triggers if Web Share isn’t available.

Feel free to open issues/PRs with improvements or questions. Happy golfing! ⛳

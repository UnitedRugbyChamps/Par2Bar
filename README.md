# Tour Card

A golf tour scoring app for iPhone and Android: accounts, handicaps, courses,
games, tee times, live leaderboards, a Ryder Cup style team match, and push
notifications as scores come in. Built with Expo (React Native) and Firebase.

## What it does

- **Accounts**: sign up, sign in, sign out, password reset. Each player keeps
  a WHS handicap index and their notification settings.
- **Tours**: dates, location, time zone, a six-character invite code, organisers
  and members. Players don't need the app to be scored; members can claim their
  player when they join.
- **Handicaps**: WHS course handicap = Index × Slope ÷ 113 + (Course Rating − Par),
  per round and tee, with per-round overrides and allowances per game. Team
  handicaps for foursomes (50%) and scramble (35/15, 30/20/10, 25/20/15/10).
  Each player's index can be worked out automatically from finished rounds
  (adjusted gross capped at net double bogey, differentials, best N of the
  last 20).
- **Profiles**: profile picture, cover photo, bio, home club, affiliated or
  not, handicap, followers and following. Tabs for photo posts, round activity
  (every finished round posts itself) and lifetime stats: best and worst
  round, differentials, scoring mix and averages.
- **Hole stats** (optional while scoring): putts, tee shot left / fairway /
  right / short, sand shots, water, out of bounds, lost balls and other
  penalties. Scorecards show them; profiles and rounds show fairways, greens in
  regulation, putts and penalties.
- **Tour report**: honours and a penalties sheet (most birdies, birdie and
  bogey streaks, quadruple bogeys, three-putts, lost balls, missed the cut and
  more), plus sortable stats per player, four-ball, team and the whole tour,
  for one round or all of them. Shareable as text.
- **Cut**: a cut line (top N or top N% and ties) drawn on the final round's
  leaderboard of the headline competition.
- **Feed and stories**: photo posts with likes, 24-hour stories, and the
  rounds of everyone you follow.
- **Formats**: pick from a list (Stableford, medal, par/bogey, eclectic,
  skins, match play, Nassau, better ball, low/high, foursomes, Ryder Cup,
  scramble, Ambrose; more listed as coming soon). Clubs choose theirs and new
  tours start with them.
- **Clubs**: a society that runs a tour every year, with sponsors, a join code, its
  tours by year, an honours board (champion and cup winner each year),
  members and all-time records.
- **Courses**: add a course from its scorecard (tees with rating, slope, par and
  stroke index per hole). Worldwide course search turns on with a
  GolfCourseAPI key (see below).
- **Games** (any number at once): Stableford (points, or 36-a-round), stroke play
  gross or net, skins with carry-overs, scramble, match play, Nassau, low ball /
  high ball.
- **Team cup**: two teams, sessions of fourballs, foursomes or singles, live
  match status (2 UP thru 12, 3&2, halved), score and projection.
- **Rounds and tee times**: groups made automatically or by hand, 1st or 10th
  tee starts.
- **Scoring**: hole-by-hole entry for a whole group, shots received shown per
  player, running points; scorecards with circles for birdies and squares for bogeys.
- **Feed and notifications**: birdies and better, new leaders, cup match
  swings and results, round finished, every score from players you follow or
  your own group, and tee time reminders 30 minutes before you tee off. Each
  type can be switched on or off.

## Run it

```bash
npm install
npx expo start          # scan the QR code with Expo Go, or press w for web
npm test                # scoring engine and notification rules
npm run typecheck && npx expo lint
```

Without Firebase keys the app runs in **test mode**: accounts, tours and scores
are saved on the device, and notifications are shown locally. On the Tours tab
"Load two sample tours" adds two finished three-round tours to look around.

## Connect Firebase (shared data and push)

1. Create a Firebase project; enable Authentication → Email/Password, Firestore
   and Storage (profile pictures, covers, posts and stories).
2. Add a Web app in the Firebase console and copy its config into `.env`
   (see `.env.example`). The app switches to Firebase automatically.
3. Deploy the rules and functions (Blaze plan needed for functions):
   ```bash
   npm --prefix functions install
   npx firebase-tools deploy --only firestore,storage,functions,hosting
   ```
   Hosting serves the web app and `/p/<post>` share pages, which give shared
   posts a preview card in WhatsApp; set `EXPO_PUBLIC_SHARE_URL` to the site.
4. Push notifications go through Expo's push service. Run `npx eas-cli init`
   so the app has an EAS project id, then build a development or store build
   with `npx eas-cli build`. Optionally set `EXPO_ACCESS_TOKEN` for the functions.

## Worldwide courses

Set `EXPO_PUBLIC_GOLFCOURSE_API_KEY` (golfcourseapi.com) to search courses
worldwide; picking one saves it so everyone on the tour shares the same card.
`src/courses/golfcourseapi.ts` is the only file tied to that provider.

## Layout

- `src/core/` scoring engine, handicaps and notification rules. No React Native
  imports; shared with the Cloud Functions and tested with `node --test`.
- `src/backend/` the `Backend` interface with `offline.ts` (on-device) and
  `firebase.ts` implementations.
- `src/app/` screens (Expo Router).
- `functions/` Cloud Functions: feed items and pushes on every score, tee time
  reminders every five minutes.
- `firestore.rules` who can read and change what.

## Club website

The Par 2 Bar club website is a static page in `website/` (`index.html` plus `assets/`). Every push to the default branch that touches `website/` publishes it to GitHub Pages via `.github/workflows/website.yml`, at https://unitedrugbychamps.github.io/Par2Bar/. Pages must be set to **Settings → Pages → Source: GitHub Actions** once.

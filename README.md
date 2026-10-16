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
  player, running points; scorecards with birdie/bogey colouring.
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

1. Create a Firebase project; enable Authentication → Email/Password and Firestore.
2. Add a Web app in the Firebase console and copy its config into `.env`
   (see `.env.example`). The app switches to Firebase automatically.
3. Deploy the rules and functions (Blaze plan needed for functions):
   ```bash
   npm --prefix functions install
   npx firebase-tools deploy --only firestore,functions
   ```
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

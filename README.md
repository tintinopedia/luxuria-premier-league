# Luxuria Premier League (LPL) website

Dark-themed, real-time T20 league site. **Next.js 14 (App Router) + Tailwind** frontend, **Firebase** (Google Auth, Firestore, Storage) backend, deployed on **Vercel** from **GitHub**. Installable on Android as an app (PWA).

## What's inside

| Area | Route |
|---|---|
| Home: fixtures strip, live/last match, videos & photos carousels, latest 10 news | `/` |
| Match centre: Scorecard, Commentary, News, Videos, Photos | `/match/[id]` |
| Fixtures, tournament schedule + points table | `/schedule`, `/tournaments/[id]` |
| News, Videos, Photos, Players (+ profiles with stats, wagon zones, bowling lengths) | `/news`, `/videos`, `/photos`, `/players/[id]` |
| Google sign-up, profile onboarding, pending approval | `/profile/setup`, `/pending` |
| Scorer console ("Let's Score") | `/score`, `/score/[id]` |
| CMS: User Management, Roles, Role Permissions, Teams & Members, Tournaments & Matches, Content | `/cms/*` |

Super admin: **ahaan@tintinopedia.com** (set in `.env` and hard-coded in `firestore.rules` / `storage.rules`; change all three together).

## 1. Firebase setup (one time)

1. Create a project at https://console.firebase.google.com.
2. **Authentication** > Sign-in method > enable **Google**. Under Settings > Authorized domains, add your Vercel domain (e.g. `lpl.vercel.app`) and any custom domain.
3. **Firestore Database** > Create (production mode, region `asia-south1` Mumbai).
4. **Storage** > Get started. Note: new Storage buckets need the **Blaze (pay-as-you-go)** plan; the free quota covers a local league comfortably. Set a budget alert.
5. Project settings > Your apps > add a **Web app**, copy the config values.
6. Deploy rules and indexes:
   ```bash
   npm i -g firebase-tools
   firebase login
   firebase use --add          # pick your project
   firebase deploy --only firestore:rules,firestore:indexes,storage
   ```

## 2. Run locally

```bash
cp .env.example .env.local   # paste the Firebase config values
npm install
npm run dev                  # http://localhost:3000
```

## 3. GitHub + Vercel

```bash
git init && git add . && git commit -m "LPL website"
git branch -M main
git remote add origin https://github.com/<you>/luxuria-premier-league.git
git push -u origin main
```
On https://vercel.com: **Add New Project** > import the repo > add every `NEXT_PUBLIC_*` variable from `.env.example` > Deploy. Every push to `main` redeploys.

## 4. First-run checklist (as super admin)

1. Sign in with Google as ahaan@tintinopedia.com. The **CMS** tab appears.
2. **Roles**: create e.g. Player, Scorer, Media, League Admin.
3. **Role Permissions**: tick permissions per role (Scorer: Update/Edit/Delete Ball-by-Ball Score + Commentary; Media: Add Photos/Videos/News/Blogs).
4. Players sign up with Google, fill the profile, and wait. **User Management** > Review > assign at least one role > Approve.
5. **Teams & Members**: create teams, add players, mark Captain (C) and Wicket Keeper (WK).
6. **Tournaments**: create a tournament (name, overs, teams), then add matches (teams, date/time, venue).
7. On match day, users with the Scorer role see **Let's Score** in the header.

## Install on Android

Open the site in Chrome > tap **Install app** in the header (or menu ⋮ > *Install app / Add to Home screen*). It opens full-screen with its own icon. Requires HTTPS, which Vercel provides.

## How scoring works

Toss > pick bowler, two openers and striker > ball entry: Legit / No Ball / Wide, runs (0-7 buttons, 8+ manual), Player / Bye / Leg Bye, optional scoring zone (6-sector ground) and pitch length (Half Line, Length, Good Length, Yorker, Full Toss), wicket, commentary. Strike rotates automatically on odd runs and at over end; new bowler is prompted after every over and new batter after every wicket. Undo, Edit ball, Swap strike, End innings and End match (result + Player of the Match) are built in. Every ball is a Firestore document, so all viewers see updates live.

## Data model (Firestore)

- `users/{uid}` private account: status (`new` > `pending` > `approved`/`rejected`), roles, denormalised permissions
- `players/{id}` public player profile (created on approval, or by CMS for players without a login)
- `roles/{id}` name, description, permissions[], permissionsActive
- `teams`, `tournaments`, `matches/{id}` (+ `balls` subcollection), `news` (kind news/blog), `videos`, `photos`

## Notes

- Deleting a user in CMS removes their profile data; remove the Google login itself in Firebase Console > Authentication.
- Anyone holding "Approve Users" can assign any role, so give it only to trusted admins.
- Videos: YouTube links (unlisted is fine) are recommended over uploads to keep Storage costs near zero.

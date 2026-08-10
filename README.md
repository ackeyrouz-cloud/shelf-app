# Shelf — from this codebase to the App Store

This is a complete, working codebase: an Expo (React Native) app in `/app`
and a small backend in `/server` that keeps your Anthropic API key safe.
Below is every step from here to a live App Store listing, written for
someone who hasn't done this before.

---

## Part 1 — Accounts you need (do these first, they take time to process)

1. **Apple ID** — you likely already have one (same as iCloud/App Store login).
2. **Apple Developer Program** — go to developer.apple.com, sign up, pay
   $99/year. Approval can take a few hours to 2 days.
3. **Expo account** — free, sign up at expo.dev. This is what lets you build
   an iOS app without owning a Mac.
4. **Anthropic API key** — from console.anthropic.com, if you don't already
   have one. This powers the recipe generation.
5. **A backend host** — Render.com is the easiest free option for a small
   Node server like this one.

---

## Part 2 — Deploy the backend

The backend (`/server`) is what actually calls Claude — your API key lives
here, never inside the app.

1. Push the `/server` folder to a new GitHub repo (or the whole project,
   your choice).
2. Go to render.com → New → Web Service → connect your repo, set the root
   directory to `server`.
3. Build command: `npm install` — Start command: `npm start`
4. Under Environment, add `ANTHROPIC_API_KEY` with your real key.
5. Deploy. Render gives you a URL like `https://shelf-backend.onrender.com` —
   copy it.
6. Visit `https://your-url.onrender.com/health` in a browser — you should
   see `{"ok":true}`. If not, check Render's logs tab.

---

## Part 3 — Point the app at your backend

Open `/app/App.js` and find this line near the top:

```js
const API_BASE_URL = 'https://YOUR-BACKEND-URL.example.com';
```

Replace it with your real Render URL from Part 2.

---

## Part 4 — Add your app icon and splash screen

The app expects two images in `/app/assets/`:
- `icon.png` — 1024×1024px, no transparency, this is your App Store icon
- `splash.png` — shown briefly when the app opens
- `adaptive-icon.png` — for Android, 1024×1024px

If you don't have these designed yet, I can generate simple placeholder
versions that match Shelf's kraft-paper/stamped look — just ask.

---

## Part 5 — Install dependencies and test locally

On any computer (Mac, Windows, or Linux all work for this part):

```bash
cd app
npm install
npx expo start
```

This opens a QR code. Install the **Expo Go** app on your iPhone from the
App Store, scan the code, and Shelf will run live on your phone — this is
how you test before building the real thing.

---

## Part 6 — Build the real iOS app (no Mac needed)

```bash
npm install -g eas-cli
eas login
eas build:configure
```

This walks you through connecting to your Expo account and Apple Developer
account (it will ask for your Apple ID and handle the certificates for you
automatically — this used to be the hard part, EAS does it now).

Then:

```bash
eas build --platform ios
```

This builds in the cloud (takes ~15-20 min) and gives you a downloadable
`.ipa` file — no Mac required.

---

## Part 7 — Submit to the App Store

Once the build finishes:

```bash
eas submit --platform ios
```

This uploads your build to App Store Connect. Then:

1. Go to appstoreconnect.apple.com
2. Create a new app listing (name: Shelf, bundle ID: matches `app.json`)
3. Fill in: screenshots (take these from the Expo Go preview or the build),
   description, category (Food & Drink), privacy policy URL (required —
   even a simple one-page one; I can draft this for you)
4. Attach your build under "Build" section
5. Submit for review

Apple review typically takes 1-3 days. They'll email you if anything needs
fixing — usually minor (missing privacy policy details, etc.).

---

## Costs to expect

- Apple Developer Program: $99/year
- Backend hosting (Render free tier): $0, or ~$7/month for always-on
- Anthropic API usage: pay-per-use, roughly a few cents per recipe search —
  worth watching usage in the Anthropic console once real users are on it

---

## What to do next

If any step above is unclear when you get to it, come back and paste the
exact error or screen you're stuck on — that's easier to debug than
guessing in advance.

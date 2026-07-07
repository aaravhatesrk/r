# Rooted — Cultural Roots, Global Wellness

Class 12 RIDS group prototype.

## What this is

A working prototype for a **culturally-adaptive eco-fitness platform** that:

- Matches every workout to a local wellness heritage practice (Ayurveda in India,
  Temazcal traditions in Mexico, Shinrin-yoku/Ikigai in Japan, Pura Vida/Blue Zone
  living in Costa Rica) instead of treating fitness content as one-size-fits-all.
- Scores every workout with a transparent, auditable **Sustainability Quotient (SQ)**
  — a weighted 0–100 score built from gear choice, travel mode, workout setting and
  post-workout resource use, with a full category-by-category breakdown, a
  "biggest opportunity" swap recommendation, a comparison to the community average,
  and a trend sparkline across your last few results on this device.
- Runs a **Wellness Advisor**: describe an everyday health concern in plain language
  and get back the concerns it picked up on, a rough intensity read, a synthesis note
  when concerns commonly interact (e.g. stress and poor sleep), a today/this-week/
  when-to-seek-help action plan, and a matched, culturally-rooted practice from each
  region — with a clear "not medical advice" disclaimer and an urgent-care redirect
  for anything serious.
- Organizes a **Community Wellness Hub**: an in-house **Cultural Practice Library**
  (self-guided practices per country, written by the Rooted team) plus **Community
  Connect**, backed by a real account system and a real shared database (see below)
  so people with different Google accounts, on different devices, can create and join
  communities together. Rooted has no partnerships or affiliations with any outside
  organization — nothing on this site claims one.

Two separate standalone apps are linked from the home page and footer: **Athlyze**
(`performance-analyzer/`) for sports performance analytics, and **PitchIQ**
(`football-analyzer/`) for football skill and match analysis.

### Community Connect is backed by a real account system

Sign in with your actual Google account, hit **+ Create a Community**, and you get a
shareable invite link and a 6-character code. Anyone with their own Google account —
on their own device, anywhere — can open the link or enter the code, sign in, and join
instantly. Membership updates live: if someone else joins or leaves a community you're
in, you see it without refreshing.

**How it works:** the site uses [Firebase](https://firebase.google.com) — Firebase
Authentication for real Google sign-in, and Firestore (a real cloud database) to store
communities and their membership. There is no `localStorage` trick and no data encoded
into the invite link; the link just carries the community's short code, and the actual
community data is fetched live from Firestore. This means it works correctly the moment
it's deployed to a real URL, for any number of real users with real, different email
addresses — see **"Setting up real accounts & communities"** below to wire up the free
backend before you deploy.

### The SQ Prototype and Wellness Advisor are rule-based, not black boxes

Both tools are deliberately transparent — every input maps to a fixed, published value
so a judge or teammate can reproduce a result by hand — but the responses are built to
be specific to what you actually entered, not a fixed template:

- The **SQ Prototype** explains *why* each of your choices scored what it did, tells
  you the single highest-value swap available and how many points it's worth, shows
  how you compare to the community average and to your own last result on this device,
  and gives you a tier description explaining what that score range means in practice.
- The **Wellness Advisor** echoes back the specific words it matched in your
  description, gives a lexical (not clinical) intensity read, surfaces every concern
  it found — not just the top one — with a note on how commonly-paired concerns
  interact, and includes a concrete "try today / this week / when to see a
  professional" action plan alongside the cultural practice recommendation.

Neither tool is AI — both are transparent rule/keyword matching against a published
knowledge base in `js/data.js`, which is the point: the logic is auditable, not a
black box.

### Athlyze — a second, standalone site for sports performance analytics

`performance-analyzer/index.html` is a separate, self-contained app (own HTML/CSS/JS,
own `localStorage` key, no shared state with Rooted) for logging and analyzing sports
performance: pick a sport, log a metric (time, distance, weight, score — presets per
sport plus a fully custom option), and Athlyze tracks personal bests, computes a
trend line, and charts progress over time per sport/metric combo. It's linked from
Rooted's home page and footer (opens in a new tab) but works and can be hosted
entirely on its own — just open `performance-analyzer/index.html` directly, or serve
it the same way as the main site (see "Running it locally" below).

### PitchIQ — a third, standalone site for football skill & match analysis

`football-analyzer/index.html` is another separate, self-contained app (own HTML/CSS/JS,
own `localStorage` key, no shared state with Rooted or Athlyze) for reviewing football
technique and match moments: upload a video clip (it plays back locally in the browser
tab only — nothing is ever uploaded anywhere) or just describe a passage of play in
plain text, and PitchIQ matches what you tag or describe against an in-house knowledge
base of common technical, tactical and decision-making mistakes across 8 skill
categories (first touch, passing, dribbling, shooting, defending, positioning, decision
making, goalkeeping). Each match returns *why* the mistake tends to happen, a correction
cue, and a practice drill — then tracks tagged moments into saved sessions with a
progress report chart. Like the SQ Prototype and Wellness Advisor, all of this is
deliberately **rule-based keyword/dropdown matching, not computer vision** — there is no
model "watching" the video, which is stated plainly on the page itself so it's never
mistaken for real automated analysis.

PitchIQ also has a **Famous Match Analyzer** (a curated library of key moments from
World Cup, Champions League and other historic finals, each with coaching talking
points and a short clip playable on the page) and a **Coach AI** panel — a
conversational front end over the same rule-based mistake knowledge base, no API key
or backend required, so it works with zero setup like everything else on the site. It's
linked from Rooted's home page and footer (opens in a new tab) but works entirely on
its own — just open `football-analyzer/index.html` directly, or serve it the same way
as the main site.

No build step, no framework in any of the three apps besides Firebase's own SDK (loaded
via CDN `<script>` tags for Community Connect only) — everything else is plain HTML/CSS/JS.

## Running it locally

Just open `index.html` in any browser — double-click it, or from a terminal:

```bash
# Windows
start index.html

# macOS
open index.html
```

For the smoothest experience (some browsers restrict local file access for canvas
resizing, and Firebase sign-in popups behave better over http/https than file://),
serve it instead:

```bash
# Python 3 (built into most systems)
python -m http.server 8000
# then visit http://localhost:8000

# or, with Node installed
npx serve .
```

Community Connect will work on `localhost` once you've completed the Firebase setup
below — Firebase allows `localhost` by default, no extra configuration needed.

## Setting up real accounts & communities (Firebase)

Everything on the site works with **zero setup** except Community Connect, which needs
a backend so accounts and communities are real across different people and devices.
This takes about 5 minutes and is free for a project at this scale.

1. Go to **[console.firebase.google.com](https://console.firebase.google.com)** and
   create a project (any name).
2. **Build → Authentication → Get started → Sign-in method** → enable **Google**.
3. **Build → Firestore Database → Create database** → start in **production mode**
   (pick any region close to your users).
4. In **Firestore Database → Rules**, replace the default rules with the block below
   and click **Publish**:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /communities/{communityCode} {
         allow read: if request.auth != null;
         allow create: if request.auth != null
           && request.resource.data.ownerEmail == request.auth.token.email
           && request.resource.data.memberEmails == [request.auth.token.email];
         allow update: if request.auth != null
           && request.resource.data.diff(resource.data).affectedKeys().hasOnly(["members", "memberEmails"]);
         allow delete: if false;
       }
     }
   }
   ```

   This means: only signed-in users can read or write; you can only create a community
   naming yourself as the owner and sole starting member; updates can only touch the
   membership fields (join/leave), never rewrite the name, description or owner; and
   nothing can be deleted through the client.

5. **Project settings** (gear icon, top left) → **General** → scroll to **Your apps**
   → **Add app** → choose **Web** (`</>`) → register it (nickname doesn't matter) →
   copy the `firebaseConfig` object it shows you.
6. Paste those values into `js/firebase-config.js`, replacing the `YOUR_...`
   placeholders.
7. **Authentication → Settings → Authorized domains** → add the domain you deploy to
   (e.g. `your-project.vercel.app`). `localhost` is already allowed, so local testing
   works immediately.

Once `js/firebase-config.js` has real values, Community Connect switches on
automatically — until then, the Community Hub tab shows an on-page notice instead of
silently failing, and every other tab works normally regardless.

## Coach AI (PitchIQ)

Coach AI works with **zero setup** — no API key, no backend. It answers by matching your
question's wording against the same published mistake knowledge base as the Quick
Analyzer (`js/data.js`), the same rule-based approach as the rest of PitchIQ, just
phrased as a conversation. Tapping "Ask Coach about this" from a tagged mistake, a Quick
Analyzer result, or a famous match moment carries that context along so Coach answers
about the specific thing you were looking at, even if your typed question is generic.

An earlier version of Coach AI proxied real Claude responses through a small Node
backend that held an Anthropic API key server-side (since a secret like that can never
be pasted into a static site's JavaScript). That version is still available in this
repo's history (commit `31107a0`) if you'd rather wire up a real API key later.

## Sharing it with your group

Because it's just static files, the whole `RIS` folder can be zipped and emailed,
shared over a drive, or pushed to GitHub so every teammate can edit their section.
`js/firebase-config.js` contains your project's public web config (safe to share
with teammates — it's not a secret key), but access is still controlled entirely by
the Firestore security rules above, not by keeping the config private.

## Deploying it live (so you can open a URL on any computer, e.g. for presenting)

**Option A — Vercel (recommended, free)**

1. Create a free account at vercel.com.
2. Install the CLI: `npm install -g vercel` (requires Node.js).
3. From this project folder, run `vercel` and follow the prompts (no build
   settings needed — it's a static site).
4. Vercel gives you a public URL you can open on any device, including the
   classroom computer/projector.
5. Add that URL's domain to Firebase's Authorized domains list (see setup steps above)
   so Google sign-in works on the deployed site too.

**Option B — Netlify (also free, no CLI needed)**

1. Create a free account at netlify.com.
2. Go to "Add new site" → "Deploy manually" and drag the whole project folder
   (containing `index.html`) into the browser window.
3. Netlify gives you a live URL instantly — add its domain to Firebase's Authorized
   domains list.

**Option C — GitHub Pages**

1. Push this folder to a GitHub repository.
2. In the repo Settings → Pages, set the source to the `main` branch, root folder.
3. GitHub gives you a `https://<username>.github.io/<repo>/` URL — add it to
   Firebase's Authorized domains list.

## Project structure

```
index.html                    Page shell, all tab sections
css/styles.css                 Design system (light + dark mode), layout, components
js/data.js                     Country reference data, the SQ model, and the Wellness Advisor's knowledge base
js/charts.js                   Dependency-free canvas chart engine (bar charts, tooltips, table view)
js/firebase-config.js          Your Firebase project config (fill in — see setup steps above)
js/community.js                Community Connect: real Google sign-in + Firestore-backed communities
js/app.js                      Tab switching, SQ calculator, Wellness Advisor, community hub, dashboard, team roles

performance-analyzer/          Athlyze — standalone sports performance analyzer (separate site)
performance-analyzer/index.html  Page shell
performance-analyzer/css/styles.css  Design system for Athlyze
performance-analyzer/js/data.js      Sport/metric presets
performance-analyzer/js/charts.js    Chart engine (adds a line/trend chart)
performance-analyzer/js/xlsx.js      Dependency-free .xlsx writer used by Athlyze's export button
performance-analyzer/js/app.js       Entry logging, PR calculation, trend calculation, rendering

football-analyzer/             PitchIQ — standalone football skill & match analyzer (separate site)
football-analyzer/index.html     Page shell: video workspace, Quick Analyzer, Famous Match Analyzer, Coach AI, report, library
football-analyzer/css/styles.css Design system for PitchIQ
football-analyzer/js/data.js     Skill categories, mistake/why/fix/drill knowledge base, and the famous-match library
football-analyzer/js/charts.js   Chart engine (horizontal bar chart for the report)
football-analyzer/js/coach.js    Coach AI panel: rule-based, matches your question against js/data.js, no key/backend
football-analyzer/js/app.js      Video tagging, free-text matcher, famous match rendering, sessions, report, clip playback
```

## Before you present

- **Fill in your team's real names** on the Team tab.
- **Complete the Firebase setup above before presenting** if you want to demo
  Community Connect live with multiple real accounts — without it, that one tab shows
  a setup notice while everything else works.
- **The Community Hub has no outside partners.** The Cultural Practice Library is
  in-house content only — don't imply any NGO, studio or certifying-body
  relationship exists unless your group has actually secured one.
- **Understand the SQ formula before presenting it** — it's simple by design
  (four weighted categories summing to 100) specifically so any group member can
  explain and defend it live without needing to have written the code themselves.
- The Wellness Advisor is rule-based keyword matching, not AI or a diagnostic tool —
  be ready to explain that distinction if asked.

## Extending it further (optional, if you want to go further)

- Add Firestore rules or a Cloud Function to let a community owner rename/delete a
  community or remove a member, rather than only supporting join/leave from the client.
- Expand the Cultural Practice Library and the Wellness Advisor's knowledge base
  (`js/data.js`), and add source citations per practice.
- Add a "my SQ history" view backed by Firestore (per signed-in user) instead of the
  current per-browser `localStorage` sparkline, so your SQ trend follows your account
  across devices the same way communities now do.
- If your group secures a real instructor, studio or organization relationship,
  add it explicitly and clearly — don't imply one exists until it does.

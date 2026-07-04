/* Rooted — Firebase configuration.

   Community Connect needs a real backend so that communities you create are
   visible to *anyone* who signs in with their own Google account, on any
   device — not just people who happen to open your browser. Firebase gives
   you that (free tier, no server to run/maintain) in about 5 minutes:

   1. Go to https://console.firebase.google.com and create a project (free).
   2. Build → Authentication → Get started → Sign-in method → enable "Google".
   3. Build → Firestore Database → Create database → start in production mode
      (pick any region close to your users).
   4. In Firestore → Rules, paste the rules from the README's "Firestore
      security rules" section and click Publish.
   5. Project settings (gear icon) → General → "Your apps" → Add app → Web
      (</> icon) → register the app → copy the `firebaseConfig` object it
      gives you and paste the values below, replacing the placeholders.
   6. Authentication → Settings → Authorized domains → add the domain you
      deploy to (e.g. your-project.vercel.app). localhost is allowed by
      default, so local testing works before you deploy.

   Until you do this, the config below is a placeholder and Community
   Connect will show an on-page setup notice instead of silently failing —
   see js/community.js. Every other part of the site (SQ prototype, Wellness
   Advisor, dashboard, practice library) works with no backend at all. */

const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const FIREBASE_CONFIG_IS_PLACEHOLDER = FIREBASE_CONFIG.apiKey === "YOUR_API_KEY";

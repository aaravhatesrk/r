/* PitchIQ — Coach AI configuration.

   The Coach AI panel calls a small backend (football-analyzer/server/) that
   holds your Anthropic API key server-side and proxies requests to Claude —
   the key can never live in this static frontend safely, so it can't just be
   pasted here the way the Firebase config can.

   To turn Coach AI on:
   1. Deploy football-analyzer/server/ somewhere that can run a Node process
      (e.g. a second Render "Web Service" pointing at this repo, with root
      directory football-analyzer/server and start command "npm start").
   2. In that service's environment variables, set ANTHROPIC_API_KEY to your
      Anthropic API key (never commit it to this repo).
   3. Once deployed, copy the service's URL and paste it below, replacing the
      placeholder.

   Until you do this, the Coach AI panel shows an on-page setup notice instead
   of silently failing — see js/coach.js. Every other part of PitchIQ works
   with no backend at all. */

const COACH_API_URL = "YOUR_COACH_API_URL/api/coach";

const COACH_CONFIG_IS_PLACEHOLDER = COACH_API_URL.startsWith("YOUR_COACH_API_URL");

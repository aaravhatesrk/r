/* Praxis — Razorpay configuration (test mode only).

   The Praxis+ "Subscribe" button on the Home tab uses Razorpay Checkout to
   demo a real payment flow for the ₹99/month tier. To wire up a free TEST
   key (no business verification needed):

   1. Go to https://dashboard.razorpay.com/signup and create an account
      (email/phone only — test mode needs no KYC or bank details).
   2. Dashboard → Settings → API Keys → Generate Test Key.
   3. Copy the Key ID (starts with "rzp_test_") and paste it below, replacing
      the placeholder. Never put the Key Secret here — it's a server-side
      value and this file ships to every visitor's browser.

   Until you do this, the config below is a placeholder and the Subscribe
   button shows an on-page setup notice instead of silently failing — see
   js/app.js. Every other part of the site works with no payment backend
   at all. Test-mode payments never move real money; use Razorpay's
   published test card numbers at checkout. */

const RAZORPAY_KEY_ID = "YOUR_TEST_KEY_ID";

const RAZORPAY_CONFIG_IS_PLACEHOLDER = RAZORPAY_KEY_ID === "YOUR_TEST_KEY_ID";

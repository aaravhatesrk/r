/* Rooted — Community Connect, backed by a real Firebase project.

   Accounts are real Google sign-ins (Firebase Authentication) and every
   community lives in a shared Firestore database, not this browser's
   localStorage — so two different people, with two different Google
   accounts, on two different computers, see the same community and the same
   member list in real time. This only works once the site owner has created
   a free Firebase project and filled in js/firebase-config.js — see the
   README's "Setting up real accounts & communities" section. Until then,
   this file shows an on-page setup notice instead of silently failing. */

const CONNECT_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — avoids look-alike codes

const connectState = {
  firebaseReady: false,
  auth: null,
  db: null,
  currentUser: null,
  unsubscribeMyCommunities: null,
  pendingInviteCode: null,
  pendingInviteCommunity: null, // "not-found" | community data object | null (not yet resolved)
  myCommunities: [],
  room: null // { code, unsubPosts, unsubEvents } while the community room modal is open
};

// Rooted's own physical-fitness tips & advancements — static, in-house content
// (matches the rest of the site's "transparent, rule-based, no outside API" approach),
// shown in every community room's "Fitness Tips" tab.
const FITNESS_TIPS = [
  { tag: "Training", title: "Progressive overload beats motivation", body: "Small, consistent increases in reps, weight or distance each week outperform sporadic all-out sessions — and are far easier to sustain as a group challenge." },
  { tag: "Recovery", title: "Sleep is a performance metric", body: "7–9 hours of sleep measurably improves reaction time, endurance and injury resilience — recent sports-science reviews rank it alongside training load as a top predictor of performance." },
  { tag: "Nutrition", title: "Protein timing matters less than total intake", body: "Hitting your daily protein target consistently matters far more than eating it in a narrow post-workout window — a myth that's been walked back by more recent research." },
  { tag: "Mobility", title: "Dynamic warm-ups outperform static stretching pre-workout", body: "Movement-based warm-ups (leg swings, walking lunges) prep muscles for output better than holding static stretches, which can temporarily reduce power output if done right before intense effort." },
  { tag: "Advancement", title: "Wearable HRV tracking is going mainstream", body: "Heart-rate-variability tracking, once niche, is now used by casual athletes to gauge daily recovery and decide whether to push hard or take an active-rest day." },
  { tag: "Group fitness", title: "Group accountability raises adherence", body: "Studies on group exercise consistently show higher long-term adherence than solo training — a big part of why community-organized events work better than individual goals alone." },
  { tag: "Cardio", title: "Zone 2 training is having a moment", body: "Long, easy conversational-pace cardio builds aerobic base and fat-burning efficiency, and is now a staple of endurance-coaching programs once reserved for elite athletes." },
  { tag: "Injury prevention", title: "Eccentric strength work cuts injury risk", body: "Controlled lowering phases of a lift (e.g. slow squat descents) build tendon resilience and are widely recommended as a low-cost way to reduce common running and jumping injuries." }
];

/* ---------- Firebase bootstrap ---------- */
function initFirebase(databaseId) {
  if (typeof FIREBASE_CONFIG === "undefined") return false;
  if (typeof window.__firebaseModular === "undefined") return false;
  if (FIREBASE_CONFIG_IS_PLACEHOLDER) return false;
  try {
    const fx = window.__firebaseModular;
    const app = fx.initializeApp(FIREBASE_CONFIG);
    connectState.auth = fx.getAuth(app);
    // Some networks (corporate proxies, antivirus with HTTPS inspection,
    // certain VPNs) kill Firestore's streaming WebChannel connection after a
    // few hundred ms, causing it to reconnect in a loop and surface to users
    // as "Failed to get document because the client is offline" even though
    // each individual request succeeds. Auto-detecting long-polling still
    // negotiates a stream first and can get caught in that same churn;
    // forcing long-polling skips the streaming negotiation entirely, which
    // is Firestore's documented fix when auto-detect isn't enough. Forcing
    // long-polling alone isn't always enough though: since SDK v9.9 the
    // long-polling transport itself is implemented with fetch() + a
    // ReadableStream by default, and the same proxies/antivirus that break
    // native streaming also break that fetch stream, reproducing the exact
    // same "client is offline" error. useFetchStreams: false drops back to
    // plain XHR for long-polling, which those middleboxes don't interfere
    // with. Settings must be passed at creation time in the modular API (no
    // separate .settings() call afterward), and databaseId is the value
    // resolveFirestoreDatabaseId() found this project's real database under —
    // omit it for the classic reserved "(default)" case.
    const settings = { experimentalForceLongPolling: true, useFetchStreams: false };
    connectState.db = databaseId === "(default)"
      ? fx.initializeFirestore(app, settings)
      : fx.initializeFirestore(app, settings, databaseId);
    connectState.firebaseReady = true;
    return true;
  } catch (err) {
    console.error("Firebase failed to initialize:", err);
    return false;
  }
}

function showSetupBanner() {
  const el = document.getElementById("community-setup-banner");
  el.hidden = false;
  el.innerHTML = `
    <strong>Community Connect isn't set up yet.</strong> This feature needs a free Firebase project so
    real accounts and communities work across different people's devices — see "Setting up real accounts
    &amp; communities" in the README for the ~5-minute setup, then fill in <code>js/firebase-config.js</code>.
    Every other part of the site works normally without this.`;
  document.getElementById("auth-area").innerHTML = "";
  document.getElementById("create-community-btn").disabled = true;
  document.getElementById("join-community-form").querySelector("button").disabled = true;
  document.getElementById("my-communities-list").innerHTML = "";
}

function showDatabaseMissingBanner() {
  const el = document.getElementById("community-setup-banner");
  el.hidden = false;
  const consoleUrl = `https://console.firebase.google.com/project/${FIREBASE_CONFIG.projectId}/firestore`;
  el.innerHTML = `
    <strong>Community Connect can't reach its database.</strong> Firebase Authentication is configured, but no
    Cloud Firestore database has actually been created for project <code>${FIREBASE_CONFIG.projectId}</code> yet
    — that's the exact cause of "client is offline" errors here, and no client-side setting can fix it. Open the
    <a href="${consoleUrl}" target="_blank" rel="noopener">Firestore page in the Firebase console</a>, click
    "Create Database" (any region), then reload this page. Use the Firebase console link above, not the raw
    Google Cloud Datastore setup page — that one can create a "Datastore mode" database instead, which the
    Firestore SDK used here can't talk to at all.`;
  document.getElementById("create-community-btn").disabled = true;
  document.getElementById("join-community-form").querySelector("button").disabled = true;
}

// Hits Firestore's REST API directly (plain fetch, no SDK, no streaming
// channel) so a "database not created" 404 can't be masked by the same
// WebChannel/long-polling churn that produces the generic "client is
// offline" error. Must target a specific collection (".../documents/communities"),
// not the bare ".../documents" root — the bare root isn't a valid Firestore
// REST route at all and Google's frontend 404s it the same generic way
// whether or not the database exists, so the real NOT_FOUND body never came
// back and this check silently always reported "exists". Scoping to a
// collection makes the 404 come from Firestore itself (with a real
// error.status), and an empty/missing collection in an existing database
// just returns 200 with no documents, so this still only fires on a truly
// missing database.
//
// Tries both possible IDs for a project's default database: the classic
// reserved "(default)" (what firebase.firestore() targets with no argument),
// and the literal "default" — some projects' default database is provisioned
// under that plain name instead, which "(default)" 404s against even though
// the database is real. A 403 PERMISSION_DENIED (this app's rules require
// request.auth != null) only happens for an ID Firestore actually resolved to
// a real database, so it counts as "exists" same as a 200; a 404 NOT_FOUND
// with that exact database name in the body means that ID has no database.
// Returns the working database ID, or null if neither exists.
async function resolveFirestoreDatabaseId() {
  for (const candidate of ["(default)", "default"]) {
    try {
      const resp = await fetch(`https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/${candidate}/documents/communities`);
      if (resp.status === 404) {
        const body = await resp.json().catch(() => null);
        if (body && body.error && body.error.status === "NOT_FOUND") continue;
      }
      return candidate;
    } catch {
      return "(default)";
    }
  }
  return null;
}

function showCommunityError(err, context) {
  console.error(context, err);
  const el = document.getElementById("community-error-banner");
  el.hidden = false;
  let message;
  if (err && err.code === "permission-denied") {
    message = "Permission denied — check that the Firestore security rules from the README are published on your Firebase project.";
  } else if (err && (err.code === "unavailable" || /client is offline/i.test(err.message || ""))) {
    message = "Couldn't reach the backend (client is offline). Check your internet connection, and if it's fine, make sure a Cloud Firestore database has actually been created for this project in the Firebase Console (Build → Firestore Database → Create database) — this exact error is what shows up when Authentication is set up but Firestore never was. Ad blockers or restrictive networks can also cause this.";
  } else {
    message = (err && err.message) || "Something went wrong talking to the backend. Please try again.";
  }
  el.innerHTML = `<strong>${context || "Error"}.</strong> ${message}`;
  setTimeout(() => { el.hidden = true; }, 8000);
}

/* ---------- Helpers ---------- */
function generateCommunityCode() {
  let code = "";
  for (let i = 0; i < 6; i++) code += CONNECT_CODE_ALPHABET[Math.floor(Math.random() * CONNECT_CODE_ALPHABET.length)];
  return code;
}

async function generateUniqueCommunityCode() {
  const fx = window.__firebaseModular;
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCommunityCode();
    const snap = await fx.getDoc(fx.doc(connectState.db, "communities", code));
    if (!snap.exists()) return code;
  }
  throw new Error("Could not generate a unique invite code — please try again.");
}

function initials(name) {
  return (name || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join("");
}

const ESCAPE_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
// All community content (names, descriptions, chat messages, event details) is
// user-submitted and rendered via innerHTML for formatting — escape it so one member
// can't inject markup/scripts into a room every other member's browser renders.
function escapeHtml(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => ESCAPE_MAP[c]);
}

function buildInviteLink(code) {
  return `${location.origin}${location.pathname}?join=${code}`;
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/* ---------- Modal ---------- */
let modalCloseHandler = null;
function openModal(html, onMount, onClose) {
  const overlay = document.getElementById("modal-overlay");
  const box = document.getElementById("modal-box");
  box.innerHTML = html;
  box.classList.remove("modal-box-room");
  overlay.hidden = false;
  modalCloseHandler = onClose || null;
  if (onMount) onMount(box);
}
function closeModal() {
  document.getElementById("modal-overlay").hidden = true;
  document.getElementById("modal-box").innerHTML = "";
  document.getElementById("modal-box").classList.remove("modal-box-room");
  if (modalCloseHandler) {
    const handler = modalCloseHandler;
    modalCloseHandler = null;
    handler();
  }
}
function initModal() {
  const overlay = document.getElementById("modal-overlay");
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) closeModal();
  });
}

/* ---------- Sign-in (real Google account via Firebase Auth) ---------- */
async function signInWithGoogle() {
  const fx = window.__firebaseModular;
  const provider = new fx.GoogleAuthProvider();
  return fx.signInWithPopup(connectState.auth, provider);
}

function requireSignIn(then) {
  if (connectState.currentUser) { then(); return; }
  signInWithGoogle().then(() => then()).catch((err) => {
    if (err && err.code === "auth/popup-closed-by-user") return;
    showCommunityError(err, "Sign-in failed");
  });
}

/* ---------- Create community ---------- */
function showCreateCommunityModal() {
  openModal(`
    <button class="modal-close" aria-label="Close">&times;</button>
    <h3>Create a Community</h3>
    <form id="create-community-form" class="modal-form">
      <label>Community name <input id="cc-name" type="text" required maxlength="60" placeholder="e.g. Bengaluru Sunrise Yoga Circle" /></label>
      <label>What's it about? <textarea id="cc-desc" rows="3" maxlength="240" placeholder="e.g. Weekly forest-walk and breathwork meetup for people building an SQ streak together."></textarea></label>
      <p class="modal-error" id="create-error" hidden></p>
      <button type="submit" class="btn btn-primary" id="create-submit-btn">Create &amp; get invite link</button>
    </form>
  `, (box) => {
    box.querySelector(".modal-close").addEventListener("click", closeModal);
    box.querySelector("#create-community-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const user = connectState.currentUser;
      const name = box.querySelector("#cc-name").value.trim();
      const description = box.querySelector("#cc-desc").value.trim();
      if (!name) return;

      const submitBtn = box.querySelector("#create-submit-btn");
      const errorEl = box.querySelector("#create-error");
      submitBtn.disabled = true;
      submitBtn.textContent = "Creating…";
      try {
        const fx = window.__firebaseModular;
        const code = await generateUniqueCommunityCode();
        const member = { name: user.displayName || user.email, email: user.email, joinedAt: Date.now() };
        await fx.setDoc(fx.doc(connectState.db, "communities", code), {
          code,
          name,
          description,
          ownerEmail: user.email,
          ownerName: member.name,
          createdAt: fx.serverTimestamp(),
          memberEmails: [user.email],
          members: [member]
        });
        closeModal();
        showShareModal(code, name);
      } catch (err) {
        errorEl.textContent = (err && err.message) || "Couldn't create the community. Please try again.";
        errorEl.hidden = false;
        submitBtn.disabled = false;
        submitBtn.textContent = "Create & get invite link";
      }
    });
  });
}

function showShareModal(code, name) {
  const link = buildInviteLink(code);
  openModal(`
    <button class="modal-close" aria-label="Close">&times;</button>
    <h3>"${escapeHtml(name)}" is live</h3>
    <p class="modal-note">Share the link (recommended) or the code — either lets anyone with their own Google account join.</p>
    <label class="modal-share-label">Invite link
      <div class="copy-row"><input type="text" readonly value="${link}" id="share-link-input" /><button class="btn btn-ghost btn-small" id="copy-link-btn">Copy</button></div>
    </label>
    <label class="modal-share-label">Invite code
      <div class="copy-row"><input type="text" readonly value="${code}" id="share-code-input" /><button class="btn btn-ghost btn-small" id="copy-code-btn">Copy</button></div>
    </label>
    <button class="btn btn-primary" id="share-done-btn">Done</button>
  `, (box) => {
    box.querySelector(".modal-close").addEventListener("click", closeModal);
    box.querySelector("#share-done-btn").addEventListener("click", closeModal);
    box.querySelector("#copy-link-btn").addEventListener("click", async (e) => {
      const ok = await copyToClipboard(link);
      e.target.textContent = ok ? "Copied!" : "Copy failed";
      setTimeout(() => { e.target.textContent = "Copy"; }, 1500);
    });
    box.querySelector("#copy-code-btn").addEventListener("click", async (e) => {
      const ok = await copyToClipboard(code);
      e.target.textContent = ok ? "Copied!" : "Copy failed";
      setTimeout(() => { e.target.textContent = "Copy"; }, 1500);
    });
  });
}

/* ---------- Join / leave (Firestore transactions so concurrent joins from
   different accounts on different devices never clobber each other) ---------- */
async function joinCommunityByCode(rawCode) {
  const fx = window.__firebaseModular;
  const code = rawCode.toUpperCase().trim();
  const user = connectState.currentUser;
  const ref = fx.doc(connectState.db, "communities", code);

  return fx.runTransaction(connectState.db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw Object.assign(new Error("No community found for that code."), { code: "not-found" });
    const data = snap.data();
    if (data.memberEmails.includes(user.email)) return data;
    const member = { name: user.displayName || user.email, email: user.email, joinedAt: Date.now() };
    tx.update(ref, {
      memberEmails: fx.arrayUnion(user.email),
      members: fx.arrayUnion(member)
    });
    return { ...data, memberEmails: [...data.memberEmails, user.email], members: [...data.members, member] };
  });
}

async function leaveCommunity(code) {
  const fx = window.__firebaseModular;
  const user = connectState.currentUser;
  const ref = fx.doc(connectState.db, "communities", code);
  return fx.runTransaction(connectState.db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    const memberObj = data.members.find(m => m.email === user.email);
    tx.update(ref, {
      memberEmails: fx.arrayRemove(user.email),
      members: memberObj ? fx.arrayRemove(memberObj) : data.members
    });
  });
}

function initJoinForm() {
  document.getElementById("join-community-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("join-code-input");
    const code = input.value.trim();
    if (!code) return;
    requireSignIn(async () => {
      try {
        await joinCommunityByCode(code);
        input.value = "";
      } catch (err) {
        showCommunityError(err, "Couldn't join that community");
      }
    });
  });
}

/* ---------- Invite link on load (?join=CODE — resolved live from Firestore,
   so it works for any signed-in Google account on any device, not just a
   browser that has seen it before). ---------- */
function handleInviteFromUrl() {
  const params = new URLSearchParams(location.search);
  const code = params.get("join");
  history.replaceState(null, "", location.pathname);
  if (!code) return;
  connectState.pendingInviteCode = code.toUpperCase().trim();
  renderInviteBanner();
}

async function resolvePendingInvite() {
  if (!connectState.pendingInviteCode || !connectState.currentUser) return;
  if (connectState.pendingInviteCommunity) return;
  try {
    const fx = window.__firebaseModular;
    const snap = await fx.getDoc(fx.doc(connectState.db, "communities", connectState.pendingInviteCode));
    connectState.pendingInviteCommunity = snap.exists() ? snap.data() : "not-found";
  } catch (err) {
    connectState.pendingInviteCommunity = "not-found";
    showCommunityError(err, "Couldn't load that invite");
  }
  renderInviteBanner();
}

function renderInviteBanner() {
  const el = document.getElementById("invite-banner");
  const code = connectState.pendingInviteCode;
  if (!code) { el.hidden = true; return; }

  const user = connectState.currentUser;
  if (!user) {
    el.hidden = false;
    el.innerHTML = `
      <div><strong>You've been invited to join a community.</strong>
      <p class="invite-desc">Sign in with your Google account to see who's in it and join.</p></div>
      <div class="invite-banner-actions"><button class="btn btn-primary btn-small" id="invite-signin-btn">Sign in with Google</button></div>`;
    el.querySelector("#invite-signin-btn").addEventListener("click", () => requireSignIn(() => {}));
    return;
  }

  const community = connectState.pendingInviteCommunity;
  if (community === undefined || community === null) { el.hidden = true; return; }

  if (community === "not-found") {
    el.hidden = false;
    el.innerHTML = `
      <div><strong>That invite code wasn't found.</strong>
      <p class="invite-desc">It may have been mistyped, or the community may no longer exist.</p></div>
      <div class="invite-banner-actions"><button class="btn btn-ghost btn-small" id="invite-dismiss-btn">Dismiss</button></div>`;
    el.querySelector("#invite-dismiss-btn").addEventListener("click", () => {
      connectState.pendingInviteCode = null;
      connectState.pendingInviteCommunity = null;
      renderInviteBanner();
    });
    return;
  }

  const alreadyIn = community.memberEmails.includes(user.email);
  if (alreadyIn) { el.hidden = true; connectState.pendingInviteCode = null; connectState.pendingInviteCommunity = null; return; }

  el.hidden = false;
  el.innerHTML = `
    <div>
      <strong>You've been invited to join "${escapeHtml(community.name)}"</strong>
      ${community.description ? `<p class="invite-desc">${escapeHtml(community.description)}</p>` : ""}
      <span class="invite-meta">${community.members.length} member${community.members.length === 1 ? "" : "s"} · code ${community.code}</span>
    </div>
    <div class="invite-banner-actions">
      <button class="btn btn-primary btn-small" id="invite-join-btn">Join</button>
      <button class="btn btn-ghost btn-small" id="invite-dismiss-btn">Dismiss</button>
    </div>
  `;
  el.querySelector("#invite-join-btn").addEventListener("click", async (e) => {
    e.target.disabled = true;
    e.target.textContent = "Joining…";
    try {
      await joinCommunityByCode(community.code);
      connectState.pendingInviteCode = null;
      connectState.pendingInviteCommunity = null;
      renderInviteBanner();
    } catch (err) {
      showCommunityError(err, "Couldn't join that community");
      e.target.disabled = false;
      e.target.textContent = "Join";
    }
  });
  el.querySelector("#invite-dismiss-btn").addEventListener("click", () => {
    connectState.pendingInviteCode = null;
    connectState.pendingInviteCommunity = null;
    renderInviteBanner();
  });
}

/* ---------- Live "my communities" (Firestore real-time listener — updates
   instantly if someone else joins or leaves a community you're in, on their
   own device with their own account). ---------- */
function subscribeMyCommunities() {
  if (connectState.unsubscribeMyCommunities) connectState.unsubscribeMyCommunities();
  const user = connectState.currentUser;
  if (!user) { connectState.myCommunities = []; renderMyCommunities(); return; }

  const fx = window.__firebaseModular;
  const q = fx.query(fx.collection(connectState.db, "communities"), fx.where("memberEmails", "array-contains", user.email));
  connectState.unsubscribeMyCommunities = fx.onSnapshot(q, (snap) => {
    connectState.myCommunities = snap.docs.map(d => d.data());
    renderMyCommunities();
  }, (err) => showCommunityError(err, "Couldn't load your communities"));
}

/* ---------- Rendering ---------- */
function renderAuthArea() {
  const el = document.getElementById("auth-area");
  const user = connectState.currentUser;
  if (!user) {
    el.innerHTML = `<button class="btn btn-primary" id="signin-btn">Continue with Google</button>`;
    el.querySelector("#signin-btn").addEventListener("click", () => requireSignIn(() => {}));
    return;
  }
  el.innerHTML = `
    <div class="user-chip">
      ${user.photoURL ? `<img class="user-avatar user-avatar-img" src="${escapeHtml(user.photoURL)}" alt="" />` : `<span class="user-avatar">${initials(user.displayName || user.email)}</span>`}
      <span class="user-meta"><strong>${escapeHtml(user.displayName || "Signed in")}</strong><span>${escapeHtml(user.email)}</span></span>
      <button class="btn btn-ghost btn-small" id="signout-btn">Sign out</button>
    </div>
  `;
  el.querySelector("#signout-btn").addEventListener("click", () => connectState.auth.signOut());
}

function renderMyCommunities() {
  const el = document.getElementById("my-communities-list");
  const user = connectState.currentUser;

  if (!user) {
    el.innerHTML = `<p class="sq-placeholder">Sign in with Google to create or join a community.</p>`;
    return;
  }
  const mine = connectState.myCommunities;
  if (mine.length === 0) {
    el.innerHTML = `<p class="sq-placeholder">You haven't joined or created a community yet.</p>`;
    return;
  }

  el.innerHTML = mine.map(c => {
    const isOwner = c.ownerEmail === user.email;
    return `
      <div class="event-card community-card">
        <h3>${escapeHtml(c.name)}</h3>
        <div class="meta">${isOwner ? "You created this" : `Created by ${escapeHtml(c.ownerName)}`} · code ${c.code}</div>
        <div class="desc">${c.description ? escapeHtml(c.description) : "No description yet."}</div>
        <div class="member-row">
          ${c.members.slice(0, 8).map(m => `<span class="user-avatar small" title="${escapeHtml(m.name)}">${initials(m.name)}</span>`).join("")}
          <span class="member-count">${c.members.length} member${c.members.length === 1 ? "" : "s"}</span>
        </div>
        <div class="community-card-actions">
          <button class="btn btn-primary btn-small" data-open="${c.code}">Open</button>
          <button class="btn btn-ghost btn-small" data-share="${c.code}">Share invite</button>
          ${isOwner ? `<button class="btn btn-danger btn-small" data-delete="${c.code}">Delete</button>` : `<button class="btn btn-ghost btn-small" data-leave="${c.code}">Leave</button>`}
        </div>
      </div>`;
  }).join("");

  el.querySelectorAll("[data-open]").forEach(btn => {
    btn.addEventListener("click", () => openCommunityRoom(btn.dataset.open));
  });
  el.querySelectorAll("[data-share]").forEach(btn => {
    btn.addEventListener("click", () => {
      const community = connectState.myCommunities.find(c => c.code === btn.dataset.share);
      if (community) showShareModal(community.code, community.name);
    });
  });
  el.querySelectorAll("[data-leave]").forEach(btn => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        await leaveCommunity(btn.dataset.leave);
      } catch (err) {
        showCommunityError(err, "Couldn't leave that community");
        btn.disabled = false;
      }
    });
  });
  el.querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", () => {
      const community = connectState.myCommunities.find(c => c.code === btn.dataset.delete);
      if (community) showDeleteConfirmModal(community);
    });
  });
}

/* ---------- Community room (open a joined/created community: chat feed,
   event scheduling, fitness tips) ---------- */
function formatTimeAgo(ts) {
  if (!ts || typeof ts.toDate !== "function") return "Just now";
  const diffMs = Date.now() - ts.toDate().getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return ts.toDate().toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatEventWhen(ms) {
  return new Date(ms).toLocaleString(undefined, {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
  });
}

function buildRoomHtml(community) {
  return `
    <button class="modal-close" aria-label="Close">&times;</button>
    <div class="room-head">
      <div>
        <h3>${escapeHtml(community.name)}</h3>
        <div class="room-meta">${community.ownerEmail === connectState.currentUser.email ? "You created this" : `Created by ${escapeHtml(community.ownerName)}`} · code ${community.code} · ${community.members.length} member${community.members.length === 1 ? "" : "s"}</div>
      </div>
    </div>
    <div class="room-tabs" role="tablist">
      <button class="room-tab-btn active" data-room-tab="feed" type="button">Chat</button>
      <button class="room-tab-btn" data-room-tab="events" type="button">Events</button>
      <button class="room-tab-btn" data-room-tab="tips" type="button">Fitness Tips</button>
    </div>
    <div class="room-panel" id="room-panel-feed">
      <div class="room-feed-list" id="room-feed-list"><p class="sq-placeholder">Loading…</p></div>
      <form class="room-post-form" id="room-post-form">
        <input type="text" id="room-post-input" maxlength="500" placeholder="Message the group…" autocomplete="off" required />
        <button type="submit" class="btn btn-primary btn-small">Send</button>
      </form>
    </div>
    <div class="room-panel" id="room-panel-events" hidden>
      <div class="room-events-toolbar">
        <button class="btn btn-ghost btn-small" id="room-new-event-btn" type="button">+ Schedule an event</button>
      </div>
      <form class="modal-form room-event-form" id="room-event-form" hidden>
        <label>Event title <input id="re-title" type="text" required maxlength="80" placeholder="e.g. Saturday Sunrise 5K" /></label>
        <div class="room-event-form-row">
          <label>Date &amp; time <input id="re-when" type="datetime-local" required /></label>
          <label>Location <input id="re-location" type="text" maxlength="100" placeholder="e.g. Cubbon Park, Gate 2" /></label>
        </div>
        <label>Details <textarea id="re-desc" rows="2" maxlength="240" placeholder="What to bring, pace, distance…"></textarea></label>
        <p class="modal-error" id="re-error" hidden></p>
        <div class="room-event-form-actions">
          <button type="submit" class="btn btn-primary btn-small">Schedule</button>
          <button type="button" class="btn btn-ghost btn-small" id="re-cancel-btn">Cancel</button>
        </div>
      </form>
      <div class="room-events-list" id="room-events-list"><p class="sq-placeholder">Loading…</p></div>
    </div>
    <div class="room-panel" id="room-panel-tips" hidden>
      <div class="room-tips-list">
        ${FITNESS_TIPS.map(t => `
          <div class="room-tip-card">
            <span class="filter-chip active room-tip-tag">${escapeHtml(t.tag)}</span>
            <h4>${escapeHtml(t.title)}</h4>
            <p>${escapeHtml(t.body)}</p>
          </div>`).join("")}
      </div>
    </div>
    <div class="room-foot-actions">
      <button class="btn btn-ghost btn-small" id="room-share-btn" type="button">Share invite</button>
      ${community.ownerEmail === connectState.currentUser.email
        ? `<button class="btn btn-danger btn-small" id="room-delete-btn" type="button">Delete community</button>`
        : `<button class="btn btn-ghost btn-small" id="room-leave-btn" type="button">Leave community</button>`}
    </div>
  `;
}

function renderRoomFeedList(box, posts) {
  const el = box.querySelector("#room-feed-list");
  if (!el) return;
  const user = connectState.currentUser;
  if (posts.length === 0) {
    el.innerHTML = `<p class="sq-placeholder">No messages yet — be the first to say hello.</p>`;
  } else {
    el.innerHTML = posts.map(p => `
      <div class="room-post ${p.authorEmail === user.email ? "room-post-mine" : ""}">
        <span class="user-avatar small room-post-avatar" title="${escapeHtml(p.authorName)}">${initials(p.authorName)}</span>
        <div class="room-post-body">
          <div class="room-post-head"><strong>${escapeHtml(p.authorName)}</strong><span class="room-post-time">${formatTimeAgo(p.createdAt)}</span></div>
          <p>${escapeHtml(p.text)}</p>
        </div>
      </div>`).join("");
  }
  el.scrollTop = el.scrollHeight;
}

function renderRoomEventsList(box, code, events) {
  const el = box.querySelector("#room-events-list");
  if (!el) return;
  const user = connectState.currentUser;
  const now = Date.now();
  const sorted = events.slice().sort((a, b) => (a.startsAt || Infinity) - (b.startsAt || Infinity));
  if (sorted.length === 0) {
    el.innerHTML = `<p class="sq-placeholder">No events scheduled yet — schedule the first one.</p>`;
  } else {
    el.innerHTML = sorted.map(ev => {
      const rsvps = ev.rsvps || [];
      const going = rsvps.some(r => r.email === user.email);
      const isPast = ev.startsAt && ev.startsAt < now;
      return `
        <div class="event-card room-event-card ${isPast ? "room-event-past" : ""}">
          ${isPast ? `<span class="kpi-pill kpi-warn room-event-past-badge">Past</span>` : ""}
          <h3>${escapeHtml(ev.title)}</h3>
          <div class="meta">${ev.startsAt ? formatEventWhen(ev.startsAt) : "Time TBD"}${ev.location ? ` · ${escapeHtml(ev.location)}` : ""}</div>
          ${ev.description ? `<div class="desc">${escapeHtml(ev.description)}</div>` : ""}
          <div class="room-event-footer">
            <div class="member-row">
              ${rsvps.slice(0, 6).map(r => `<span class="user-avatar small" title="${escapeHtml(r.name)}">${initials(r.name)}</span>`).join("")}
              <span class="member-count">${rsvps.length} going</span>
            </div>
            <button class="btn ${going ? "btn-ghost" : "btn-primary"} btn-small" data-rsvp="${ev.id}">${going ? "Can't go" : "I'm in"}</button>
          </div>
          <div class="room-event-meta-sub">Scheduled by ${escapeHtml(ev.createdByName)}</div>
        </div>`;
    }).join("");
  }
  el.querySelectorAll("[data-rsvp]").forEach(btn => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        await toggleRsvp(code, btn.dataset.rsvp);
      } catch (err) {
        showCommunityError(err, "Couldn't update your RSVP");
      }
      btn.disabled = false;
    });
  });
}

async function sendPost(code, text) {
  const fx = window.__firebaseModular;
  const user = connectState.currentUser;
  await fx.addDoc(fx.collection(connectState.db, "communities", code, "posts"), {
    text,
    authorEmail: user.email,
    authorName: user.displayName || user.email,
    createdAt: fx.serverTimestamp()
  });
}

async function createEvent(code, { title, startsAt, location, description }) {
  const fx = window.__firebaseModular;
  const user = connectState.currentUser;
  const member = { name: user.displayName || user.email, email: user.email };
  await fx.addDoc(fx.collection(connectState.db, "communities", code, "events"), {
    title, startsAt: startsAt || null, location, description,
    createdByEmail: user.email,
    createdByName: user.displayName || user.email,
    createdAt: fx.serverTimestamp(),
    rsvps: [member]
  });
}

async function toggleRsvp(code, eventId) {
  const fx = window.__firebaseModular;
  const user = connectState.currentUser;
  const ref = fx.doc(connectState.db, "communities", code, "events", eventId);
  return fx.runTransaction(connectState.db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const rsvps = snap.data().rsvps || [];
    const mine = rsvps.find(r => r.email === user.email);
    if (mine) {
      tx.update(ref, { rsvps: fx.arrayRemove(mine) });
    } else {
      tx.update(ref, { rsvps: fx.arrayUnion({ name: user.displayName || user.email, email: user.email }) });
    }
  });
}

async function deleteCommunityCascade(code) {
  const fx = window.__firebaseModular;
  const db = connectState.db;
  for (const sub of ["posts", "events"]) {
    const snap = await fx.getDocs(fx.collection(db, "communities", code, sub));
    for (const d of snap.docs) await fx.deleteDoc(d.ref);
  }
  await fx.deleteDoc(fx.doc(db, "communities", code));
}

function showDeleteConfirmModal(community) {
  openModal(`
    <button class="modal-close" aria-label="Close">&times;</button>
    <h3>Delete "${escapeHtml(community.name)}"?</h3>
    <p class="modal-note">This permanently deletes the community, its feed and its scheduled events for every
    member. Only you can do this, since you created it — and it can't be undone.</p>
    <p class="modal-error" id="delete-error" hidden></p>
    <div class="room-event-form-actions">
      <button class="btn btn-danger" id="confirm-delete-btn">Delete permanently</button>
      <button class="btn btn-ghost" id="cancel-delete-btn">Cancel</button>
    </div>
  `, (box) => {
    box.querySelector(".modal-close").addEventListener("click", closeModal);
    box.querySelector("#cancel-delete-btn").addEventListener("click", closeModal);
    box.querySelector("#confirm-delete-btn").addEventListener("click", async (e) => {
      e.target.disabled = true;
      e.target.textContent = "Deleting…";
      try {
        await deleteCommunityCascade(community.code);
        closeModal();
      } catch (err) {
        const errorEl = box.querySelector("#delete-error");
        errorEl.textContent = (err && err.message) || "Couldn't delete the community. Please try again.";
        errorEl.hidden = false;
        e.target.disabled = false;
        e.target.textContent = "Delete permanently";
      }
    });
  });
}

function openCommunityRoom(code) {
  const community = connectState.myCommunities.find(c => c.code === code);
  if (!community) return;

  connectState.room = { code, unsubPosts: null, unsubEvents: null };

  openModal(buildRoomHtml(community), (box) => {
    box.classList.add("modal-box-room");
    const fx = window.__firebaseModular;

    box.querySelector(".modal-close").addEventListener("click", closeModal);

    box.querySelectorAll(".room-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        box.querySelectorAll(".room-tab-btn").forEach(b => b.classList.toggle("active", b === btn));
        box.querySelectorAll(".room-panel").forEach(p => { p.hidden = p.id !== `room-panel-${btn.dataset.roomTab}`; });
      });
    });

    box.querySelector("#room-share-btn").addEventListener("click", () => {
      closeModal();
      showShareModal(community.code, community.name);
    });
    const leaveBtn = box.querySelector("#room-leave-btn");
    if (leaveBtn) leaveBtn.addEventListener("click", async () => {
      leaveBtn.disabled = true;
      try {
        await leaveCommunity(community.code);
        closeModal();
      } catch (err) {
        showCommunityError(err, "Couldn't leave that community");
        leaveBtn.disabled = false;
      }
    });
    const deleteBtn = box.querySelector("#room-delete-btn");
    if (deleteBtn) deleteBtn.addEventListener("click", () => {
      closeModal();
      showDeleteConfirmModal(community);
    });

    box.querySelector("#room-post-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = box.querySelector("#room-post-input");
      const text = input.value.trim();
      if (!text) return;
      input.disabled = true;
      try {
        await sendPost(code, text);
        input.value = "";
      } catch (err) {
        showCommunityError(err, "Couldn't post that message");
      }
      input.disabled = false;
      input.focus();
    });

    const eventForm = box.querySelector("#room-event-form");
    box.querySelector("#room-new-event-btn").addEventListener("click", () => {
      eventForm.hidden = !eventForm.hidden;
    });
    box.querySelector("#re-cancel-btn").addEventListener("click", () => { eventForm.hidden = true; eventForm.reset(); });
    eventForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = box.querySelector("#re-title").value.trim();
      const when = box.querySelector("#re-when").value;
      const location = box.querySelector("#re-location").value.trim();
      const description = box.querySelector("#re-desc").value.trim();
      if (!title) return;
      const submitBtn = eventForm.querySelector("button[type=submit]");
      submitBtn.disabled = true;
      try {
        await createEvent(code, {
          title,
          startsAt: when ? new Date(when).getTime() : null,
          location, description
        });
        eventForm.reset();
        eventForm.hidden = true;
      } catch (err) {
        const errorEl = box.querySelector("#re-error");
        errorEl.textContent = (err && err.message) || "Couldn't schedule that event.";
        errorEl.hidden = false;
      }
      submitBtn.disabled = false;
    });

    const postsQuery = fx.query(
      fx.collection(connectState.db, "communities", code, "posts"),
      fx.orderBy("createdAt", "asc"),
      fx.limit(200)
    );
    connectState.room.unsubPosts = fx.onSnapshot(postsQuery, (snap) => {
      renderRoomFeedList(box, snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      showCommunityError(err, "Couldn't load the feed");
      const el = box.querySelector("#room-feed-list");
      if (el) el.innerHTML = `<p class="sq-placeholder">Couldn't load the feed.</p>`;
    });

    const eventsQuery = fx.query(fx.collection(connectState.db, "communities", code, "events"));
    connectState.room.unsubEvents = fx.onSnapshot(eventsQuery, (snap) => {
      renderRoomEventsList(box, code, snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      showCommunityError(err, "Couldn't load events");
      const el = box.querySelector("#room-events-list");
      if (el) el.innerHTML = `<p class="sq-placeholder">Couldn't load events.</p>`;
    });
  }, () => {
    if (connectState.room) {
      if (connectState.room.unsubPosts) connectState.room.unsubPosts();
      if (connectState.room.unsubEvents) connectState.room.unsubEvents();
      connectState.room = null;
    }
  });
}

/* ---------- Init ---------- */
async function initCommunityConnect() {
  initModal();
  handleInviteFromUrl();

  if (typeof FIREBASE_CONFIG === "undefined" || typeof window.__firebaseModular === "undefined" || FIREBASE_CONFIG_IS_PLACEHOLDER) {
    showSetupBanner();
    return;
  }

  const databaseId = await resolveFirestoreDatabaseId();
  if (!databaseId) {
    // Still init auth so sign-in isn't dead, but the DB-backed features stay disabled.
    initFirebase("(default)");
    showDatabaseMissingBanner();
    return;
  }

  if (!initFirebase(databaseId)) {
    showSetupBanner();
    return;
  }

  document.getElementById("create-community-btn").addEventListener("click", () => {
    requireSignIn(() => showCreateCommunityModal());
  });
  initJoinForm();

  window.__firebaseModular.onAuthStateChanged(connectState.auth, (user) => {
    connectState.currentUser = user;
    renderAuthArea();
    subscribeMyCommunities();
    resolvePendingInvite();
    renderInviteBanner();
  });
}

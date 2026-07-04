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
  myCommunities: []
};

/* ---------- Firebase bootstrap ---------- */
function initFirebase() {
  if (typeof FIREBASE_CONFIG === "undefined") return false;
  if (typeof firebase === "undefined") return false;
  if (FIREBASE_CONFIG_IS_PLACEHOLDER) return false;
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    connectState.auth = firebase.auth();
    connectState.db = firebase.firestore();
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

function showCommunityError(err, context) {
  console.error(context, err);
  const el = document.getElementById("community-error-banner");
  el.hidden = false;
  const message = err && err.code === "permission-denied"
    ? "Permission denied — check that the Firestore security rules from the README are published on your Firebase project."
    : (err && err.message) || "Something went wrong talking to the backend. Please try again.";
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
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCommunityCode();
    const snap = await connectState.db.collection("communities").doc(code).get();
    if (!snap.exists) return code;
  }
  throw new Error("Could not generate a unique invite code — please try again.");
}

function initials(name) {
  return (name || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join("");
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
function openModal(html, onMount) {
  const overlay = document.getElementById("modal-overlay");
  const box = document.getElementById("modal-box");
  box.innerHTML = html;
  overlay.hidden = false;
  if (onMount) onMount(box);
}
function closeModal() {
  document.getElementById("modal-overlay").hidden = true;
  document.getElementById("modal-box").innerHTML = "";
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
  const provider = new firebase.auth.GoogleAuthProvider();
  return connectState.auth.signInWithPopup(provider);
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
        const code = await generateUniqueCommunityCode();
        const member = { name: user.displayName || user.email, email: user.email, joinedAt: Date.now() };
        await connectState.db.collection("communities").doc(code).set({
          code,
          name,
          description,
          ownerEmail: user.email,
          ownerName: member.name,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
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
    <h3>"${name}" is live</h3>
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
  const code = rawCode.toUpperCase().trim();
  const user = connectState.currentUser;
  const ref = connectState.db.collection("communities").doc(code);

  return connectState.db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw Object.assign(new Error("No community found for that code."), { code: "not-found" });
    const data = snap.data();
    if (data.memberEmails.includes(user.email)) return data;
    const member = { name: user.displayName || user.email, email: user.email, joinedAt: Date.now() };
    tx.update(ref, {
      memberEmails: firebase.firestore.FieldValue.arrayUnion(user.email),
      members: firebase.firestore.FieldValue.arrayUnion(member)
    });
    return { ...data, memberEmails: [...data.memberEmails, user.email], members: [...data.members, member] };
  });
}

async function leaveCommunity(code) {
  const user = connectState.currentUser;
  const ref = connectState.db.collection("communities").doc(code);
  return connectState.db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const data = snap.data();
    const memberObj = data.members.find(m => m.email === user.email);
    tx.update(ref, {
      memberEmails: firebase.firestore.FieldValue.arrayRemove(user.email),
      members: memberObj ? firebase.firestore.FieldValue.arrayRemove(memberObj) : data.members
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
    const snap = await connectState.db.collection("communities").doc(connectState.pendingInviteCode).get();
    connectState.pendingInviteCommunity = snap.exists ? snap.data() : "not-found";
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
      <strong>You've been invited to join "${community.name}"</strong>
      ${community.description ? `<p class="invite-desc">${community.description}</p>` : ""}
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

  connectState.unsubscribeMyCommunities = connectState.db.collection("communities")
    .where("memberEmails", "array-contains", user.email)
    .onSnapshot((snap) => {
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
      ${user.photoURL ? `<img class="user-avatar user-avatar-img" src="${user.photoURL}" alt="" />` : `<span class="user-avatar">${initials(user.displayName || user.email)}</span>`}
      <span class="user-meta"><strong>${user.displayName || "Signed in"}</strong><span>${user.email}</span></span>
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
        <h3>${c.name}</h3>
        <div class="meta">${isOwner ? "You created this" : `Created by ${c.ownerName}`} · code ${c.code}</div>
        <div class="desc">${c.description || "No description yet."}</div>
        <div class="member-row">
          ${c.members.slice(0, 8).map(m => `<span class="user-avatar small" title="${m.name}">${initials(m.name)}</span>`).join("")}
          <span class="member-count">${c.members.length} member${c.members.length === 1 ? "" : "s"}</span>
        </div>
        <div class="community-card-actions">
          <button class="btn btn-ghost btn-small" data-share="${c.code}">Share invite</button>
          ${!isOwner ? `<button class="btn btn-ghost btn-small" data-leave="${c.code}">Leave</button>` : ""}
        </div>
      </div>`;
  }).join("");

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
}

/* ---------- Init ---------- */
function initCommunityConnect() {
  initModal();
  handleInviteFromUrl();

  if (!initFirebase()) {
    showSetupBanner();
    return;
  }

  document.getElementById("create-community-btn").addEventListener("click", () => {
    requireSignIn(() => showCreateCommunityModal());
  });
  initJoinForm();

  connectState.auth.onAuthStateChanged((user) => {
    connectState.currentUser = user;
    renderAuthArea();
    subscribeMyCommunities();
    resolvePendingInvite();
    renderInviteBanner();
  });
}

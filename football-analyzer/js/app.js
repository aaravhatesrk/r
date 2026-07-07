/* PitchIQ — app wiring: theme, video review workspace (local-only playback +
   timestamped tagging), the free-text Quick Analyzer, the skill library, and
   the session report/history. Everything is rule-based keyword/dropdown
   matching against js/data.js — there is no computer vision and no upload to
   any server. All state lives in this browser's localStorage; the video
   file itself is never persisted (browsers can't durably store large blobs
   in localStorage), only the notes and timestamps you tag on it. */

const state = {
  sessions: [],
  current: { title: "", date: "", videoName: null, tags: [] },
  videoObjectUrl: null,
  pendingTimeSec: null,
  historyFilter: "all"
};

function makeId() {
  return crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/* ---------- Storage ---------- */
function loadSessions() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    const seeded = demoSeedSessions();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try { return JSON.parse(raw) || []; } catch { return []; }
}
function saveSessions(list) {
  state.sessions = list;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function demoSeedSessions() {
  const daysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };
  return [{
    id: "seed-1",
    title: "Sample: Saturday league match review",
    date: daysAgo(6),
    videoName: null,
    tags: [
      { id: "seed-t1", categoryId: "passing", mistakeId: "no-scan-before-pass", timeSec: 312, timeLabel: "5:12", note: "Sample entry — safe to delete" },
      { id: "seed-t2", categoryId: "positioning", mistakeId: "wrong-side-of-defender", timeSec: 745, timeLabel: "12:25", note: "Sample entry — safe to delete" },
      { id: "seed-t3", categoryId: "shooting", mistakeId: "leaning-back-shot", timeSec: 1890, timeLabel: "31:30", note: "Sample entry — safe to delete" }
    ]
  }];
}

/* ---------- Theme ---------- */
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  document.documentElement.setAttribute("data-theme", saved || "light");
  document.getElementById("theme-toggle").addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(THEME_KEY, next);
    renderReportChart();
  });
}

function categoryColor(categoryId) {
  const c = categoryById[categoryId];
  if (!c) return getComputedStyle(document.documentElement).getPropertyValue("--brand").trim();
  return document.documentElement.getAttribute("data-theme") === "dark" ? c.colorDark : c.color;
}

function formatTime(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/* ---------- Video pane ---------- */
function initVideoPane() {
  const fileInput = document.getElementById("video-file-input");
  const dropZone = document.getElementById("video-drop");
  const videoEl = document.getElementById("review-video");
  const timeBadge = document.getElementById("video-time-badge");

  dropZone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    if (state.videoObjectUrl) URL.revokeObjectURL(state.videoObjectUrl);
    state.videoObjectUrl = URL.createObjectURL(file);
    state.current.videoName = file.name;
    videoEl.src = state.videoObjectUrl;
    videoEl.hidden = false;
    dropZone.hidden = true;
    document.getElementById("video-controls-row").hidden = false;
    document.getElementById("video-name-label").textContent = file.name;
  });

  videoEl.addEventListener("timeupdate", () => {
    timeBadge.textContent = formatTime(videoEl.currentTime);
  });

  document.getElementById("mark-moment-btn").addEventListener("click", () => {
    state.pendingTimeSec = state.videoObjectUrl && !videoEl.hidden ? videoEl.currentTime : null;
    if (!videoEl.hidden) videoEl.pause();
    openTagForm();
  });

  document.getElementById("remove-video-btn").addEventListener("click", () => {
    if (state.videoObjectUrl) URL.revokeObjectURL(state.videoObjectUrl);
    state.videoObjectUrl = null;
    state.current.videoName = null;
    videoEl.removeAttribute("src");
    videoEl.load();
    videoEl.hidden = true;
    dropZone.hidden = false;
    document.getElementById("video-controls-row").hidden = true;
    fileInput.value = "";
  });
}

/* ---------- Tag form (used by both the video workspace and the no-video
   "general note" path) ---------- */
function populateTagCategorySelect() {
  const sel = document.getElementById("tag-category");
  sel.innerHTML = SKILL_CATEGORIES.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join("");
}
function populateTagMistakeSelect(categoryId) {
  const sel = document.getElementById("tag-mistake");
  sel.innerHTML = MISTAKES[categoryId].map(m => `<option value="${m.id}">${m.label}</option>`).join("");
  renderTagPreview();
}
function renderTagPreview() {
  const mistakeId = document.getElementById("tag-mistake").value;
  const m = mistakeById[mistakeId];
  const el = document.getElementById("tag-preview");
  if (!m) { el.innerHTML = ""; return; }
  el.innerHTML = `
    <span class="ml-lbl">Why this happens</span>${m.why}
    <span class="ml-lbl">Fix</span>${m.fix}
    <span class="ml-lbl">Drill</span>${m.drill}
  `;
}

function openTagForm() {
  document.getElementById("tag-form").hidden = false;
  const timeSec = state.pendingTimeSec;
  document.getElementById("tag-form-time").textContent = timeSec === null ? "General note (no timestamp)" : `At ${formatTime(timeSec)}`;
  document.getElementById("tag-form").scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function closeTagForm() {
  document.getElementById("tag-form").hidden = true;
  document.getElementById("tag-note").value = "";
  state.pendingTimeSec = null;
}

function initTagForm() {
  populateTagCategorySelect();
  populateTagMistakeSelect(SKILL_CATEGORIES[0].id);

  document.getElementById("tag-category").addEventListener("change", (e) => populateTagMistakeSelect(e.target.value));
  document.getElementById("tag-mistake").addEventListener("change", renderTagPreview);
  document.getElementById("tag-cancel-btn").addEventListener("click", closeTagForm);
  document.getElementById("add-general-note-btn").addEventListener("click", () => {
    state.pendingTimeSec = null;
    openTagForm();
  });

  document.getElementById("tag-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const categoryId = document.getElementById("tag-category").value;
    const mistakeId = document.getElementById("tag-mistake").value;
    const note = document.getElementById("tag-note").value.trim();
    const timeSec = state.pendingTimeSec;
    state.current.tags.push({
      id: makeId(), categoryId, mistakeId,
      timeSec, timeLabel: timeSec === null ? null : formatTime(timeSec),
      note
    });
    closeTagForm();
    renderTimeline();
  });
}

/* ---------- Timeline (current, unsaved session) ---------- */
function renderTimeline() {
  const el = document.getElementById("timeline-list");
  const tags = state.current.tags;
  if (tags.length === 0) {
    el.innerHTML = `<p class="timeline-empty">No moments tagged yet. Mark a moment on the video, or add a general note, to start building this session's report.</p>`;
    return;
  }
  const sorted = [...tags].sort((a, b) => (a.timeSec ?? Infinity) - (b.timeSec ?? Infinity));
  el.innerHTML = sorted.map(t => {
    const m = mistakeById[t.mistakeId];
    const c = categoryById[t.categoryId];
    const canJump = t.timeSec !== null && state.videoObjectUrl;
    return `
      <li class="timeline-item" style="--c:${categoryColor(t.categoryId)}">
        <div class="ti-head">
          <span class="ti-time">${t.timeSec === null ? "General" : t.timeLabel}</span>
          <span class="chip"><span class="chip-dot" style="background:${categoryColor(t.categoryId)}"></span>${c.icon} ${c.name}</span>
        </div>
        <div class="ti-label">${m.label}</div>
        ${t.note ? `<div class="ti-note">"${t.note}"</div>` : ""}
        <div class="ti-actions">
          ${canJump ? `<button data-jump="${t.id}">Jump to ▶</button>` : ""}
          <button class="ti-remove" data-remove="${t.id}">Remove</button>
        </div>
      </li>`;
  }).join("");

  el.querySelectorAll("[data-jump]").forEach(btn => {
    btn.addEventListener("click", () => {
      const tag = state.current.tags.find(t => t.id === btn.dataset.jump);
      const videoEl = document.getElementById("review-video");
      videoEl.currentTime = tag.timeSec;
      videoEl.play();
    });
  });
  el.querySelectorAll("[data-remove]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.current.tags = state.current.tags.filter(t => t.id !== btn.dataset.remove);
      renderTimeline();
    });
  });
}

/* ---------- Session save / new ---------- */
function initSessionControls() {
  document.getElementById("session-date").value = new Date().toISOString().slice(0, 10);

  document.getElementById("save-session-btn").addEventListener("click", () => {
    const title = document.getElementById("session-title").value.trim();
    const date = document.getElementById("session-date").value;
    if (!title) { document.getElementById("session-title").focus(); return; }
    if (state.current.tags.length === 0) return;

    const session = { id: makeId(), title, date, videoName: state.current.videoName, tags: state.current.tags };
    saveSessions([...state.sessions, session]);
    resetCurrentSession();
    renderAll();
  });

  document.getElementById("new-session-btn").addEventListener("click", () => {
    if (state.current.tags.length > 0 && !confirm("Start a new session? Unsaved tagged moments will be lost.")) return;
    resetCurrentSession();
    document.getElementById("remove-video-btn").click();
  });
}

function resetCurrentSession() {
  state.current = { title: "", date: new Date().toISOString().slice(0, 10), videoName: null, tags: [] };
  document.getElementById("session-title").value = "";
  document.getElementById("session-date").value = state.current.date;
  renderTimeline();
}

/* ---------- Quick Analyzer (free text, no video needed) ---------- */
function initAnalyzer() {
  document.getElementById("analyzer-form").addEventListener("submit", (e) => {
    e.preventDefault();
    computeAndRenderAnalysis();
  });
}

function computeAndRenderAnalysis() {
  const raw = document.getElementById("analyzer-input").value.toLowerCase();
  const el = document.getElementById("analyzer-result");

  const scored = ALL_MISTAKES.map(m => {
    const matchedKeywords = m.keywords.filter(k => raw.includes(k));
    return { mistake: m, hits: matchedKeywords.length, matchedKeywords };
  }).filter(s => s.hits > 0).sort((a, b) => b.hits - a.hits);

  if (scored.length === 0) {
    el.innerHTML = `
      <p class="sq-placeholder">No specific pattern matched that description yet. Try adding a bit more detail — what
      happened right before it, and what the actual outcome was — or browse the Skill Library below for the full
      list of recognized mistakes per category.</p>`;
    return;
  }

  const allMatchedKeywords = [...new Set(scored.flatMap(s => s.matchedKeywords))];
  const primary = scored[0];
  const secondary = scored.slice(1, 4);

  function renderBlock({ mistake }, isPrimary) {
    const c = categoryById[mistake.categoryId];
    return `
      <div class="analyzer-match ${isPrimary ? "analyzer-match-primary" : ""}">
        <h3>${isPrimary ? "Primary match" : "Also noticed"} — <span class="chip"><span class="chip-dot" style="background:${categoryColor(mistake.categoryId)}"></span>${c.icon} ${c.name}</span></h3>
        <p style="font-weight:600">${mistake.label}</p>
        <div class="analyzer-body">
          <div><span class="ml-lbl">Why this happens</span>${mistake.why}</div>
          <div><span class="ml-lbl">Fix</span>${mistake.fix}</div>
          <div><span class="ml-lbl">Drill</span>${mistake.drill}</div>
        </div>
        <button class="btn btn-ghost btn-small analyzer-add-btn" data-add-to-session="${mistake.id}">+ Add to current session</button>
        ${isPrimary ? `<button type="button" class="btn btn-ghost btn-small analyzer-add-btn" data-ask-coach-mistake="${mistake.id}">&#9917; Ask Coach about this</button>` : ""}
      </div>`;
  }

  el.innerHTML = `
    <div class="analyzer-keywords">
      <span class="ap-lbl">We picked up on</span>
      ${allMatchedKeywords.map(k => `<span class="chip">${k}</span>`).join("")}
    </div>
    ${renderBlock(primary, true)}
    ${secondary.map(s => renderBlock(s, false)).join("")}
  `;

  el.querySelectorAll("[data-add-to-session]").forEach(btn => {
    btn.addEventListener("click", () => {
      const mistake = mistakeById[btn.dataset.addToSession];
      state.current.tags.push({
        id: makeId(), categoryId: mistake.categoryId, mistakeId: mistake.id,
        timeSec: null, timeLabel: null, note: "From Quick Analyzer text description"
      });
      renderTimeline();
      btn.textContent = "Added ✓";
      btn.disabled = true;
    });
  });

  el.querySelectorAll("[data-ask-coach-mistake]").forEach(btn => {
    btn.addEventListener("click", () => {
      const mistake = mistakeById[btn.dataset.askCoachMistake];
      setCoachContext(mistake.label, `Quick Analyzer matched this description to the mistake "${mistake.label}" (${categoryById[mistake.categoryId].name}). Original description: "${raw}"`);
    });
  });
}

/* ---------- Famous Match Analyzer (searches the fixed FAMOUS_MATCHES
   library in data.js — see the comment there on why this is a curated list
   rather than a live lookup) ---------- */
function normalizeMatchQuery(raw) {
  return raw
    .toLowerCase()
    .replace(/\bversus\b|\bvs\.?\b/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreMatch(query, match) {
  let score = 0;
  match.teams.forEach(team => {
    if (query.includes(team.toLowerCase())) score += 3;
  });
  const yearHit = query.match(/\b(19|20)\d{2}\b/);
  if (yearHit && Number(yearHit[0]) === match.year) score += 3;
  match.aliases.forEach(alias => {
    if (query.includes(alias)) score += 2;
  });
  if (query.includes(match.competition.toLowerCase())) score += 1;
  return score;
}

function findFamousMatches(rawQuery) {
  const query = normalizeMatchQuery(rawQuery);
  if (!query) return [];
  return FAMOUS_MATCHES
    .map(match => ({ match, score: scoreMatch(query, match) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(r => r.match);
}

function populateMatchDatalist() {
  const el = document.getElementById("match-suggestions");
  el.innerHTML = FAMOUS_MATCHES.map(m => `<option value="${m.teams[0]} vs ${m.teams[1]} ${m.year}"></option>`).join("");
}

function clipSearchUrl(match, km) {
  const query = `${match.teams[0]} ${match.teams[1]} ${match.year} ${km.title}`.replace(/['"]/g, "");
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

function renderClip(match, km, uid) {
  if (km.clipVideoId) {
    const start = km.clipStart ? `&start=${km.clipStart}` : "";
    return `
      <div class="clip-toggle-wrap">
        <button type="button" class="btn btn-ghost btn-small clip-toggle-btn" data-clip-toggle="${uid}">&#9654; Watch clip</button>
        <div class="clip-embed" id="clip-${uid}" hidden>
          <iframe width="100%" height="220" loading="lazy" title="${km.title}"
            src="https://www.youtube.com/embed/${km.clipVideoId}?autoplay=1${start}"
            frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        </div>
      </div>`;
  }
  return `<a class="btn btn-ghost btn-small clip-toggle-btn" href="${clipSearchUrl(match, km)}" target="_blank" rel="noopener">&#128269; Find the clip</a>`;
}

function renderMatchCard(match) {
  const clipUidBase = `${match.id}-${Math.random().toString(36).slice(2, 7)}`;
  return `
    <div class="match-card">
      <div class="match-score-banner">
        <div class="match-competition-row">
          <span class="match-competition">${match.competition} · ${match.year}</span>
          <button type="button" class="btn btn-ghost btn-small ask-coach-match-btn" data-ask-coach-match="${match.id}">&#9917; Ask Coach about this match</button>
        </div>
        <h3>${match.teams[0]} <span class="match-vs">vs</span> ${match.teams[1]}</h3>
        <div class="match-score">${match.score}</div>
        <div class="match-meta">${match.date ? `${match.date} · ` : ""}${match.venue}</div>
      </div>
      <p class="match-summary">${match.summary}</p>

      <h4 class="match-subheading">Key moments</h4>
      <ul class="timeline-list match-timeline vertical-timeline">
        ${match.keyMoments.map((km, i) => {
          const c = categoryById[km.categoryId];
          const uid = `${clipUidBase}-${i}`;
          return `
            <li class="timeline-item vt-item" style="--c:${categoryColor(km.categoryId)}">
              <div class="vt-dot" style="background:${categoryColor(km.categoryId)}"></div>
              <div class="vt-body">
                <div class="ti-head">
                  <span class="ti-time">${km.minute}</span>
                  <span class="chip"><span class="chip-dot" style="background:${categoryColor(km.categoryId)}"></span>${c.icon} ${c.name}</span>
                </div>
                <div class="ti-label">${km.title}</div>
                <div class="ti-note">${km.note}</div>
                ${renderClip(match, km, uid)}
              </div>
            </li>`;
        }).join("")}
      </ul>

      <h4 class="match-subheading">Talking points for your own game</h4>
      <div class="match-talking-points">
        ${match.talkingPoints.map(tp => {
          const c = categoryById[tp.categoryId];
          return `
            <div class="analyzer-match">
              <h3><span class="chip"><span class="chip-dot" style="background:${categoryColor(tp.categoryId)}"></span>${c.icon} ${c.name}</span></h3>
              <p style="font-weight:600">${tp.title}</p>
              <div class="analyzer-body"><div>${tp.note}</div></div>
            </div>`;
        }).join("")}
      </div>
    </div>`;
}

function wireMatchCardInteractions(el) {
  el.querySelectorAll("[data-clip-toggle]").forEach(btn => {
    btn.addEventListener("click", () => {
      const uid = btn.dataset.clipToggle;
      const wrap = document.getElementById(`clip-${uid}`);
      const opening = wrap.hidden;
      wrap.hidden = !opening;
      btn.innerHTML = opening ? "&#9660; Hide clip" : "&#9654; Watch clip";
    });
  });
  el.querySelectorAll("[data-ask-coach-match]").forEach(btn => {
    btn.addEventListener("click", () => {
      const match = matchById[btn.dataset.askCoachMatch];
      setCoachContext(`${match.teams[0]} vs ${match.teams[1]} (${match.year})`,
        `The user is looking at the famous match "${match.teams[0]} vs ${match.teams[1]}" (${match.competition}, ${match.year}). Summary: ${match.summary}`);
    });
  });
}

function renderMatchSuggestions(matches) {
  return `
    <p class="sq-placeholder">No exact match for that yet — did you mean one of these?</p>
    <div class="match-suggestion-list">
      ${matches.map(m => `<button type="button" class="btn btn-ghost btn-small" data-load-match="${m.id}">${m.teams[0]} vs ${m.teams[1]} (${m.year})</button>`).join("")}
    </div>`;
}

function loadFamousMatch(matchId) {
  const match = matchById[matchId];
  if (!match) return;
  document.getElementById("match-analyzer-input").value = `${match.teams[0]} vs ${match.teams[1]} ${match.year}`;
  const el = document.getElementById("match-analyzer-result");
  el.innerHTML = renderMatchCard(match);
  wireMatchCardInteractions(el);
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function computeAndRenderMatchAnalysis() {
  const raw = document.getElementById("match-analyzer-input").value;
  const el = document.getElementById("match-analyzer-result");
  const results = findFamousMatches(raw);

  if (results.length === 0) {
    el.innerHTML = `
      <p class="sq-placeholder">Couldn't find that in the match library yet. Try a team name and a year (e.g. "Argentina vs France 2022"),
      or browse the full library below.</p>`;
    return;
  }

  const [top, ...rest] = results;
  const closeAlternatives = rest.filter(m => m.id !== top.id).slice(0, 3);
  el.innerHTML = renderMatchCard(top) + (closeAlternatives.length ? renderMatchSuggestions(closeAlternatives) : "");
  wireMatchCardInteractions(el);
  el.querySelectorAll("[data-load-match]").forEach(btn => {
    btn.addEventListener("click", () => loadFamousMatch(btn.dataset.loadMatch));
  });
}

function initMatchAnalyzer() {
  populateMatchDatalist();
  document.getElementById("match-analyzer-form").addEventListener("submit", (e) => {
    e.preventDefault();
    computeAndRenderMatchAnalysis();
  });
}

function renderMatchLibrary() {
  const el = document.getElementById("match-library-grid");
  el.innerHTML = FAMOUS_MATCHES.map(m => `
    <div class="category-card match-library-card" style="--c:var(--brand)">
      <h3>${m.teams[0]} vs ${m.teams[1]}</h3>
      <div class="count">${m.competition} · ${m.year}</div>
      <button type="button" class="btn btn-ghost btn-small" data-load-match="${m.id}">View analysis</button>
    </div>`).join("");
  el.querySelectorAll("[data-load-match]").forEach(btn => {
    btn.addEventListener("click", () => loadFamousMatch(btn.dataset.loadMatch));
  });
}

/* ---------- Skill Library ---------- */
function renderLibrary() {
  const el = document.getElementById("library-grid");
  el.innerHTML = SKILL_CATEGORIES.map(c => {
    const mistakes = MISTAKES[c.id];
    return `
      <div class="category-card" style="--c:${categoryColor(c.id)}">
        <h3>${c.icon} ${c.name}</h3>
        <div class="count">${mistakes.length} common mistakes</div>
        <ul class="mistake-list">
          ${mistakes.map(m => `
            <li class="mistake-item">
              <details>
                <summary>${m.label}</summary>
                <div class="mistake-body">
                  <div><span class="ml-lbl">Why</span>${m.why}</div>
                  <div><span class="ml-lbl">Fix</span>${m.fix}</div>
                  <div><span class="ml-lbl">Drill</span>${m.drill}</div>
                </div>
              </details>
            </li>`).join("")}
        </ul>
      </div>`;
  }).join("");
}

/* ---------- Report (aggregated across all saved sessions) ---------- */
function renderStatTiles() {
  const el = document.getElementById("stat-tiles");
  const sessions = state.sessions;
  const totalTags = sessions.reduce((sum, s) => sum + s.tags.length, 0);

  const counts = {};
  sessions.forEach(s => s.tags.forEach(t => { counts[t.categoryId] = (counts[t.categoryId] || 0) + 1; }));
  const topCategoryId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topCategoryLabel = topCategoryId ? categoryById[topCategoryId].name : "—";

  const lastDate = sessions.length ? [...sessions].sort((a, b) => b.date.localeCompare(a.date))[0].date : "—";

  const tiles = [
    { num: String(sessions.length), lbl: "Sessions logged" },
    { num: String(totalTags), lbl: "Moments tagged" },
    { num: topCategoryLabel, lbl: "Most common category to work on" },
    { num: lastDate, lbl: "Most recent session" }
  ];
  el.innerHTML = tiles.map(t => `<div class="stat-tile"><div class="num">${t.num}</div><div class="lbl">${t.lbl}</div></div>`).join("");
}

function renderReportChart() {
  const canvas = document.getElementById("report-chart");
  const empty = document.getElementById("report-empty");
  const counts = {};
  state.sessions.forEach(s => s.tags.forEach(t => { counts[t.categoryId] = (counts[t.categoryId] || 0) + 1; }));
  const items = SKILL_CATEGORIES
    .map(c => ({ label: c.name, value: counts[c.id] || 0, color: categoryColor(c.id) }))
    .filter(i => i.value > 0)
    .sort((a, b) => b.value - a.value);

  if (items.length === 0) {
    canvas.hidden = true;
    empty.hidden = false;
    return;
  }
  canvas.hidden = false;
  empty.hidden = true;
  renderHorizontalBarChart("report-chart", { items, unit: "tagged" });
}

/* ---------- History ---------- */
function renderHistoryFilterOptions() {
  const sel = document.getElementById("history-filter");
  const options = [{ id: "all", name: "All categories" }, ...SKILL_CATEGORIES];
  sel.innerHTML = options.map(o => `<option value="${o.id}" ${state.historyFilter === o.id ? "selected" : ""}>${o.icon ? o.icon + " " : ""}${o.name}</option>`).join("");
  sel.onchange = () => { state.historyFilter = sel.value; renderHistoryList(); };
}

function renderHistoryList() {
  const el = document.getElementById("history-list");
  const sessions = [...state.sessions].sort((a, b) => b.date.localeCompare(a.date));

  if (sessions.length === 0) {
    el.innerHTML = `<p class="sq-placeholder">No sessions saved yet. Tag some moments above and hit "Save session".</p>`;
    return;
  }

  el.innerHTML = sessions.map(s => {
    const tags = state.historyFilter === "all" ? s.tags : s.tags.filter(t => t.categoryId === state.historyFilter);
    if (state.historyFilter !== "all" && tags.length === 0) return "";
    return `
      <div class="category-card" style="--c:var(--brand)">
        <h3>${s.title}</h3>
        <div class="count">${s.date} · ${s.tags.length} moment${s.tags.length === 1 ? "" : "s"} tagged${s.videoName ? ` · ${s.videoName}` : ""}</div>
        <ul class="mistake-list">
          ${tags.map(t => {
            const m = mistakeById[t.mistakeId];
            const c = categoryById[t.categoryId];
            return `
              <li class="mistake-item">
                <details>
                  <summary>${t.timeSec === null ? "General" : t.timeLabel} — ${m.label}</summary>
                  <div class="mistake-body">
                    <div><span class="chip"><span class="chip-dot" style="background:${categoryColor(t.categoryId)}"></span>${c.icon} ${c.name}</span></div>
                    <div><span class="ml-lbl">Why</span>${m.why}</div>
                    <div><span class="ml-lbl">Fix</span>${m.fix}</div>
                    <div><span class="ml-lbl">Drill</span>${m.drill}</div>
                    ${t.note ? `<div><span class="ml-lbl">Note</span>${t.note}</div>` : ""}
                  </div>
                </details>
              </li>`;
          }).join("")}
        </ul>
        <button class="btn btn-ghost btn-small clear-btn" data-delete-session="${s.id}">Delete session</button>
      </div>`;
  }).join("");

  el.querySelectorAll("[data-delete-session]").forEach(btn => {
    btn.addEventListener("click", () => {
      saveSessions(state.sessions.filter(s => s.id !== btn.dataset.deleteSession));
      renderAll();
    });
  });
}

function initClearData() {
  document.getElementById("clear-data-btn").addEventListener("click", () => {
    if (!confirm("Delete every saved session in this browser? This can't be undone.")) return;
    saveSessions([]);
    renderAll();
  });
}

/* ---------- Render everything ---------- */
function renderAll() {
  renderStatTiles();
  renderReportChart();
  renderHistoryFilterOptions();
  renderHistoryList();
}

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  state.sessions = loadSessions();
  resetCurrentSession();
  initVideoPane();
  initTagForm();
  initSessionControls();
  initAnalyzer();
  initMatchAnalyzer();
  initCoach();
  initClearData();
  renderLibrary();
  renderMatchLibrary();
  renderAll();
});

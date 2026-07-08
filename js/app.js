/* Rooted — app wiring: tabs, theme, SQ calculator, wellness advisor,
   community hub, dashboard charts, team roles. */

const state = {
  activeTab: "home",
  communityFilter: "all"
};

/* ---------- Theme ---------- */
function initTheme() {
  const saved = localStorage.getItem("rooted-theme");
  const theme = saved || "light";
  document.documentElement.setAttribute("data-theme", theme);
  document.getElementById("theme-toggle").addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("rooted-theme", next);
    if (state.activeTab === "dashboard") renderDashboardCharts();
  });
}

function currentCountryColor(country) {
  return document.documentElement.getAttribute("data-theme") === "dark" ? country.colorDark : country.color;
}

/* ---------- Tabs ---------- */
function switchTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll(".tab-btn").forEach(b => {
    const isActive = b.dataset.tab === tab;
    b.classList.toggle("active", isActive);
    b.setAttribute("aria-selected", String(isActive));
  });
  document.querySelectorAll(".tab-panel").forEach(p => {
    p.classList.toggle("active", p.id === `tab-${tab}`);
  });
  if (tab === "dashboard") renderDashboardCharts();
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

function initTabs() {
  document.querySelectorAll(".tab-btn").forEach(b => {
    b.addEventListener("click", () => switchTab(b.dataset.tab));
  });
  document.querySelectorAll("[data-goto]").forEach(b => {
    b.addEventListener("click", () => switchTab(b.dataset.goto));
  });
  window.addEventListener("resize", debounce(() => {
    if (state.activeTab === "dashboard") renderDashboardCharts();
  }, 200));
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* ---------- Home ---------- */
function renderCountryStrip() {
  const el = document.getElementById("country-strip");
  el.innerHTML = COUNTRIES.map(c => `
    <div class="country-chip" title="${c.heritageNote}">
      <span class="country-dot" style="background:${currentCountryColor(c)}"></span>
      <span>${c.flag}</span>
      <strong>${c.name}</strong>
      <span class="heritage">— ${c.heritage}</span>
    </div>
  `).join("");
}

/* ---------- SQ Prototype ---------- */
const SQ_HISTORY_KEY = "rooted-sq-history";
const SQ_HISTORY_MAX = 8;
const SQ_FIELD_IDS = { workout: "sq-workout", gear: "sq-gear", travel: "sq-travel", recovery: "sq-recovery" };

function initSqForm() {
  const countrySel = document.getElementById("sq-country");
  countrySel.innerHTML = COUNTRIES.map(c => `<option value="${c.id}">${c.flag} ${c.name}</option>`).join("");

  fillSelect(SQ_FIELD_IDS.workout, SQ_OPTIONS.workout);
  fillSelect(SQ_FIELD_IDS.gear, SQ_OPTIONS.gear);
  fillSelect(SQ_FIELD_IDS.travel, SQ_OPTIONS.travel);
  fillSelect(SQ_FIELD_IDS.recovery, SQ_OPTIONS.recovery);

  document.getElementById("sq-form").addEventListener("submit", (e) => {
    e.preventDefault();
    computeAndRenderSq();
  });

  renderFormulaExplainer();
}

function fillSelect(id, options) {
  const el = document.getElementById(id);
  el.innerHTML = options.map((o, i) => `<option value="${i}">${o.label} (${o.points} pts)</option>`).join("");
}

/* ---- SQ history: last SQ_HISTORY_MAX results, kept per-browser so the
   result can show a trend and a same-device comparison over repeat use. ---- */
function getSqHistory() {
  try { return JSON.parse(localStorage.getItem(SQ_HISTORY_KEY)) || []; } catch { return []; }
}
function pushSqHistory(entry) {
  const history = [...getSqHistory(), entry].slice(-SQ_HISTORY_MAX);
  localStorage.setItem(SQ_HISTORY_KEY, JSON.stringify(history));
  return history;
}

function sqSparklineSvg(history) {
  if (history.length < 2) return "";
  const w = 168, h = 34, pad = 4;
  const step = (w - pad * 2) / (history.length - 1);
  const points = history.map((entry, i) => {
    const x = pad + i * step;
    const y = pad + (1 - entry.score / 100) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const last = history[history.length - 1];
  const lastX = pad + (history.length - 1) * step;
  const lastY = pad + (1 - last.score / 100) * (h - pad * 2);
  return `
    <svg class="sq-sparkline" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Trend of your last ${history.length} SQ scores">
      <polyline points="${points}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="3" fill="currentColor" />
    </svg>`;
}

function computeAndRenderSq() {
  const countryId = document.getElementById("sq-country").value;
  const selections = SQ_CATEGORY_META.map(meta => {
    const idx = Number(document.getElementById(SQ_FIELD_IDS[meta.key]).value);
    const chosen = SQ_OPTIONS[meta.key][idx];
    const best = SQ_OPTIONS[meta.key].reduce((a, b) => (b.points > a.points ? b : a));
    return { ...meta, chosen, best, gap: best.points - chosen.points, pct: chosen.points / meta.max };
  });

  const score = selections.reduce((sum, s) => sum + s.chosen.points, 0);
  const tier = SQ_TIERS.find(t => score >= t.min && score <= t.max);
  const tierIndex = SQ_TIERS.indexOf(tier);
  const nextTier = tierIndex > 0 ? SQ_TIERS[tierIndex - 1] : null;
  const country = countryById[countryId];
  const practice = CULTURAL_PRACTICES[countryId];

  const priorHistory = getSqHistory();
  const previous = priorHistory[priorHistory.length - 1];
  const history = pushSqHistory({ score, countryId, ts: Date.now() });

  const biggestOpportunity = selections.filter(s => s.gap > 0).sort((a, b) => b.gap - a.gap)[0];
  const vsAverage = score - SQ_COMMUNITY_AVERAGE;
  const vsPrevious = previous ? score - previous.score : null;
  const pointsToNextTier = nextTier ? Math.max(nextTier.min - score, 0) : 0;

  const el = document.getElementById("sq-result");
  el.innerHTML = `
    <div class="sq-score-head">
      <span class="sq-badge">${tier.badge}</span>
      <div>
        <div class="sq-score-num">${score}<span style="font-size:14px;color:var(--muted)"> / 100</span></div>
        <div class="sq-tier-name">${tier.name}</div>
      </div>
      ${history.length > 1 ? `<div class="sq-history"><span class="sq-history-lbl">Last ${history.length}</span>${sqSparklineSvg(history)}</div>` : ""}
    </div>
    <div class="sq-bar-track"><div class="sq-bar-fill" style="width:${score}%;background:${currentCountryColor(country)}"></div></div>
    <p class="sq-tier-desc">${tier.description}</p>

    <div class="sq-compare-row">
      <span class="sq-compare-pill ${vsAverage >= 0 ? "kpi-good" : "kpi-warn"}">${vsAverage >= 0 ? "▲" : "▼"} ${Math.abs(vsAverage)} pt${Math.abs(vsAverage) === 1 ? "" : "s"} vs. community average (${SQ_COMMUNITY_AVERAGE})</span>
      ${vsPrevious !== null ? `<span class="sq-compare-pill ${vsPrevious >= 0 ? "kpi-good" : "kpi-warn"}">${vsPrevious >= 0 ? "▲" : "▼"} ${Math.abs(vsPrevious)} pt${Math.abs(vsPrevious) === 1 ? "" : "s"} vs. your last score</span>` : ""}
      ${nextTier ? `<span class="sq-compare-pill">${pointsToNextTier} pt${pointsToNextTier === 1 ? "" : "s"} to ${nextTier.badge} ${nextTier.name}</span>` : `<span class="sq-compare-pill kpi-good">Top tier reached</span>`}
    </div>

    <div class="sq-breakdown-detailed">
      ${selections.map(s => `
        <div class="sq-cat-row">
          <div class="sq-cat-head">
            <span>${s.icon} ${s.label}</span>
            <strong>${s.chosen.points}/${s.max}</strong>
          </div>
          <div class="sq-bar-track sq-bar-track-sm"><div class="sq-bar-fill" style="width:${Math.round(s.pct * 100)}%;background:${currentCountryColor(country)}"></div></div>
          <p class="sq-cat-why">${s.chosen.why}</p>
        </div>`).join("")}
    </div>

    ${biggestOpportunity ? `
      <div class="sq-opportunity">
        <h4>Biggest opportunity — ${biggestOpportunity.icon} ${biggestOpportunity.label}</h4>
        <p>Swapping "${biggestOpportunity.chosen.label}" for "${biggestOpportunity.best.label}" would add
        <strong>+${biggestOpportunity.gap} pt${biggestOpportunity.gap === 1 ? "" : "s"}</strong>
        ${score + biggestOpportunity.gap >= (nextTier ? nextTier.min : score) && nextTier ? ` — enough on its own to reach ${nextTier.badge} ${nextTier.name}.` : "."}
        ${biggestOpportunity.best.why}</p>
      </div>` : `
      <div class="sq-opportunity sq-opportunity-max">
        <h4>Every category is already at its best option</h4>
        <p>There's no single swap left that would raise this score — the only lever left is repeating this pattern consistently.</p>
      </div>`}

    <div class="sq-reco">
      <h4>Recommended cultural practice — ${country.name}</h4>
      <p style="margin:0">${practice}</p>
    </div>
  `;
}

function renderFormulaExplainer() {
  const el = document.getElementById("formula-explainer");
  el.innerHTML = `
    <p><strong>SQ = ${SQ_CATEGORY_META.map(m => `${m.label} (max ${m.max})`).join(" + ")}</strong>, capped at 100.</p>
    <table class="scale-table">
      <tr><th>Score range</th><th>Tier</th><th>What it means</th></tr>
      ${SQ_TIERS.slice().reverse().map(t => `<tr><td>${t.min}–${t.max}</td><td>${t.badge} ${t.name}</td><td>${t.description}</td></tr>`).join("")}
    </table>
    <p style="margin-top:10px">Every input maps to a fixed, published point value (see the dropdown options, each with a one-line
    "why" behind its score) — the score is fully reproducible by hand. Each result also shows which single category has the most
    room to improve, how you compare to the community average, and a sparkline of your last ${SQ_HISTORY_MAX} results on this device.</p>
  `;
}

/* ---------- Wellness Advisor ---------- */
function initAdvisor() {
  const countrySel = document.getElementById("advisor-country");
  countrySel.innerHTML += COUNTRIES.map(c => `<option value="${c.id}">${c.flag} ${c.name}</option>`).join("");

  document.getElementById("advisor-form").addEventListener("submit", (e) => {
    e.preventDefault();
    computeAndRenderAdvice();
  });
}

/* Purely lexical, non-diagnostic signal: counts modifier words alongside a
   matched concern to shade tone (more "this sounds like it's really
   affecting you" vs. clinical severity). See HEALTH_INTENSITY_MODIFIERS. */
function detectIntensity(raw) {
  const hits = HEALTH_INTENSITY_MODIFIERS.filter(m => raw.includes(m)).length;
  if (hits === 0) return { level: "Mild", hits, note: "Sounds like an everyday concern rather than something acute." };
  if (hits <= 2) return { level: "Moderate", hits, note: "The way this is described suggests it's a noticeable, recurring concern worth actively addressing." };
  return { level: "Elevated", hits, note: "The language here suggests this has been persistent or intense — the action plan below leans toward starting today, and the 'when to seek help' guidance is worth reading." };
}

function computeAndRenderAdvice() {
  const raw = document.getElementById("advisor-input").value.toLowerCase();
  const focusCountry = document.getElementById("advisor-country").value;
  const el = document.getElementById("advisor-result");

  const hasRedFlag = HEALTH_RED_FLAGS.some(flag => raw.includes(flag));
  if (hasRedFlag) {
    el.innerHTML = `
      <div class="disclaimer-banner urgent">
        <strong>This may need urgent, real-world help.</strong> If this is a medical emergency,
        contact local emergency services or a crisis helpline right now. This app is a wellness
        prototype and cannot provide emergency or clinical care.
      </div>`;
    return;
  }

  const scored = HEALTH_CONCERNS.map(concern => {
    const matchedKeywords = concern.keywords.filter(k => raw.includes(k));
    return { concern, hits: matchedKeywords.length, matchedKeywords };
  }).filter(s => s.hits > 0).sort((a, b) => b.hits - a.hits);

  const countriesToShow = focusCountry === "all" ? COUNTRIES : [countryById[focusCountry]];

  if (scored.length === 0) {
    el.innerHTML = `
      <div class="disclaimer-banner">
        <strong>Not medical advice.</strong> General wellness suggestions only — see a professional for persistent or severe symptoms.
      </div>
      <p>No specific match found for that description yet — here's a general cultural practice from each region to try. Try adding
      a bit more detail (e.g. what you're feeling and for how long) for a more tailored match.</p>
      <div class="advisor-cards">
        ${countriesToShow.map(c => `
          <div class="advisor-card" style="--c:${currentCountryColor(c)}">
            <h4>${c.flag} ${c.name} — ${c.heritage}</h4>
            <p>${CULTURAL_PRACTICES[c.id]}</p>
          </div>`).join("")}
      </div>`;
    return;
  }

  const intensity = detectIntensity(raw);
  const intensityClass = intensity.level === "Elevated" ? "kpi-bad" : intensity.level === "Moderate" ? "kpi-warn" : "kpi-good";
  const allMatchedKeywords = [...new Set(scored.flatMap(s => s.matchedKeywords))];

  const matchedIds = new Set(scored.map(s => s.concern.id));
  const combos = HEALTH_CONCERN_COMBOS.filter(c => c.ids.every(id => matchedIds.has(id)));

  const primary = scored[0];
  const secondary = scored.slice(1, 4);

  function renderConcernBlock({ concern }, isPrimary) {
    return `
      <div class="advisor-match ${isPrimary ? "advisor-match-primary" : ""}">
        <h3>${isPrimary ? "Primary match — " : "Also noticed — "}${concern.label}</h3>
        <p class="advisor-general">${concern.generalAdvice}</p>
        <div class="advisor-action-plan">
          <div><span class="ap-lbl">Try today</span>${concern.actionPlan.today}</div>
          <div><span class="ap-lbl">This week</span>${concern.actionPlan.thisWeek}</div>
          <div><span class="ap-lbl">When to seek help</span>${concern.actionPlan.whenToSeekHelp}</div>
        </div>
        <div class="advisor-cards">
          ${countriesToShow.map(c => `
            <div class="advisor-card" style="--c:${currentCountryColor(c)}">
              <h4>${c.flag} ${c.name}</h4>
              <p>${concern.practices[c.id]}</p>
            </div>`).join("")}
        </div>
      </div>`;
  }

  el.innerHTML = `
    <div class="disclaimer-banner">
      <strong>Not medical advice.</strong> General wellness suggestions only — see a professional for persistent or severe symptoms.
    </div>

    <div class="advisor-analysis">
      <div class="advisor-keywords">
        <span class="ap-lbl">We picked up on</span>
        ${allMatchedKeywords.map(k => `<span class="advisor-chip">${k}</span>`).join("")}
      </div>
      <div class="advisor-intensity">
        <span class="kpi-pill ${intensityClass}">${intensity.level}</span>
        <span class="advisor-intensity-note">${intensity.note}</span>
      </div>
    </div>

    ${combos.length > 0 ? `
      <div class="advisor-combo">
        <h4>How these connect</h4>
        ${combos.map(c => `<p>${c.note}</p>`).join("")}
      </div>` : ""}

    ${renderConcernBlock(primary, true)}
    ${secondary.map(s => renderConcernBlock(s, false)).join("")}
  `;
}

/* ---------- Community Hub: self-guided Cultural Practice Library ----------
   Built from CULTURAL_PRACTICES + HEALTH_CONCERNS (see js/data.js) rather
   than a separate hand-authored partner list — there is no outside
   organization behind this content, so nothing here should claim one. */
function buildPracticeLibrary() {
  return COUNTRIES.map(c => ({
    country: c,
    items: [
      { label: "General recovery", text: CULTURAL_PRACTICES[c.id] },
      ...HEALTH_CONCERNS.map(concern => ({ label: concern.label, text: concern.practices[c.id] }))
    ]
  }));
}

function practiceLibraryCount() {
  return COUNTRIES.length * (HEALTH_CONCERNS.length + 1);
}

function renderCommunityFilters() {
  const el = document.getElementById("community-filters");
  const chips = [{ id: "all", name: "All countries" }, ...COUNTRIES];
  el.innerHTML = chips.map(c => `
    <button class="filter-chip ${state.communityFilter === c.id ? "active" : ""}" data-filter="${c.id}">
      ${c.flag ? c.flag + " " : ""}${c.name}
    </button>`).join("");
  el.querySelectorAll(".filter-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      state.communityFilter = btn.dataset.filter;
      renderCommunityFilters();
      renderCommunityGrid();
    });
  });
}

function renderCommunityGrid() {
  const el = document.getElementById("community-list");
  const library = buildPracticeLibrary().filter(entry => state.communityFilter === "all" || entry.country.id === state.communityFilter);
  el.innerHTML = library.map(entry => {
    const c = entry.country;
    return `
      <div class="event-card practice-card" style="--c:${currentCountryColor(c)}">
        <h3>${c.flag} ${c.name} — ${c.heritage}</h3>
        <div class="meta">In-house content · no outside affiliation</div>
        <div class="desc">${c.heritageNote}</div>
        <div class="programs-lbl">Practice library</div>
        <ul class="programs-list">${entry.items.map(i => `<li><strong>${i.label}:</strong> ${i.text}</li>`).join("")}</ul>
      </div>`;
  }).join("");
}

/* ---------- Dashboard ---------- */
function renderStatTiles() {
  const el = document.getElementById("stat-tiles");
  const co2PilotTotal = Object.values(CO2_SAVED_BY_COUNTRY).flat().reduce((a, b) => a + b, 0);
  el.innerHTML = STAT_TILES.map(s => {
    let value = s.value;
    if (s.compute === "co2PilotTotal") value = `${co2PilotTotal.toLocaleString()} kg`;
    if (s.compute === "practiceLibraryCount") value = String(practiceLibraryCount());
    if (s.compute === "communityAvgSq") value = `${SQ_COMMUNITY_AVERAGE} / 100`;
    return `
      <div class="stat-tile">
        <div class="num">${value}</div>
        <div class="lbl">${s.label}</div>
      </div>`;
  }).join("");
}

function renderDashboardCharts() {
  const co2Series = COUNTRIES.map(c => ({
    id: c.id, name: c.name, color: currentCountryColor(c), data: CO2_SAVED_BY_COUNTRY[c.id]
  }));
  renderGroupedBarChart("co2-chart", { labels: MONTHLY_LABELS, series: co2Series, unit: "kg" });
  renderLegend("co2-legend", co2Series.map(s => ({ color: s.color, name: s.name })));
  renderGroupedTable("co2-table-wrap", { labels: MONTHLY_LABELS, series: co2Series, unit: "kg" });

  const oppItems = COUNTRIES.map(c => ({
    label: c.name, value: MARKET_OPPORTUNITY_INDEX[c.id], color: currentCountryColor(c)
  }));
  renderHorizontalBarChart("opportunity-chart", { items: oppItems, unit: "" });
  renderLegend("opportunity-legend", oppItems.map(i => ({ color: i.color, name: i.label })));
  renderListTable("opportunity-table-wrap", { items: oppItems, unit: "" });
}

function initTableToggles() {
  document.querySelectorAll("[data-table-toggle]").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.tableToggle;
      const canvas = document.getElementById(key === "co2" ? "co2-chart" : "opportunity-chart");
      const legend = document.getElementById(key === "co2" ? "co2-legend" : "opportunity-legend");
      const tableWrap = document.getElementById(`${key}-table-wrap`);
      const showingTable = !tableWrap.hidden;
      tableWrap.hidden = showingTable;
      canvas.hidden = !showingTable;
      legend.hidden = !showingTable;
      btn.textContent = showingTable ? "View as table" : "View as chart";
    });
  });
}

/* ---------- Team ---------- */
function renderTeam() {
  const el = document.getElementById("team-grid");
  el.innerHTML = TEAM_ROLES.map((t, i) => {
    const c = COUNTRIES[i % COUNTRIES.length];
    return `
      <div class="team-card" style="--c:${currentCountryColor(c)}">
        <h3>${t.role}</h3>
        <div class="scope">${t.scope}</div>
        <div class="team-name">${t.name}</div>
      </div>`;
  }).join("");
}

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initTabs();
  renderCountryStrip();
  initSqForm();
  initAdvisor();
  initCommunityConnect();
  renderCommunityFilters();
  renderCommunityGrid();
  renderStatTiles();
  initTableToggles();
  renderTeam();
});

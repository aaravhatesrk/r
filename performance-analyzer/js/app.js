/* Athlyze — app wiring: theme, entry logging, personal bests, progress
   trend chart, history table, .xlsx export. All state lives in this
   browser's localStorage under STORAGE_KEY (see js/data.js) — there is no
   server and no account system. */

const state = {
  entries: [],
  progressCombo: null,
  historyFilter: "all"
};

function makeId() {
  return crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/* ---------- Storage ---------- */
function loadEntries() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    const seeded = demoSeedEntries();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try { return JSON.parse(raw) || []; } catch { return []; }
}
function saveEntries(list) {
  state.entries = list;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/* ---------- Theme ---------- */
function initTheme() {
  const saved = localStorage.getItem("athlyze-theme");
  document.documentElement.setAttribute("data-theme", saved || "light");
  document.getElementById("theme-toggle").addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("athlyze-theme", next);
    renderProgressChart();
  });
}

function sportColor(sportId) {
  const s = sportById[sportId];
  if (!s) return getComputedStyle(document.documentElement).getPropertyValue("--brand").trim();
  return document.documentElement.getAttribute("data-theme") === "dark" ? s.colorDark : s.color;
}

/* ---------- Derived data ---------- */
function comboKey(e) { return `${e.sportId}::${e.metricLabel}`; }

function groupByCombo(entries) {
  const map = new Map();
  entries.forEach(e => {
    const key = comboKey(e);
    if (!map.has(key)) {
      map.set(key, { key, sportId: e.sportId, sportName: e.sportName, metricLabel: e.metricLabel, unit: e.unit, lowerIsBetter: e.lowerIsBetter, entries: [] });
    }
    map.get(key).entries.push(e);
  });
  map.forEach(g => g.entries.sort((a, b) => a.date.localeCompare(b.date)));
  return map;
}

function bestOf(group) {
  const values = group.entries.map(e => e.value);
  const best = group.lowerIsBetter ? Math.min(...values) : Math.max(...values);
  const bestEntry = group.entries.find(e => e.value === best);
  return { best, bestDate: bestEntry ? bestEntry.date : null };
}

function distinctSportCount(entries) {
  return new Set(entries.map(e => e.sportId)).size;
}

/* ---------- Stat tiles ---------- */
function renderStatTiles() {
  const el = document.getElementById("stat-tiles");
  const entries = state.entries;
  const groups = groupByCombo(entries);

  let latestImprovementLabel = "—";
  if (entries.length >= 2) {
    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
    const latest = sorted[0];
    const group = groups.get(comboKey(latest));
    if (group && group.entries.length >= 2) {
      const idx = group.entries.findIndex(e => e.id === latest.id);
      if (idx > 0) {
        const prev = group.entries[idx - 1];
        const pct = pctChange(prev.value, latest.value, latest.lowerIsBetter);
        latestImprovementLabel = `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
      }
    }
  }

  const tiles = [
    { num: String(entries.length), lbl: "Entries logged" },
    { num: String(distinctSportCount(entries)), lbl: "Sports tracked" },
    { num: String(groups.size), lbl: "Personal bests tracked" },
    { num: latestImprovementLabel, lbl: "Most recent entry's change" }
  ];
  el.innerHTML = tiles.map(t => `<div class="stat-tile"><div class="num">${t.num}</div><div class="lbl">${t.lbl}</div></div>`).join("");
}

function pctChange(from, to, lowerIsBetter) {
  if (!from) return 0;
  return lowerIsBetter ? ((from - to) / from) * 100 : ((to - from) / from) * 100;
}

/* ---------- Personal bests ---------- */
function renderPRGrid() {
  const el = document.getElementById("pr-grid");
  const groups = Array.from(groupByCombo(state.entries).values())
    .sort((a, b) => b.entries.length - a.entries.length);

  if (groups.length === 0) {
    el.innerHTML = `<p class="sq-placeholder">Log your first entry above to see personal bests here.</p>`;
    return;
  }

  el.innerHTML = groups.map(g => {
    const { best, bestDate } = bestOf(g);
    const sport = sportById[g.sportId];
    return `
      <div class="pr-card" style="--c:${sportColor(g.sportId)}">
        <div class="pr-sport">${sport ? sport.icon + " " + sport.name : g.sportName}</div>
        <div class="pr-metric">${g.metricLabel}</div>
        <div><span class="pr-value">${best}</span><span class="pr-unit">${g.unit}</span></div>
        <div class="pr-meta">Best on ${bestDate} · logged ${g.entries.length} time${g.entries.length === 1 ? "" : "s"}</div>
      </div>`;
  }).join("");
}

/* ---------- Progress chart ---------- */
function renderProgressControls() {
  const sel = document.getElementById("progress-combo");
  const groups = Array.from(groupByCombo(state.entries).values());
  if (!state.progressCombo || !groups.some(g => g.key === state.progressCombo)) {
    const withMulti = groups.filter(g => g.entries.length >= 2);
    state.progressCombo = (withMulti[0] || groups[0] || {}).key || null;
  }
  sel.innerHTML = groups.map(g => {
    const sport = sportById[g.sportId];
    const label = `${sport ? sport.icon + " " : ""}${g.sportName} — ${g.metricLabel}`;
    return `<option value="${g.key}" ${g.key === state.progressCombo ? "selected" : ""}>${label}</option>`;
  }).join("") || `<option value="">No entries yet</option>`;
  sel.onchange = () => { state.progressCombo = sel.value; renderProgressChart(); };
}

function renderProgressChart() {
  const canvas = document.getElementById("progress-chart");
  const emptyMsg = document.getElementById("progress-empty");
  const trendPill = document.getElementById("progress-trend");
  const groups = groupByCombo(state.entries);
  const group = groups.get(state.progressCombo);

  if (!group || group.entries.length < 2) {
    canvas.hidden = true;
    emptyMsg.hidden = false;
    trendPill.hidden = true;
    renderLegend("progress-legend", []);
    return;
  }
  canvas.hidden = false;
  emptyMsg.hidden = true;

  const labels = group.entries.map(e => e.date);
  const series = [{ id: group.key, name: group.metricLabel, color: sportColor(group.sportId), data: group.entries.map(e => e.value) }];
  renderLineChart("progress-chart", { labels, series, unit: group.unit });
  renderLegend("progress-legend", series.map(s => ({ color: s.color, name: `${group.sportName} — ${s.name}` })));

  const first = group.entries[0].value;
  const last = group.entries[group.entries.length - 1].value;
  const pct = pctChange(first, last, group.lowerIsBetter);
  trendPill.hidden = false;
  trendPill.className = `trend-pill ${pct > 0.05 ? "trend-up" : pct < -0.05 ? "trend-down" : "trend-flat"}`;
  trendPill.textContent = `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}% since first log (${first}${group.unit} → ${last}${group.unit})`;
}

/* ---------- History ---------- */
function renderHistoryFilterOptions() {
  const sel = document.getElementById("history-filter");
  const usedSportIds = Array.from(new Set(state.entries.map(e => e.sportId)));
  const options = [{ id: "all", name: "All sports" }, ...usedSportIds.map(id => sportById[id] || { id, name: id })];
  sel.innerHTML = options.map(o => `<option value="${o.id}" ${state.historyFilter === o.id ? "selected" : ""}>${o.name}</option>`).join("");
  sel.onchange = () => { state.historyFilter = sel.value; renderHistoryTable(); };
}

function renderHistoryTable() {
  const el = document.getElementById("history-table");
  const rows = state.entries
    .filter(e => state.historyFilter === "all" || e.sportId === state.historyFilter)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (rows.length === 0) {
    el.innerHTML = `<tr><td>No entries match this filter.</td></tr>`;
    return;
  }

  el.innerHTML = `
    <tr><th>Date</th><th>Sport</th><th>Metric</th><th>Value</th><th>Notes</th><th></th></tr>
    ${rows.map(e => {
      const sport = sportById[e.sportId];
      return `
        <tr>
          <td>${e.date}</td>
          <td><span class="sport-chip"><span class="sport-dot" style="background:${sportColor(e.sportId)}"></span>${sport ? sport.icon : ""} ${e.sportName}</span></td>
          <td>${e.metricLabel}</td>
          <td>${e.value} ${e.unit}</td>
          <td>${e.notes || ""}</td>
          <td><button class="row-delete-btn" data-delete="${e.id}" aria-label="Delete entry" title="Delete entry">&times;</button></td>
        </tr>`;
    }).join("")}
  `;

  el.querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", () => {
      saveEntries(state.entries.filter(e => e.id !== btn.dataset.delete));
      renderAll();
    });
  });
}

/* ---------- Entry form ---------- */
function populateSportSelect() {
  const sel = document.getElementById("entry-sport");
  sel.innerHTML = SPORTS.map(s => `<option value="${s.id}">${s.icon} ${s.name}</option>`).join("");
}

function populateMetricSelect(sportId) {
  const sel = document.getElementById("entry-metric");
  const sport = sportById[sportId];
  const options = sport.metrics.map((m, i) => `<option value="${i}">${m.label} (${m.unit})</option>`).join("");
  sel.innerHTML = options + `<option value="custom">Custom metric…</option>`;
  toggleCustomMetricRow(sel.value === "custom");
}

function toggleCustomMetricRow(show) {
  document.getElementById("custom-metric-row").hidden = !show;
}
function toggleCustomSportLabel(show) {
  document.getElementById("custom-sport-label").hidden = !show;
}

function initEntryForm() {
  populateSportSelect();
  populateMetricSelect(SPORTS[0].id);
  document.getElementById("entry-date").value = new Date().toISOString().slice(0, 10);

  const sportSel = document.getElementById("entry-sport");
  const metricSel = document.getElementById("entry-metric");

  sportSel.addEventListener("change", () => {
    populateMetricSelect(sportSel.value);
    toggleCustomSportLabel(sportSel.value === "other");
  });
  metricSel.addEventListener("change", () => toggleCustomMetricRow(metricSel.value === "custom"));

  document.getElementById("entry-form").addEventListener("submit", (e) => {
    e.preventDefault();

    const sport = sportById[sportSel.value];
    const sportName = sportSel.value === "other"
      ? (document.getElementById("entry-custom-sport").value.trim() || "Other")
      : sport.name;

    let metricLabel, unit, lowerIsBetter;
    if (metricSel.value === "custom") {
      metricLabel = document.getElementById("entry-custom-metric-label").value.trim();
      unit = document.getElementById("entry-custom-metric-unit").value.trim() || "units";
      lowerIsBetter = document.getElementById("entry-custom-metric-direction").checked;
      if (!metricLabel) return;
    } else {
      const preset = sport.metrics[Number(metricSel.value)];
      metricLabel = preset.label;
      unit = preset.unit;
      lowerIsBetter = preset.lowerIsBetter;
    }

    const value = Number(document.getElementById("entry-value").value);
    const date = document.getElementById("entry-date").value;
    const notes = document.getElementById("entry-notes").value.trim();
    if (!Number.isFinite(value) || !date) return;

    const entry = { id: makeId(), sportId: sportSel.value, sportName, metricLabel, unit, lowerIsBetter, value, date, notes };
    saveEntries([...state.entries, entry]);

    document.getElementById("entry-value").value = "";
    document.getElementById("entry-notes").value = "";
    state.progressCombo = comboKey(entry);
    renderAll();
  });
}

/* ---------- Export ---------- */
function buildAthlyzeWorkbookSheets() {
  const sorted = [...state.entries].sort((a, b) => a.date.localeCompare(b.date));
  const entryRows = [
    ["Date", "Sport", "Metric", "Value", "Unit", "Lower is better", "Notes"],
    ...sorted.map(e => [e.date, e.sportName, e.metricLabel, e.value, e.unit, e.lowerIsBetter ? "Yes" : "No", e.notes || ""])
  ];

  const groups = Array.from(groupByCombo(state.entries).values());
  const prRows = [
    ["Sport", "Metric", "Best value", "Unit", "Best date", "Times logged"],
    ...groups.map(g => {
      const { best, bestDate } = bestOf(g);
      return [g.sportName, g.metricLabel, best, g.unit, bestDate, g.entries.length];
    })
  ];

  return [
    { name: "Entries", rows: entryRows },
    { name: "Personal Bests", rows: prRows }
  ];
}

function initExport() {
  document.getElementById("export-btn").addEventListener("click", () => {
    downloadWorkbook("athlyze-performance-log.xlsx", buildAthlyzeWorkbookSheets());
  });
}

/* ---------- Clear data ---------- */
function initClearData() {
  document.getElementById("clear-data-btn").addEventListener("click", () => {
    if (!confirm("Delete every logged entry in this browser? This can't be undone.")) return;
    saveEntries([]);
    state.progressCombo = null;
    renderAll();
  });
}

/* ---------- Render everything ---------- */
function renderAll() {
  renderStatTiles();
  renderPRGrid();
  renderProgressControls();
  renderProgressChart();
  renderHistoryFilterOptions();
  renderHistoryTable();
}

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  state.entries = loadEntries();
  initEntryForm();
  initExport();
  initClearData();
  renderAll();
});

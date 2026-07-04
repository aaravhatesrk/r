/* Rooted — small dependency-free canvas chart layer.
   Grouped vertical bars + horizontal bars, with hover tooltips,
   direct value labels, and a table-view fallback for accessibility. */

const CHART_TOOLTIP = (() => {
  const el = document.createElement("div");
  el.className = "chart-tooltip";
  el.hidden = true;
  document.body.appendChild(el);
  return el;
})();

function showChartTooltip(clientX, clientY, html) {
  CHART_TOOLTIP.innerHTML = html;
  CHART_TOOLTIP.style.left = clientX + "px";
  CHART_TOOLTIP.style.top = clientY + "px";
  CHART_TOOLTIP.hidden = false;
}
function hideChartTooltip() { CHART_TOOLTIP.hidden = true; }

function themeTokens() {
  const cs = getComputedStyle(document.documentElement);
  return {
    ink: cs.getPropertyValue("--ink").trim(),
    inkSecondary: cs.getPropertyValue("--ink-secondary").trim(),
    muted: cs.getPropertyValue("--muted").trim(),
    gridline: cs.getPropertyValue("--gridline").trim(),
    baseline: cs.getPropertyValue("--baseline").trim(),
    surface: cs.getPropertyValue("--chart-surface").trim()
  };
}

function prepCanvas(canvas) {
  const aspect = Number(canvas.getAttribute("height")) / Number(canvas.getAttribute("width"));
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.parentElement.clientWidth;
  const cssHeight = cssWidth * aspect;
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  canvas.style.width = cssWidth + "px";
  canvas.style.height = cssHeight + "px";
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width: cssWidth, height: cssHeight };
}

function niceMax(value) {
  if (value <= 0) return 10;
  const mag = Math.pow(10, Math.floor(Math.log10(value)));
  const norm = value / mag;
  let step;
  if (norm <= 1) step = 1;
  else if (norm <= 2) step = 2;
  else if (norm <= 5) step = 5;
  else step = 10;
  return step * mag;
}

function renderGroupedBarChart(canvasId, { labels, series, unit }) {
  const canvas = document.getElementById(canvasId);
  const { ctx, width, height } = prepCanvas(canvas);
  const t = themeTokens();

  const padding = { top: 20, right: 16, bottom: 34, left: 44 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const maxVal = niceMax(Math.max(...series.flatMap(s => s.data)) * 1.15);
  const groupW = plotW / labels.length;
  const barGap = 2;
  const barW = (groupW - 12) / series.length - barGap;

  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = t.gridline;
  ctx.fillStyle = t.muted;
  ctx.font = "11px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  const ySteps = 4;
  for (let i = 0; i <= ySteps; i++) {
    const v = (maxVal / ySteps) * i;
    const y = padding.top + plotH - (v / maxVal) * plotH;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillText(Math.round(v), padding.left - 8, y);
  }

  ctx.strokeStyle = t.baseline;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top + plotH);
  ctx.lineTo(width - padding.right, padding.top + plotH);
  ctx.stroke();

  const hitRects = [];

  labels.forEach((label, gi) => {
    const groupX = padding.left + gi * groupW + 6;
    series.forEach((s, si) => {
      const val = s.data[gi];
      const barH = (val / maxVal) * plotH;
      const x = groupX + si * (barW + barGap);
      const y = padding.top + plotH - barH;

      ctx.fillStyle = s.color;
      const r = 4;
      ctx.beginPath();
      ctx.moveTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.arcTo(x + barW, y, x + barW, y + r, r);
      ctx.lineTo(x + barW, y + barH);
      ctx.lineTo(x, y + barH);
      ctx.closePath();
      ctx.fill();

      if (barW > 14) {
        ctx.fillStyle = t.inkSecondary;
        ctx.font = "10px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(String(val), x + barW / 2, y - 3);
      }

      hitRects.push({ x, y, w: barW, h: barH, label: `${s.name} · ${label}`, value: `${val} ${unit || ""}`.trim(), color: s.color });
    });

    ctx.fillStyle = t.muted;
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(label, groupX + (groupW - 12) / 2, padding.top + plotH + 10);
  });

  attachHover(canvas, hitRects);
}

function renderHorizontalBarChart(canvasId, { items, unit }) {
  const canvas = document.getElementById(canvasId);
  const { ctx, width, height } = prepCanvas(canvas);
  const t = themeTokens();

  const padding = { top: 10, right: 44, bottom: 24, left: 110 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const maxVal = niceMax(Math.max(...items.map(i => i.value)) * 1.1);
  const rowH = plotH / items.length;
  const barH = Math.min(28, rowH - 10);

  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = t.baseline;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + plotH);
  ctx.stroke();

  const hitRects = [];

  items.forEach((item, i) => {
    const y = padding.top + i * rowH + (rowH - barH) / 2;
    const barW = (item.value / maxVal) * plotW;

    ctx.fillStyle = t.ink;
    ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(item.label, padding.left - 10, y + barH / 2);

    ctx.fillStyle = item.color;
    const r = 4;
    const x = padding.left;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + barW - r, y);
    ctx.arcTo(x + barW, y, x + barW, y + r, r);
    ctx.arcTo(x + barW, y + barH, x + barW - r, y + barH, r);
    ctx.lineTo(x, y + barH);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = t.inkSecondary;
    ctx.textAlign = "left";
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText(String(item.value), x + barW + 8, y + barH / 2);

    hitRects.push({ x, y, w: barW, h: barH, label: item.label, value: `${item.value} ${unit || ""}`.trim(), color: item.color });
  });

  attachHover(canvas, hitRects);
}

function attachHover(canvas, hitRects) {
  canvas.onmousemove = (evt) => {
    const rect = canvas.getBoundingClientRect();
    const mx = evt.clientX - rect.left;
    const my = evt.clientY - rect.top;
    const hit = hitRects.find(r => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h);
    if (hit) {
      showChartTooltip(evt.clientX, evt.clientY, `<strong>${hit.label}</strong><br>${hit.value}`);
      canvas.style.cursor = "pointer";
    } else {
      hideChartTooltip();
      canvas.style.cursor = "default";
    }
  };
  canvas.onmouseleave = hideChartTooltip;
}

function renderLegend(containerId, entries) {
  const el = document.getElementById(containerId);
  el.innerHTML = entries.map(e =>
    `<span class="legend-item"><span class="legend-dot" style="background:${e.color}"></span>${e.name}</span>`
  ).join("");
}

function renderGroupedTable(containerId, { labels, series, unit }) {
  const el = document.getElementById(containerId);
  const head = `<tr><th>Month</th>${series.map(s => `<th>${s.name}</th>`).join("")}</tr>`;
  const rows = labels.map((label, i) =>
    `<tr><td>${label}</td>${series.map(s => `<td>${s.data[i]} ${unit || ""}</td>`).join("")}</tr>`
  ).join("");
  el.innerHTML = `<table>${head}${rows}</table>`;
}

function renderListTable(containerId, { items, unit }) {
  const el = document.getElementById(containerId);
  const rows = items.map(i => `<tr><td>${i.label}</td><td>${i.value} ${unit || ""}</td></tr>`).join("");
  el.innerHTML = `<table><tr><th>Country</th><th>Value</th></tr>${rows}</table>`;
}

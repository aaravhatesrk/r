/* PitchIQ — small dependency-free canvas chart layer (same engine as
   Rooted/Athlyze). Only the horizontal bar chart is needed here, to show
   tagged-mistake counts per skill category across all saved sessions. */

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

function renderHorizontalBarChart(canvasId, { items, unit }) {
  const canvas = document.getElementById(canvasId);
  const { ctx, width, height } = prepCanvas(canvas);
  const t = themeTokens();

  const padding = { top: 10, right: 44, bottom: 24, left: 170 };
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
    const barW = maxVal > 0 ? (item.value / maxVal) * plotW : 0;

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
    ctx.lineTo(x + Math.max(barW, 1) - r, y);
    ctx.arcTo(x + Math.max(barW, 1), y, x + Math.max(barW, 1), y + r, r);
    ctx.arcTo(x + Math.max(barW, 1), y + barH, x + Math.max(barW, 1) - r, y + barH, r);
    ctx.lineTo(x, y + barH);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = t.inkSecondary;
    ctx.textAlign = "left";
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText(String(item.value), x + Math.max(barW, 1) + 8, y + barH / 2);

    hitRects.push({ x, y, w: Math.max(barW, 1), h: barH, label: item.label, value: `${item.value} ${unit || ""}`.trim(), color: item.color });
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
  if (!el) return;
  el.innerHTML = entries.map(e =>
    `<span class="legend-item"><span class="legend-dot" style="background:${e.color}"></span>${e.name}</span>`
  ).join("");
}

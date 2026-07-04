/* Athlyze — small dependency-free canvas chart layer.
   Shared engine with the Rooted site (grouped bars, horizontal bars, hover
   tooltips, table-view fallback) plus a line/trend chart for progress over
   time, which Rooted doesn't need. */

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

/* Line/trend chart — one or more series over a shared category axis
   (dates). Baseline always at zero, points are hoverable, and up to 4
   series get direct legend entries via renderLegend(). */
function renderLineChart(canvasId, { labels, series, unit }) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const { ctx, width, height } = prepCanvas(canvas);
  const t = themeTokens();

  const padding = { top: 20, right: 20, bottom: 34, left: 50 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const allVals = series.flatMap(s => s.data).filter(v => typeof v === "number");
  const maxVal = niceMax(Math.max(1, ...allVals) * 1.15);
  const minVal = 0;

  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = t.gridline;
  ctx.fillStyle = t.muted;
  ctx.font = "11px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  const ySteps = 4;
  for (let i = 0; i <= ySteps; i++) {
    const v = minVal + ((maxVal - minVal) / ySteps) * i;
    const y = padding.top + plotH - ((v - minVal) / (maxVal - minVal)) * plotH;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillText(String(Math.round(v * 10) / 10), padding.left - 8, y);
  }

  ctx.strokeStyle = t.baseline;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top + plotH);
  ctx.lineTo(width - padding.right, padding.top + plotH);
  ctx.stroke();

  const stepX = labels.length > 1 ? plotW / (labels.length - 1) : 0;
  const hitRects = [];
  const toXY = (v, i) => ({
    x: padding.left + (labels.length > 1 ? stepX * i : plotW / 2),
    y: padding.top + plotH - ((v - minVal) / (maxVal - minVal)) * plotH
  });

  series.forEach(s => {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    s.data.forEach((v, i) => {
      const { x, y } = toXY(v, i);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    s.data.forEach((v, i) => {
      const { x, y } = toXY(v, i);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = t.surface;
      ctx.stroke();
      hitRects.push({ x: x - 7, y: y - 7, w: 14, h: 14, label: `${s.name} · ${labels[i]}`, value: `${v} ${unit || ""}`.trim(), color: s.color });
    });
  });

  ctx.fillStyle = t.muted;
  ctx.font = "11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  labels.forEach((label, i) => {
    const { x } = toXY(0, i);
    if (labels.length <= 10 || i % Math.ceil(labels.length / 10) === 0) {
      ctx.fillText(label, x, padding.top + plotH + 10);
    }
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

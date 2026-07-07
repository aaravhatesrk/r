/* PitchIQ — Coach AI: a real Claude-backed assistant for general football
   advice, wired up alongside (not replacing) the rule-based Quick Analyzer
   and Famous Match Analyzer. Talks to the small proxy in football-analyzer/
   server/ — see js/coach-config.js for why this can't be a direct client-side
   API call. Until that backend is configured, this shows an on-page setup
   notice instead of silently failing, same pattern as Community Connect on
   the main Rooted site. */

const coachState = {
  context: null,
  contextLabel: null,
};

function showCoachSetupBanner() {
  const el = document.getElementById("coach-setup-banner");
  if (!el) return;
  el.hidden = false;
  el.innerHTML = `
    <strong>Coach AI isn't set up yet.</strong> This panel needs a small backend so your Anthropic API key
    never has to live in this static site's code — see "Setting up Coach AI" in the README, then fill in
    <code>js/coach-config.js</code>. Every other part of PitchIQ works normally without this.`;
  document.getElementById("coach-submit-btn").disabled = true;
}

function setCoachContext(label, contextText) {
  coachState.context = contextText;
  coachState.contextLabel = label;
  const chip = document.getElementById("coach-context-chip");
  const chipLabel = document.getElementById("coach-context-label");
  if (chip && chipLabel) {
    chipLabel.textContent = label;
    chip.hidden = false;
  }
  const input = document.getElementById("coach-input");
  if (input && !input.value.trim()) {
    input.value = "What's the most important thing for me to work on here?";
  }
  const section = document.getElementById("coach-section");
  if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
  if (input) input.focus();
}

function clearCoachContext() {
  coachState.context = null;
  coachState.contextLabel = null;
  const chip = document.getElementById("coach-context-chip");
  if (chip) chip.hidden = true;
}

function renderCoachResult(html) {
  const el = document.getElementById("coach-result");
  if (el) el.innerHTML = html;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function askCoach(question) {
  const btn = document.getElementById("coach-submit-btn");
  btn.disabled = true;
  btn.textContent = "Thinking…";
  renderCoachResult(`<p class="sq-placeholder">Coach is thinking…</p>`);

  try {
    const res = await fetch(COACH_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, context: coachState.context || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      renderCoachResult(`<p class="sq-placeholder">${escapeHtml(data.error || "Coach couldn't answer that — try again.")}</p>`);
      return;
    }
    const paragraphs = (data.advice || "").split(/\n{2,}/).map(p => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join("");
    renderCoachResult(`
      <div class="coach-answer">
        <div class="coach-answer-head"><span class="chip"><span class="chip-dot" style="background:var(--brand)"></span>&#9917; Coach</span></div>
        ${paragraphs || "<p>No response.</p>"}
      </div>`);
  } catch (err) {
    console.error("Coach AI request failed:", err);
    renderCoachResult(`<p class="sq-placeholder">Couldn't reach Coach AI — check your connection and try again.</p>`);
  } finally {
    btn.disabled = false;
    btn.textContent = "Ask Coach";
  }
}

function initCoach() {
  if (typeof COACH_API_URL === "undefined" || COACH_CONFIG_IS_PLACEHOLDER) {
    showCoachSetupBanner();
    return;
  }

  document.getElementById("coach-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const question = document.getElementById("coach-input").value.trim();
    if (!question) return;
    askCoach(question);
  });

  const clearBtn = document.getElementById("coach-context-clear");
  if (clearBtn) clearBtn.addEventListener("click", clearCoachContext);
}

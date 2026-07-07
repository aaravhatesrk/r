/* PitchIQ — Coach AI: a rule-based coaching assistant, no API key or backend
   required. It answers by matching your question's wording against the same
   published mistake knowledge base as the Quick Analyzer (js/data.js) —
   same transparent, auditable approach as the rest of PitchIQ, just phrased
   as a conversation instead of a match/fix/drill grid. When you arrive here
   via "Ask Coach about this" from a tagged mistake or a famous match moment,
   Coach answers using that exact context even if your question is generic. */

const coachState = {
  contextLabel: null,
  contextText: null,
  mistakeId: null,
  matchId: null,
};

function setCoachContext(label, contextText, { mistakeId, matchId } = {}) {
  coachState.contextLabel = label;
  coachState.contextText = contextText;
  coachState.mistakeId = mistakeId || null;
  coachState.matchId = matchId || null;
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
  coachState.contextLabel = null;
  coachState.contextText = null;
  coachState.mistakeId = null;
  coachState.matchId = null;
  const chip = document.getElementById("coach-context-chip");
  if (chip) chip.hidden = true;
}

function renderCoachResult(html) {
  const el = document.getElementById("coach-result");
  if (el) el.innerHTML = html;
}

function scoreQuestionAgainstMistakes(text) {
  const raw = text.toLowerCase();
  return ALL_MISTAKES
    .map(m => ({ mistake: m, hits: m.keywords.filter(k => raw.includes(k)).length }))
    .filter(s => s.hits > 0)
    .sort((a, b) => b.hits - a.hits);
}

function mistakeAnswerHtml(mistake, heading) {
  const c = categoryById[mistake.categoryId];
  return `
    <div class="coach-answer">
      <div class="coach-answer-head"><span class="chip"><span class="chip-dot" style="background:${categoryColor(mistake.categoryId)}"></span>&#9917; Coach</span></div>
      ${heading ? `<p class="ap-lbl">${heading}</p>` : ""}
      <p style="font-weight:600">${mistake.label} <span class="chip"><span class="chip-dot" style="background:${categoryColor(mistake.categoryId)}"></span>${c.icon} ${c.name}</span></p>
      <div class="analyzer-body">
        <div><span class="ml-lbl">Why this happens</span>${mistake.why}</div>
        <div><span class="ml-lbl">Fix</span>${mistake.fix}</div>
        <div><span class="ml-lbl">Drill</span>${mistake.drill}</div>
      </div>
    </div>`;
}

function talkingPointAnswerHtml(match, tp) {
  const c = categoryById[tp.categoryId];
  return `
    <div class="coach-answer">
      <div class="coach-answer-head"><span class="chip"><span class="chip-dot" style="background:var(--brand)"></span>&#9917; Coach</span></div>
      <p class="ap-lbl">On ${match.teams[0]} vs ${match.teams[1]} (${match.year})</p>
      <p style="font-weight:600">${tp.title} <span class="chip"><span class="chip-dot" style="background:${categoryColor(tp.categoryId)}"></span>${c.icon} ${c.name}</span></p>
      <div class="analyzer-body"><div>${tp.note}</div></div>
    </div>`;
}

function noMatchAnswerHtml() {
  return `
    <p class="sq-placeholder">No specific pattern matched that yet. Try describing what actually happened —
    the situation right before it and the outcome — the way you would for the Quick Analyzer above, or
    browse the Skill Library below for the full list of things Coach recognizes.</p>`;
}

function composeCoachAnswer(question) {
  const scored = scoreQuestionAgainstMistakes(question);

  // Directly-tagged context (a specific mistake) always answers, even if the
  // typed question itself is generic ("what should I work on here?").
  if (coachState.mistakeId && scored.length === 0) {
    return mistakeAnswerHtml(mistakeById[coachState.mistakeId]);
  }

  if (scored.length > 0) {
    const [primary, ...rest] = scored;
    const secondary = rest.slice(0, 2);
    return mistakeAnswerHtml(primary.mistake) + secondary.map(s => mistakeAnswerHtml(s.mistake, "Also relevant")).join("");
  }

  // No keyword hit at all — fall back to this famous match's own curated
  // talking points if that's the context, so "Ask Coach about this match"
  // is never a dead end.
  if (coachState.matchId) {
    const match = matchById[coachState.matchId];
    if (match && match.talkingPoints.length) {
      return match.talkingPoints.map(tp => talkingPointAnswerHtml(match, tp)).join("");
    }
  }

  return noMatchAnswerHtml();
}

async function askCoach(question) {
  const btn = document.getElementById("coach-submit-btn");
  btn.disabled = true;
  btn.textContent = "Thinking…";
  renderCoachResult(`<p class="sq-placeholder">Coach is thinking…</p>`);

  // Small delay so the result doesn't just flash-replace — same "thinking"
  // affordance as before, minus the network round-trip.
  await new Promise(resolve => setTimeout(resolve, 250));

  const combined = coachState.contextText ? `${coachState.contextText}\n${question}` : question;
  renderCoachResult(composeCoachAnswer(combined));

  btn.disabled = false;
  btn.textContent = "Ask Coach";
}

function initCoach() {
  document.getElementById("coach-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const question = document.getElementById("coach-input").value.trim();
    if (!question) return;
    askCoach(question);
  });

  const clearBtn = document.getElementById("coach-context-clear");
  if (clearBtn) clearBtn.addEventListener("click", clearCoachContext);
}

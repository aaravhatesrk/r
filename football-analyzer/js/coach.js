/* PitchIQ — Coach AI: answers via a real LLM (Gemini, proxied through
   /backend so the API key never reaches this client-side file). If the
   backend is unreachable, asleep (Render free-tier cold start) or over
   quota, it falls back to matching your question's wording against the
   published mistake knowledge base used by the Quick Analyzer (js/data.js)
   — same transparent, auditable approach as the rest of PitchIQ, just
   phrased as a conversation instead of a match/fix/drill grid. When you
   arrive here via "Ask Coach about this" from a tagged mistake or a famous
   match moment, Coach answers using that exact context even if your
   question is generic. */

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

/* Broader terms per category so a general question ("any tips on shooting?",
   "how do I get better as a keeper?") still lands somewhere useful even when
   it doesn't match a specific mistake's keywords. Keeps Coach from dead-ending
   on well-formed but generic questions. */
const CATEGORY_SYNONYMS = {
  "first-touch": ["first touch", "touch", "ball control", "receiving", "control the ball", "trapping"],
  "passing": ["passing", "pass", "passes", "vision", "distribution", "build up play", "build-up play"],
  "dribbling": ["dribbling", "dribble", "1v1", "one v one", "take people on", "beat a defender", "skills", "tricks"],
  "shooting": ["shooting", "shoot", "finishing", "scoring", "goals", "strikes", "hitting the target"],
  "defending": ["defending", "defence", "defense", "tackling", "tackle", "marking", "1v1 defending"],
  "positioning": ["positioning", "off the ball", "movement", "shape", "spacing", "runs"],
  "decision-making": ["decision making", "decision-making", "game awareness", "reading the game", "game intelligence", "composure"],
  "goalkeeping": ["goalkeeping", "goalkeeper", "keeper", "goalkeeping tips", "shot stopping", "shot-stopping", "saves"]
};

/* Recognizably generic asks ("how can I improve", "any advice?") with no
   specific topic attached — these should never dead-end into "no match". */
const GENERIC_QUESTION_PATTERNS = [
  "how can i improve", "how do i improve", "how do i get better", "how can i get better",
  "any tips", "any advice", "general advice", "what should i work on", "help me improve",
  "help me get better", "where do i start", "what should i practice", "give me a tip",
  "give me advice", "what do i need to work on"
];

function scoreQuestionAgainstCategories(text) {
  const raw = text.toLowerCase();
  return SKILL_CATEGORIES
    .map(c => ({ category: c, hits: (CATEGORY_SYNONYMS[c.id] || []).filter(k => raw.includes(k)).length }))
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

function categoryAnswerHtml(category) {
  const sample = MISTAKES[category.id].slice(0, 4);
  return `
    <div class="coach-answer">
      <div class="coach-answer-head"><span class="chip"><span class="chip-dot" style="background:${categoryColor(category.id)}"></span>&#9917; Coach</span></div>
      <p style="font-weight:600">${category.icon} ${category.name}</p>
      <p class="ap-lbl">A few of the most common things that show up here</p>
      <div class="analyzer-body">
        ${sample.map(m => `<div>${m.label}</div>`).join("")}
      </div>
      <p class="sq-placeholder" style="margin-top:8px">Describe what actually happened in one of these situations — what led into it and how it turned out —
      and Coach will match the specific mistake and give you the why/fix/drill for it.</p>
    </div>`;
}

function genericAnswerHtml() {
  const picks = SKILL_CATEGORIES.slice(0, 4);
  return `
    <div class="coach-answer">
      <div class="coach-answer-head"><span class="chip"><span class="chip-dot" style="background:var(--brand)"></span>&#9917; Coach</span></div>
      <p style="font-weight:600">No single area jumps out from that yet — here's how to get a sharper answer</p>
      <div class="analyzer-body">
        <div>Coach works best on a specific situation, not a general question. Try describing one concrete moment: what
        happened right before it, what you did, and how it turned out — the same way you'd describe it to a real coach
        after a match.</div>
        <div><span class="ml-lbl">Or name an area</span> Ask about any of these directly, e.g. "${picks.map(c => c.name.toLowerCase()).join('", "')}", and Coach will surface the most common mistakes players run into there.</div>
        <div><span class="ml-lbl">Or browse</span> The Skill Library below lists every mistake Coach recognizes, organized by category — pick one that matches and Coach can go deeper on it.</div>
      </div>
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

  // No specific mistake matched, but the question names a whole skill area
  // ("any shooting tips?", "how do I get better as a keeper?") — surface
  // that category's most common mistakes instead of a dead end.
  const categoryScored = scoreQuestionAgainstCategories(question);
  if (categoryScored.length > 0) {
    return categoryAnswerHtml(categoryScored[0].category);
  }

  // A recognizably generic ask ("how can I improve?") with no topic and no
  // context attached — give concrete next steps instead of "no match".
  const raw = question.toLowerCase();
  if (GENERIC_QUESTION_PATTERNS.some(p => raw.includes(p))) {
    return genericAnswerHtml();
  }

  return noMatchAnswerHtml();
}

function aiCoachAnswerHtml(answer) {
  const div = document.createElement("div");
  div.textContent = answer;
  return `
    <div class="coach-answer">
      <div class="coach-answer-head"><span class="chip"><span class="chip-dot" style="background:var(--brand)"></span>&#9917; Coach (AI)</span></div>
      <div class="analyzer-body"><div style="white-space:pre-wrap">${div.innerHTML}</div></div>
    </div>`;
}

/* Backend calls get a generous timeout because Render's free tier puts an
   idle service to sleep — the first request after a while can take 30-60s
   to wake it back up. If it doesn't answer in time, times out, or errors,
   Coach falls back to the instant rule-based composeCoachAnswer() below so
   a slow/sleeping/over-quota backend never breaks the feature. */
async function fetchAiCoachAnswer(question, contextText) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const resp = await fetch(`${BACKEND_URL}/api/coach`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, context: contextText || null }),
      signal: controller.signal,
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.answer || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function askCoach(question) {
  const btn = document.getElementById("coach-submit-btn");
  btn.disabled = true;
  btn.textContent = "Thinking…";
  renderCoachResult(`<p class="sq-placeholder">Coach is thinking… (waking up the AI can take up to a minute if it's been idle)</p>`);

  const combined = coachState.contextText ? `${coachState.contextText}\n${question}` : question;
  const aiAnswer = await fetchAiCoachAnswer(question, coachState.contextText);

  if (aiAnswer) {
    renderCoachResult(aiCoachAnswerHtml(aiAnswer));
  } else {
    renderCoachResult(composeCoachAnswer(combined) +
      `<p class="sq-placeholder" style="margin-top:8px">(AI coach wasn't reachable just now — showing the built-in coaching library instead.)</p>`);
  }

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

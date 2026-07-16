/* Rooted backend — proxies Gemini (Coach AI + Wellness Advisor) and
   football-data.org (live match lookup) so their API keys never reach
   client-side JS. Everything here is additive: every frontend caller falls
   back to its existing rule-based/curated behavior if this service is
   unreachable, slow (Render free-tier cold start), or over quota. */

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Render injects real env vars directly, so this is a local-dev-only
// convenience — silently does nothing if there's no .env file (production).
try { process.loadEnvFile(); } catch {}

const PORT = process.env.PORT || 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://rooted-i4d3.onrender.com";

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const geminiModel = genAI ? genAI.getGenerativeModel({ model: "gemini-2.5-flash" }) : null;

const app = express();
app.use(express.json({ limit: "20kb" }));
app.use(cors({
  origin: [ALLOWED_ORIGIN, "http://localhost:5500", "http://127.0.0.1:5500", "http://localhost:3000"],
}));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

/* ---------- Wellness Advisor: server-side safety net ----------
   Mirrors HEALTH_RED_FLAGS in js/data.js. Kept as a plain duplicate (not a
   shared import) because the frontend files are plain <script>-tag globals
   with no module system — if HEALTH_RED_FLAGS changes there, mirror the
   change here too. This must never depend on the LLM: it runs before any
   Gemini call and short-circuits with a static, deterministic response. */
const HEALTH_RED_FLAGS = [
  "suicidal", "suicide", "kill myself", "want to die", "end my life", "end it all",
  "self harm", "self-harm", "hurt myself", "harm myself",
  "chest pain", "can't breathe", "cannot breathe", "not breathing", "trouble breathing",
  "severe bleeding", "coughing blood", "vomiting blood", "overdose", "poisoning",
  "collapse", "collapsed", "unconscious", "unresponsive", "passed out", "blacked out",
  "seizure", "stroke", "face drooping", "slurred speech", "numbness on one side",
  "can't move my", "cannot move my", "heart attack", "anaphylaxis", "severe allergic reaction",
  "choking", "severe burn", "compound fracture", "broken bone"
];

app.get("/api/health", (req, res) => {
  res.json({ ok: true, gemini: !!geminiModel, footballData: !!FOOTBALL_DATA_API_KEY });
});

app.post("/api/coach", async (req, res) => {
  if (!geminiModel) return res.status(503).json({ error: "AI not configured" });
  const { question, context } = req.body || {};
  if (!question || typeof question !== "string" || question.length > 800) {
    return res.status(400).json({ error: "Invalid question" });
  }

  const prompt = `You are Coach, a friendly, encouraging football (soccer) coaching assistant inside the
PitchIQ app. Answer the player's question with concrete, actionable coaching advice: what to
work on, why it matters, and a short drill they can try. Keep the tone supportive, not
clinical. Keep the answer under 200 words, plain text (no markdown, no HTML).
${context ? `\nContext the player is asking about: ${context}` : ""}

Player's question: ${question}`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const answer = result.response.text().trim();
    res.json({ answer });
  } catch (err) {
    console.error("Gemini /api/coach error:", err.message);
    res.status(502).json({ error: "AI request failed" });
  }
});

app.post("/api/wellness", async (req, res) => {
  const { description, country, countryLabel, heritage } = req.body || {};
  if (!description || typeof description !== "string" || description.length > 800) {
    return res.status(400).json({ error: "Invalid description" });
  }

  const raw = description.toLowerCase();
  const hasRedFlag = HEALTH_RED_FLAGS.some(flag => raw.includes(flag));
  if (hasRedFlag) {
    return res.json({ redFlag: true });
  }

  if (!geminiModel) return res.status(503).json({ error: "AI not configured" });

  const prompt = `You are the Wellness Advisor inside the Rooted app. A user described an everyday,
non-emergency health/wellness concern. Give general, non-diagnostic wellness suggestions only —
never anything that reads as medical diagnosis or treatment. Weave in a culturally-rooted
practice from ${countryLabel || "the user's region"}${heritage ? ` (heritage: ${heritage})` : ""} where it fits naturally.

Respond ONLY with strict JSON, no markdown fences, matching exactly this shape:
{"generalAdvice": "1-2 sentences", "actionPlan": {"today": "one concrete action", "thisWeek": "one concrete habit", "whenToSeekHelp": "when to see a real professional"}, "culturalPractice": "1-2 sentences tying in the regional practice"}

User's description: ${description}`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text().trim().replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(text);
    res.json({ redFlag: false, ...parsed });
  } catch (err) {
    console.error("Gemini /api/wellness error:", err.message);
    res.status(502).json({ error: "AI request failed" });
  }
});

/* ---------- Live match lookup ----------
   football-data.org's free tier has no free-text match search, so this
   pulls a date-windowed list of matches the API key's plan can see and
   scores them by how many query tokens (team names, mainly) appear in the
   home/away team names. Good enough for "did team X play team Y recently" —
   not a general "any match ever" search (that's what the curated
   FAMOUS_MATCHES library is for). */
const STOPWORDS = new Set(["vs", "v", "match", "game", "final", "the", "a", "an"]);

function queryTokens(q) {
  return q.toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(t => t && !STOPWORDS.has(t) && !/^\d{4}$/.test(t));
}

app.get("/api/match-lookup", async (req, res) => {
  if (!FOOTBALL_DATA_API_KEY) return res.status(503).json({ error: "Match lookup not configured" });
  const q = (req.query.q || "").toString();
  if (!q.trim()) return res.status(400).json({ error: "Missing query" });

  const tokens = queryTokens(q);
  if (tokens.length === 0) return res.json({ match: null });

  const dateFrom = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const dateTo = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  try {
    const resp = await fetch(
      `https://api.football-data.org/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`,
      { headers: { "X-Auth-Token": FOOTBALL_DATA_API_KEY } }
    );
    if (!resp.ok) throw new Error(`football-data.org responded ${resp.status}`);
    const data = await resp.json();

    const scored = (data.matches || []).map(m => {
      const haystack = `${m.homeTeam?.name || ""} ${m.awayTeam?.name || ""}`.toLowerCase();
      const hits = tokens.filter(t => haystack.includes(t)).length;
      return { m, hits };
    }).filter(s => s.hits > 0).sort((a, b) => b.hits - a.hits);

    if (scored.length === 0) return res.json({ match: null });

    const top = scored[0].m;
    const home = top.homeTeam?.name || "Home";
    const away = top.awayTeam?.name || "Away";
    const fullTime = top.score?.fullTime;
    const score = (fullTime && fullTime.home != null && fullTime.away != null)
      ? `${home} ${fullTime.home}–${fullTime.away} ${away}`
      : "Score not yet available";

    res.json({
      match: {
        competition: top.competition?.name || "Unknown competition",
        date: top.utcDate ? new Date(top.utcDate).toDateString() : "Unknown date",
        teams: [home, away],
        score,
        status: top.status,
      }
    });
  } catch (err) {
    console.error("football-data.org /api/match-lookup error:", err.message);
    res.status(502).json({ error: "Match lookup failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Rooted backend listening on port ${PORT}`);
});

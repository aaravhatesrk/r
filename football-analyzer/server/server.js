/* PitchIQ Coach API — a small proxy so the static frontend can get real
   Claude-generated coaching advice without ever holding an API key. The key
   lives only in this process's environment (ANTHROPIC_API_KEY, set in the
   Render dashboard, never committed) — see the README's "Coach AI setup"
   section. */

const express = require("express");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
app.use(express.json({ limit: "10kb" }));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
  })
);

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment

const SYSTEM_PROMPT = `You are "Coach", the AI assistant inside PitchIQ, a football (soccer) skill and
match analysis tool for players and coaches. Give practical, specific, encouraging coaching advice —
grounded in real technical, tactical and decision-making fundamentals (first touch, passing, dribbling,
shooting, defending, positioning, decision-making, goalkeeping). When the user gives you context about a
tagged mistake, a Quick Analyzer description, or a famous match moment, tie your advice directly to it.
Keep answers focused and actionable: a short diagnosis, then 1-3 concrete things to work on, in plain
language a club-level player or coach would use. Avoid generic filler ("practice more", "stay positive").
You are not a replacement for a human coach or a professional scouting service — say so only if the user
asks something clearly outside football coaching (medical, legal, etc.), otherwise just answer the
football question.`;

// Minimal in-memory per-IP rate limit — this endpoint costs real API money per
// request, and it's reachable by anyone who loads the page.
const requestLog = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (requestLog.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  requestLog.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

app.post("/api/coach", async (req, res) => {
  if (isRateLimited(req.ip)) {
    return res.status(429).json({ error: "Too many questions at once — try again in a minute." });
  }

  const { question, context } = req.body || {};
  if (typeof question !== "string" || !question.trim() || question.length > 800) {
    return res.status(400).json({ error: "Ask a question (under 800 characters)." });
  }
  if (context !== undefined && (typeof context !== "string" || context.length > 2000)) {
    return res.status(400).json({ error: "Context is too long." });
  }

  const userContent = context && context.trim()
    ? `Context: ${context.trim()}\n\nQuestion: ${question.trim()}`
    : question.trim();

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 700,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });
    const textBlock = response.content.find((block) => block.type === "text");
    res.json({ advice: textBlock ? textBlock.text : "" });
  } catch (err) {
    console.error("Coach AI request failed:", err);
    res.status(502).json({ error: "Coach is unavailable right now — try again shortly." });
  }
});

app.get("/healthz", (req, res) => res.send("ok"));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`PitchIQ Coach API listening on port ${port}`);
});

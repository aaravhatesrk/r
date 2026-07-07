/* PitchIQ — data layer: skill categories and a knowledge base of common
   mistakes, each with a plain-language "why", a correction cue, and a
   practice drill. This is the same rule-based approach as Rooted's
   Wellness Advisor (js/data.js in the main site) — a published, auditable
   knowledge base that keyword-matches free text or gets picked from a
   dropdown, not a machine-learning model. Colors reuse the eight
   validated categorical slots from the shared design-system palette so
   this tool's charts stay consistent with Athlyze's. */

const SKILL_CATEGORIES = [
  { id: "first-touch", name: "First Touch & Ball Control", icon: "\u{1F3D0}", color: "#2a78d6", colorDark: "#3987e5" },
  { id: "passing", name: "Passing & Vision", icon: "\u{1F3AF}", color: "#1baf7a", colorDark: "#199e70" },
  { id: "dribbling", name: "Dribbling & 1v1 Attacking", icon: "\u{1F300}", color: "#eda100", colorDark: "#c98500" },
  { id: "shooting", name: "Shooting & Finishing", icon: "\u{1F945}", color: "#008300", colorDark: "#008300" },
  { id: "defending", name: "Defending & Tackling", icon: "\u{1F6E1}️", color: "#4a3aa7", colorDark: "#9085e9" },
  { id: "positioning", name: "Positioning & Off-the-Ball Movement", icon: "\u{1F9ED}", color: "#e34948", colorDark: "#e66767" },
  { id: "decision-making", name: "Decision Making & Game Awareness", icon: "\u{1F9E0}", color: "#e87ba4", colorDark: "#d55181" },
  { id: "goalkeeping", name: "Goalkeeping", icon: "\u{1F9E4}", color: "#eb6834", colorDark: "#d95926" }
];
const categoryById = Object.fromEntries(SKILL_CATEGORIES.map(c => [c.id, c]));

/* Each mistake: id, label (shown in dropdowns/tags), keywords (for the
   free-text Quick Analyzer — lowercase phrases/words), why it tends to
   happen, the correction cue, and a concrete drill to fix it. */
const MISTAKES = {
  "first-touch": [
    {
      id: "heavy-touch",
      label: "Heavy first touch pushes the ball away from you",
      keywords: ["heavy touch", "touch too far", "ball ran away", "ball bounced away", "lost control", "touch bounced off", "couldn't control the pass"],
      why: "The foot is presented stiff and flat on contact instead of relaxed, so it doesn't absorb any of the ball's pace — the touch adds energy instead of cushioning it.",
      fix: "Meet the ball slightly early and let the receiving surface (foot, thigh or chest) 'give' backward a few centimetres on contact, like catching an egg.",
      drill: "Wall-touch drill: pass a ball against a wall from 5–8m, take one cushioned touch that kills 90% of the pace before your next action, 20 reps each foot."
    },
    {
      id: "closed-body-touch",
      label: "Takes a touch side-on/back-to-play, can't see options",
      keywords: ["back to goal", "couldn't see", "didn't check shoulder", "closed body", "receiving with back turned", "no awareness before receiving"],
      why: "The player checks the ball, not the pitch — the first touch happens before scanning for pressure and passing options, so the body shape is already wrong when the ball arrives.",
      fix: "Scan over both shoulders in the 1–2 seconds before the ball arrives, and open the body so the first touch can go forward, not just sideways or backward.",
      drill: "Rondo (piggy-in-the-middle) with a mandatory shoulder-check before every touch — a coach or teammate calls 'check' every few seconds as a reminder."
    },
    {
      id: "trailing-leg-touch",
      label: "Touch taken off the trailing/standing leg under pressure",
      keywords: ["trailing leg", "standing leg touch", "off balance receiving", "fell over receiving", "pushed off the ball"],
      why: "Receiving on the back foot leaves the body weight over the wrong leg, so a defender's first contact is enough to knock the receiver off balance or win the ball.",
      fix: "Get the touching foot underneath or slightly ahead of the body's centre of gravity, with the standing leg bent and ready to absorb contact.",
      drill: "1v1 receiving under a passive defender's shadow: receiver must take the touch on the front foot and shield in the same motion, 10 reps per side."
    },
    {
      id: "one-footed-control",
      label: "Only ever controls with the stronger foot",
      keywords: ["weak foot", "never uses left foot", "never uses right foot", "one footed", "can't control with other foot"],
      why: "Avoiding the weaker foot under pressure telegraphs the next action to defenders and rules out half the available angles to receive and turn.",
      fix: "Deliberately practice controlling with the weaker foot in low-pressure reps until it's no longer a conscious decision in a match.",
      drill: "Weak-foot-only session: 15 minutes of every pass, touch and pass-back using only the non-dominant foot, building up from standing to moving reps."
    },
    {
      id: "static-touch-in-front-of-defender",
      label: "Touch stops dead right in front of a defender",
      keywords: ["touch stopped dead", "gave it straight to the defender", "touch was too close", "let the defender win it back"],
      why: "A touch with no direction or pace simply re-presents the ball to whoever is closest — usually the defender who was already goal-side.",
      fix: "Every touch should have a purpose: away from the nearest defender, into space, or set up for the very next action — never just 'stop the ball'.",
      drill: "Directional touch drill: receive a pass and the very first touch must go into one of four marked zones around you, chosen based on where a passive defender is standing."
    }
  ],
  "passing": [
    {
      id: "no-scan-before-pass",
      label: "Plays a pass into pressure without checking first",
      keywords: ["played into pressure", "didn't see the defender", "pass got intercepted", "passed straight to opponent", "no scan"],
      why: "The picture in the player's head is out of date — the last shoulder-check happened before the defender closed the passing lane.",
      fix: "Re-scan in the split second before releasing the pass, not just when first receiving the ball — the picture changes every second in a match.",
      drill: "Rondo with a rule that every pass must be preceded by a fresh head-turn, with a coach calling out defender positions to reward accurate reads."
    },
    {
      id: "telegraphed-pass",
      label: "Pass is telegraphed — body shape gives away the direction",
      keywords: ["telegraphed", "defender read the pass", "saw it coming", "obvious pass", "no disguise"],
      why: "Opening the hips and shoulders early toward the target gives a defender a full second's head start to step into the passing lane.",
      fix: "Keep the body shape neutral for longer and use the plant foot and a late hip turn to disguise direction until the last possible moment.",
      drill: "Passing under a token defender who is told to intercept any pass they can read early — forces the passer to delay the 'tell' until release."
    },
    {
      id: "wrong-weight-pass",
      label: "Pass under-hit or over-hit — wrong weight for the situation",
      keywords: ["under hit", "over hit", "too soft", "too hard", "pass didn't reach", "pass ran through", "overhit the pass"],
      why: "Weight is usually judged on technique alone (how the ball is struck) without factoring in the surface, distance and the receiver's movement.",
      fix: "Judge weight by where the receiver will be by the time the ball arrives, not where they are now, and match the strike to the specific distance.",
      drill: "Moving-target passing: receiver jogs a route and the passer must lead the pass into their path at a weight that needs no adjusting touch."
    },
    {
      id: "always-sideways-safe-pass",
      label: "Only ever plays the safe sideways/backward pass",
      keywords: ["only passed sideways", "never played forward", "too many backward passes", "no risk passes", "always safe pass"],
      why: "Under pressure or lacking confidence, the easiest option (sideways) becomes the default even when a forward option is available and on.",
      fix: "Before defaulting sideways, actively check for a forward option first — it should be the first thing scanned for, not the last resort.",
      drill: "Possession game where forward passes count double and backward passes cost a point, to retrain the first instinct."
    },
    {
      id: "no-first-time-pass",
      label: "Takes an unnecessary extra touch instead of passing first-time",
      keywords: ["extra touch slowed play", "should have played first time", "took too long on the ball", "slow release"],
      why: "An extra touch feels safer but gives defenders time to recover shape — against a good side, that half-second is the difference between an open and closed passing lane.",
      fix: "Scan before the ball arrives so the decision to play first-time is already made — the touch itself should just execute a decision, not create thinking time.",
      drill: "One- and two-touch possession games (no more touches allowed) to force pre-decision and quick release."
    }
  ],
  "dribbling": [
    {
      id: "too-many-touches",
      label: "Too many touches, lets the defender set and recover",
      keywords: ["too many touches", "took too long dribbling", "let the defender recover", "over-dribbled", "held onto it too long"],
      why: "Fiddly, close touches feel controlled but give a recovering defender time to get goal-side again — speed of ball beats speed of feet.",
      fix: "Push the ball further out into space on each touch when there's room to run into, and only slow to close control right at the point of the take-on.",
      drill: "Cone-gate dribbling at speed: dribble at pace through a corridor of gates, only using extra touches inside the last gate before a defender."
    },
    {
      id: "no-change-of-pace",
      label: "Dribbles at one constant speed — no change of pace",
      keywords: ["same speed", "no change of pace", "predictable dribble", "easy to defend", "didn't accelerate"],
      why: "A defender can match a constant speed indefinitely; it's the sudden acceleration after a slow approach that actually beats them.",
      fix: "Deliberately slow the approach to draw the defender in, then explode away in one sharp burst rather than dribbling at even pace throughout.",
      drill: "Slow-fast 1v1s: attacker must walk/jog the first 3 yards, then hit a maximum-speed burst on a coach's signal to beat the defender."
    },
    {
      id: "one-move-dribbler",
      label: "Relies on the same move every time (predictable)",
      keywords: ["same move every time", "only does one trick", "predictable dribbler", "defender knew what was coming"],
      why: "Repeating one move lets defenders scout and pre-empt it within a single half, even if it worked the first time.",
      fix: "Build at least two counter-moves off the same setup (e.g. a stepover that can go either way) so the defender can't simply sit on the first read.",
      drill: "Randomised 1v1s where a coach calls which side the defender should jockey toward, forcing the attacker to use a different response each rep."
    },
    {
      id: "dribbling-into-traffic",
      label: "Dribbles into a crowd instead of open space",
      keywords: ["dribbled into traffic", "ran into defenders", "no space to dribble", "dribbled into a crowd"],
      why: "Focus narrows onto the ball and the nearest defender, so wider space and a second or third defender closing in go unnoticed.",
      fix: "Pick the direction of the take-on based on where the open space is, not just where the first defender is standing.",
      drill: "Small-sided game (4v4) with floating 'space' zones marked out — bonus point for any successful dribble that ends inside a zone."
    },
    {
      id: "no-shield-under-pressure",
      label: "Gets dispossessed instead of shielding the ball",
      keywords: ["got dispossessed", "lost the ball under pressure", "didn't shield", "tackled off the ball", "turned over possession"],
      why: "Without a strong, side-on body position between the ball and the defender, there's nothing stopping the defender reaching straight through.",
      fix: "Get side-on with the body as a barrier, ball on the far foot from the defender, and use the arm (not a push) to feel where the defender is.",
      drill: "Shielding 1v1 in a small grid: attacker must keep the ball for 10 seconds using only body position, no dribbling away allowed."
    }
  ],
  "shooting": [
    {
      id: "rushed-shot",
      label: "Rushes the shot without setting the plant foot",
      keywords: ["rushed the shot", "shot off balance", "didn't set feet", "scuffed the shot", "mishit the shot"],
      why: "Under time pressure, the strike happens before the plant foot is placed, so the body has no stable base to generate accuracy or power from.",
      fix: "Even at speed, get the plant foot alongside the ball, pointing at the target, a fraction of a second before contact — that's what actually needs to slow down, not the run-up.",
      drill: "Shooting off a first touch under a passive chaser: the emphasis is entirely on planting the standing foot correctly, not on power."
    },
    {
      id: "leaning-back-shot",
      label: "Leans back on the shot — ball flies over the bar",
      keywords: ["shot went over the bar", "leaned back", "ballooned it", "skied the shot"],
      why: "Leaning back at the point of contact naturally lifts the strike upward, since the body's weight is moving away from the target instead of through it.",
      fix: "Keep the head and chest over the ball at contact, weight moving forward through the strike, not falling backward.",
      drill: "Shooting into a low target (a small goal or a line of cones) that only rewards strikes kept under a certain height, retraining the body-over-the-ball habit."
    },
    {
      id: "always-power-no-placement",
      label: "Always tries to smash it instead of placing the shot",
      keywords: ["always shoots for power", "no placement", "blazed it wide", "hit it as hard as possible"],
      why: "Maximum power reduces control over the strike surface and follow-through, so accuracy drops exactly when it matters most — one-on-ones and open nets.",
      fix: "Read the goalkeeper's position and pick a side before striking; a well-placed shot at 70% power beats a poorly placed one at 100%.",
      drill: "Target-zone finishing: goal is divided into marked zones, and a shot only counts if it's placed in the zone called before the strike."
    },
    {
      id: "no-composure-one-on-one",
      label: "Panics and rushes a one-on-one with the keeper",
      keywords: ["panicked one on one", "rushed against the keeper", "should have gone round the keeper", "shot straight at the keeper"],
      why: "Adrenaline compresses decision-making, so the first instinct (shoot immediately) overrides reading what the goalkeeper is actually doing.",
      fix: "Take one extra touch to draw the keeper into committing, then finish into the space they've vacated — the situation is rarely as urgent as it feels.",
      drill: "Repeated 1v1-vs-keeper finishing reps specifically rewarding a touch-then-finish pattern over an immediate first-time strike."
    },
    {
      id: "wrong-foot-forced",
      label: "Forces a shot on the wrong foot instead of adjusting feet",
      keywords: ["forced it on the wrong foot", "should have adjusted feet", "awkward shot", "off foot shot"],
      why: "Adjusting footwork under pressure feels like it costs time, so players often force a strike from an awkward angle rather than take one extra step.",
      fix: "A quick small adjustment step to get the stronger (or correctly-angled) foot to the ball is almost always faster than the resulting scuffed shot.",
      drill: "Crossed/bouncing-ball finishing where the player must adjust footwork before each strike rather than receiving a ball played straight to the shooting foot."
    }
  ],
  "defending": [
    {
      id: "diving-in",
      label: "Dives into the tackle instead of jockeying",
      keywords: ["dived in", "lunged for the tackle", "committed too early", "got skinned", "beaten by the first touch"],
      why: "A committed tackle removes the defender's balance and recovery option — if it misses, there is no second chance to close the gap.",
      fix: "Stay on the front foot, delay the tackle, and jockey to show the attacker into less dangerous areas rather than committing to win the ball outright.",
      drill: "1v1 jockeying only (no tackling allowed) for a set time, forcing patience and footwork instead of the instinct to dive in."
    },
    {
      id: "square-on-body-shape",
      label: "Defends square-on instead of side-on",
      keywords: ["square on", "flat footed defending", "no angle on the defender", "beaten for pace"],
      why: "A square stance is comfortable in both directions but explosive in neither — the attacker only needs to commit one way to win the race.",
      fix: "Angle the body side-on, weight on the balls of the feet, showing the attacker in one preferred direction (usually away from goal or onto the weaker foot).",
      drill: "Shadow defending: mirror an attacker's lateral movement for 20 seconds keeping a consistent side-on angle, no ball involved."
    },
    {
      id: "ball-watching",
      label: "Ball-watches and loses track of the runner",
      keywords: ["ball watching", "lost my man", "didn't track the run", "runner got in behind", "switched off"],
      why: "Focusing entirely on the ball feels natural but leaves peripheral vision blind to the exact moment an opponent starts their run.",
      fix: "Position the body so both the ball and the nearest attacker are in view at once — 'ball and man' scanning, not one or the other.",
      drill: "Marking practice where a coach randomly calls 'ball' or 'man' and the defender must point to whichever was called without losing sight of the other."
    },
    {
      id: "no-recovery-run",
      label: "Jogs back instead of sprinting on the recovery run",
      keywords: ["jogged back", "didn't sprint back", "slow recovery run", "gave up on the play"],
      why: "After losing the ball or being beaten, the instinct to conserve energy kicks in, but a half-paced recovery run rarely closes the real distance needed.",
      fix: "Treat every recovery run as a sprint until goal-side again, then reassess — a slow recovery run is functionally the same as not recovering at all.",
      drill: "Beat-the-defender-then-sprint-back shuttle: get turned by an attacker, then full-sprint 15m to a marked recovery line before rejoining play."
    },
    {
      id: "rash-challenge-in-box",
      label: "Makes a rash, avoidable challenge in a dangerous area",
      keywords: ["conceded a penalty", "rash tackle", "unnecessary challenge in the box", "silly foul in a dangerous area"],
      why: "Frustration or panic at being beaten leads to grabbing, pulling or lunging rather than accepting the position is lost and containing the damage.",
      fix: "In dangerous areas, prioritise not conceding a foul over winning the ball back — jockey, delay, and force a wide or difficult angle instead of risking contact.",
      drill: "Box-defending scenario reps where the defending goal is explicitly to prevent a clean shot without giving away a foul, not to win the ball."
    }
  ],
  "positioning": [
    {
      id: "static-off-ball",
      label: "Stands still off the ball instead of creating an option",
      keywords: ["stood still", "didn't move off the ball", "no movement", "static off the ball", "no option for the passer"],
      why: "Without the ball, it's easy to switch off and watch play rather than actively working to give a teammate an option.",
      fix: "Constantly ask 'can I be seen, and am I useful right now?' — drift into space, offer an angle, or drag a defender to create room for someone else.",
      drill: "Continuous rondo/possession drill where every player not in possession must be moving at all times — a coach freezes play to check for static players."
    },
    {
      id: "wrong-side-of-defender",
      label: "Gets caught on the wrong side of the defender/offside",
      keywords: ["caught offside", "wrong side of the defender", "mistimed the run", "flagged offside"],
      why: "Runs are often timed off the ball-carrier's body shape rather than the actual moment of release, so the timing is a fraction early.",
      fix: "Time the run to start as the pass is actually played, not when it looks like it's about to be — and check the defensive line's depth first.",
      drill: "Timed-run practice with a server who varies exactly when they release the pass, rewarding runs that start on release, not before."
    },
    {
      id: "too-narrow-or-wide",
      label: "Collapses the team's shape — too narrow or too wide",
      keywords: ["too narrow", "too wide", "bunched up", "no width", "everyone in the same area"],
      why: "Players naturally drift toward the ball because that's where the action is, which collapses the space the team needs to actually use.",
      fix: "Hold width and depth relative to the ball and teammates on purpose — the player nearest the ball should usually be supported by others spread away from them, not next to them.",
      drill: "Positional possession game with zones marked on the pitch that only one player from each team may occupy at a time, forcing spread."
    },
    {
      id: "no-cover-shadow",
      label: "Doesn't cover the space a teammate has vacated",
      keywords: ["left a gap", "didn't cover for teammate", "space in behind unmarked", "no cover shadow"],
      why: "Attention is on personal duties in isolation rather than reading the team shape as a connected system that shifts together.",
      fix: "Whenever a teammate steps out (to press, tackle or attack), actively scan for the gap they leave and shift across to cover it before it's exploited.",
      drill: "Rotational defending shape practice: one defender is told to step out unpredictably, and the unit is scored on how quickly the gap is covered."
    },
    {
      id: "reactive-not-proactive",
      label: "Reacts to where the ball is instead of anticipating",
      keywords: ["always a step behind", "reacting instead of anticipating", "late to the second ball", "slow to react"],
      why: "Watching the ball alone gives information about the present moment only — anticipation comes from reading body shape and patterns just before the ball moves.",
      fix: "Watch the passer's body shape and the shape of the play developing, not just the ball itself, to move a half-second before the ball does.",
      drill: "Small-sided games with a rule that rewards players who move before a pass is released in the right direction, coached with freeze-and-review moments."
    }
  ],
  "decision-making": [
    {
      id: "forcing-hero-play",
      label: "Forces a low-percentage 'hero' play instead of the simple option",
      keywords: ["tried to force it", "went for the hero pass", "overplayed it", "should have kept it simple"],
      why: "The ambition to create something spectacular can override a quick read of the actual odds — a simple 90%-success option is often available but overlooked.",
      fix: "Ask 'what's the highest-percentage option that still moves play forward?' before defaulting to the most eye-catching one.",
      drill: "Small-sided games scored on possession retained per phase, not just end product — rewards decision quality over flair."
    },
    {
      id: "slow-to-decide",
      label: "Takes too long to decide, and the moment passes",
      keywords: ["hesitated", "took too long to decide", "the chance was gone", "froze on the ball"],
      why: "Hesitation is usually a scanning problem, not a courage problem — the picture wasn't built before the ball arrived, so the decision starts from zero.",
      fix: "Build the picture (scan, weigh options) before receiving, so that on the touch the decision is already made and just needs executing.",
      drill: "Rondo/possession with a strict one- or two-touch limit, which forces pre-decision scanning as the only way to keep up."
    },
    {
      id: "ignores-the-obvious-option",
      label: "Misses an unmarked teammate in a better position",
      keywords: ["missed the open man", "didn't see the free player", "better option available", "ignored the unmarked player"],
      why: "Tunnel vision narrows focus onto the most obvious or nearest option under pressure, so a better option further away goes unseen.",
      fix: "Scan the full width of the picture, not just the nearest third, especially in the half-second before playing the ball.",
      drill: "Overload possession drills (e.g. 5v3) where the extra players are deliberately spread wide, rewarding recognition of the furthest free option."
    },
    {
      id: "no-plan-b",
      label: "Has no plan B when the first option is closed off",
      keywords: ["had no other option", "got stuck when it was closed off", "no backup plan", "panicked when pressed"],
      why: "Preparing only one option leaves nothing to fall back on the instant a defender closes the passing lane or space.",
      fix: "While scanning, identify at least two viable options before the ball arrives, so losing one doesn't mean losing the decision entirely.",
      drill: "Rondo where a defender is allowed to close down the first read, forcing the receiver to already have a second option lined up."
    },
    {
      id: "emotional-decision",
      label: "Lets frustration drive the next decision",
      keywords: ["lost composure", "reacted emotionally", "frustration led to a mistake", "lashed out", "let the last mistake affect the next play"],
      why: "A mistake or bad call triggers a stress response that narrows focus and increases impulsive choices on the very next play.",
      fix: "Use a short reset routine (a breath, a phrase, a physical cue) between plays so the next decision is judged on its own merits, not on residual frustration.",
      drill: "Small-sided games where a coach deliberately makes a tight/wrong call, and players are coached on a visible reset routine before the next action."
    }
  ],
  "goalkeeping": [
    {
      id: "poor-starting-position",
      label: "Starting position/angle is wrong before the shot",
      keywords: ["wrong starting position", "poor angle", "not set before the shot", "out of position for the shot"],
      why: "Positioning is often judged relative to the goal line instead of the actual angle to the ball, leaving one side of the goal more open than it should be.",
      fix: "Set position on the line connecting the ball to the centre of the goal, adjusting continuously as the ball and play move, not just once per phase.",
      drill: "Angle-play shooting practice where the ball is moved to varying positions before each shot and the keeper must re-set position each time."
    },
    {
      id: "parries-into-danger",
      label: "Parries a save straight back into a dangerous area",
      keywords: ["parried it back into play", "rebound went to an attacker", "spilled the save", "gave up a rebound"],
      why: "Under pressure, the instinct is simply to stop the shot, without a split-second decision about where the parry should actually go.",
      fix: "Where possible, direct parries wide of goal or into safe space (corner, out of play) rather than straight back out in front of the goal.",
      drill: "Shot-stopping reps scored not just on the save but on whether the resulting rebound lands in a 'safe zone' marked to the side of the goal."
    },
    {
      id: "poor-communication",
      label: "Doesn't communicate with the defense",
      keywords: ["didn't call it", "no communication", "should have shouted", "defender didn't hear the keeper"],
      why: "The goalkeeper has the clearest view of the whole pitch, but that advantage is wasted if calls aren't made early and clearly enough for defenders to react.",
      fix: "Call information early and specifically (name, direction, 'time' or 'man on') rather than generic shouting after the moment has already passed.",
      drill: "Small-sided games where the keeper is required to make at least one specific, named call before every defensive phase, reviewed afterward."
    },
    {
      id: "hesitant-on-crosses",
      label: "Hesitates on crosses — neither claims nor stays",
      keywords: ["hesitated on the cross", "should have claimed it", "stuck between coming and staying", "indecisive on the cross"],
      why: "Committing to claim a cross is genuinely risky, so an indecisive middle-ground response (half-coming) is the worst of both options — it satisfies neither.",
      fix: "Decide early — claim decisively and early, or stay on the line and organise defenders — and commit fully to whichever call is made.",
      drill: "Crossing practice where the keeper must call 'keeper's' or 'away' loudly the instant the cross is struck, removing the indecisive middle response."
    },
    {
      id: "footwork-on-shots",
      label: "Dives across the body instead of setting footwork first",
      keywords: ["dived across body", "poor footwork on the save", "off balance diving", "couldn't reach the shot"],
      why: "Reacting to the ball alone, without a small footwork adjustment first, leaves the body starting from a poor base for the dive.",
      fix: "Use small, quick shuffle steps to square the body to the shot before committing to a dive, rather than diving from a flat-footed, unset position.",
      drill: "Reaction shot-stopping with a mandatory shuffle-step cue before each save, gradually reducing reaction time as footwork becomes automatic."
    }
  ]
};

/* Flat lookup used by both the free-text matcher and the tag-by-dropdown
   workspace, so both features stay in sync with one knowledge base. */
const ALL_MISTAKES = Object.entries(MISTAKES).flatMap(([categoryId, list]) =>
  list.map(m => ({ ...m, categoryId }))
);
const mistakeById = Object.fromEntries(ALL_MISTAKES.map(m => [m.id, m]));

const STORAGE_KEY = "pitchiq-sessions";
const THEME_KEY = "pitchiq-theme";

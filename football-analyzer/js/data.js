/* PitchIQ — data layer: skill categories and a knowledge base of common
   mistakes, each with a plain-language "why", a correction cue, and a
   practice drill. This is the same rule-based approach as Praxis's
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
      keywords: ["heavy touch", "touch too far", "ball ran away", "ball bounced away", "lost control", "touch bounced off", "couldn't control the pass", "first touch too heavy", "ball got away from me", "couldn't control it", "touch was heavy", "poor first touch", "misjudged the touch"],
      why: "The foot is presented stiff and flat on contact instead of relaxed, so it doesn't absorb any of the ball's pace — the touch adds energy instead of cushioning it.",
      fix: "Meet the ball slightly early and let the receiving surface (foot, thigh or chest) 'give' backward a few centimetres on contact, like catching an egg.",
      drill: "Wall-touch drill: pass a ball against a wall from 5–8m, take one cushioned touch that kills 90% of the pace before your next action, 20 reps each foot."
    },
    {
      id: "closed-body-touch",
      label: "Takes a touch side-on/back-to-play, can't see options",
      keywords: ["back to goal", "couldn't see", "didn't check shoulder", "closed body", "receiving with back turned", "no awareness before receiving", "received with back to play", "didn't scan before receiving", "no shoulder check", "blind receiving", "turned into pressure"],
      why: "The player checks the ball, not the pitch — the first touch happens before scanning for pressure and passing options, so the body shape is already wrong when the ball arrives.",
      fix: "Scan over both shoulders in the 1–2 seconds before the ball arrives, and open the body so the first touch can go forward, not just sideways or backward.",
      drill: "Rondo (piggy-in-the-middle) with a mandatory shoulder-check before every touch — a coach or teammate calls 'check' every few seconds as a reminder."
    },
    {
      id: "trailing-leg-touch",
      label: "Touch taken off the trailing/standing leg under pressure",
      keywords: ["trailing leg", "standing leg touch", "off balance receiving", "fell over receiving", "pushed off the ball", "knocked off the ball receiving", "lost balance on the touch", "caught off balance", "bumped off the ball"],
      why: "Receiving on the back foot leaves the body weight over the wrong leg, so a defender's first contact is enough to knock the receiver off balance or win the ball.",
      fix: "Get the touching foot underneath or slightly ahead of the body's centre of gravity, with the standing leg bent and ready to absorb contact.",
      drill: "1v1 receiving under a passive defender's shadow: receiver must take the touch on the front foot and shield in the same motion, 10 reps per side."
    },
    {
      id: "one-footed-control",
      label: "Only ever controls with the stronger foot",
      keywords: ["weak foot", "never uses left foot", "never uses right foot", "one footed", "can't control with other foot", "only comfortable on one foot", "avoids weak foot", "won't use left foot", "won't use right foot", "predictable because of weak foot"],
      why: "Avoiding the weaker foot under pressure telegraphs the next action to defenders and rules out half the available angles to receive and turn.",
      fix: "Deliberately practice controlling with the weaker foot in low-pressure reps until it's no longer a conscious decision in a match.",
      drill: "Weak-foot-only session: 15 minutes of every pass, touch and pass-back using only the non-dominant foot, building up from standing to moving reps."
    },
    {
      id: "static-touch-in-front-of-defender",
      label: "Touch stops dead right in front of a defender",
      keywords: ["touch stopped dead", "gave it straight to the defender", "touch was too close", "let the defender win it back", "touch had no purpose", "gave the ball straight back", "touch went nowhere", "no direction on the touch"],
      why: "A touch with no direction or pace simply re-presents the ball to whoever is closest — usually the defender who was already goal-side.",
      fix: "Every touch should have a purpose: away from the nearest defender, into space, or set up for the very next action — never just 'stop the ball'.",
      drill: "Directional touch drill: receive a pass and the very first touch must go into one of four marked zones around you, chosen based on where a passive defender is standing."
    },
    {
      id: "poor-technique-on-difficult-service",
      label: "Struggles to control awkward or bouncing balls",
      keywords: ["can't control a bouncing ball", "bad touch on a high ball", "fumbled a bouncing pass", "struggled with an awkward ball", "poor technique on a difficult pass", "couldn't control it out of the air"],
      why: "Difficult service (bouncing, driven, or arriving from the air) needs a different receiving surface and timing than a simple rolling pass, and defaulting to the same technique for every ball leads to a mistimed or fumbled touch.",
      fix: "Judge the ball's flight early and choose the correct surface (instep, thigh, chest) before it arrives, adjusting body position to meet it at its most controllable point rather than wherever it happens to land.",
      drill: "Varied-service receiving: a server alternates bouncing, driven and lofted balls at random, and the receiver must call out which surface they'll use before each ball arrives."
    }
  ],
  "passing": [
    {
      id: "no-scan-before-pass",
      label: "Plays a pass into pressure without checking first",
      keywords: ["played into pressure", "didn't see the defender", "pass got intercepted", "passed straight to opponent", "no scan", "didn't check before passing", "passed blind", "no awareness before passing", "gave it away under pressure"],
      why: "The picture in the player's head is out of date — the last shoulder-check happened before the defender closed the passing lane.",
      fix: "Re-scan in the split second before releasing the pass, not just when first receiving the ball — the picture changes every second in a match.",
      drill: "Rondo with a rule that every pass must be preceded by a fresh head-turn, with a coach calling out defender positions to reward accurate reads."
    },
    {
      id: "telegraphed-pass",
      label: "Pass is telegraphed — body shape gives away the direction",
      keywords: ["telegraphed", "defender read the pass", "saw it coming", "obvious pass", "no disguise", "defender saw the pass coming", "pass was predictable", "gave away the pass early", "no disguise on the pass"],
      why: "Opening the hips and shoulders early toward the target gives a defender a full second's head start to step into the passing lane.",
      fix: "Keep the body shape neutral for longer and use the plant foot and a late hip turn to disguise direction until the last possible moment.",
      drill: "Passing under a token defender who is told to intercept any pass they can read early — forces the passer to delay the 'tell' until release."
    },
    {
      id: "wrong-weight-pass",
      label: "Pass under-hit or over-hit — wrong weight for the situation",
      keywords: ["under hit", "over hit", "too soft", "too hard", "pass didn't reach", "pass ran through", "overhit the pass", "pass too weak", "pass too strong", "misjudged the pass", "bad weight of pass"],
      why: "Weight is usually judged on technique alone (how the ball is struck) without factoring in the surface, distance and the receiver's movement.",
      fix: "Judge weight by where the receiver will be by the time the ball arrives, not where they are now, and match the strike to the specific distance.",
      drill: "Moving-target passing: receiver jogs a route and the passer must lead the pass into their path at a weight that needs no adjusting touch."
    },
    {
      id: "always-sideways-safe-pass",
      label: "Only ever plays the safe sideways/backward pass",
      keywords: ["only passed sideways", "never played forward", "too many backward passes", "no risk passes", "always safe pass", "afraid to play forward", "sideways passing only", "won't risk a forward pass", "plays it too safe"],
      why: "Under pressure or lacking confidence, the easiest option (sideways) becomes the default even when a forward option is available and on.",
      fix: "Before defaulting sideways, actively check for a forward option first — it should be the first thing scanned for, not the last resort.",
      drill: "Possession game where forward passes count double and backward passes cost a point, to retrain the first instinct."
    },
    {
      id: "no-first-time-pass",
      label: "Takes an unnecessary extra touch instead of passing first-time",
      keywords: ["extra touch slowed play", "should have played first time", "took too long on the ball", "slow release", "should have played it first time", "too slow to release", "held onto the ball too long before passing"],
      why: "An extra touch feels safer but gives defenders time to recover shape — against a good side, that half-second is the difference between an open and closed passing lane.",
      fix: "Scan before the ball arrives so the decision to play first-time is already made — the touch itself should just execute a decision, not create thinking time.",
      drill: "One- and two-touch possession games (no more touches allowed) to force pre-decision and quick release."
    },
    {
      id: "no-switch-of-play",
      label: "Never switches play to exploit space on the far side",
      keywords: ["never switches the play", "didn't see the switch", "played into a crowded side", "missed the switch of play", "stuck on one side", "should have gone cross field"],
      why: "Focus narrows to the congested side of the pitch where the ball currently is, so the open space and free player on the far side go unnoticed and unused.",
      fix: "Regularly scan the far side of the pitch even when play is settled on the near side, and be willing to play the longer, riskier switch when it's clearly the higher-value option.",
      drill: "Possession game on a full-width pitch where a switch of play that finds a free wide player scores bonus points, rewarding the read over the safer short option."
    }
  ],
  "dribbling": [
    {
      id: "too-many-touches",
      label: "Too many touches, lets the defender set and recover",
      keywords: ["too many touches", "took too long dribbling", "let the defender recover", "over-dribbled", "held onto it too long", "over dribbling", "dribbled too much", "slow with the ball", "too fiddly on the ball"],
      why: "Fiddly, close touches feel controlled but give a recovering defender time to get goal-side again — speed of ball beats speed of feet.",
      fix: "Push the ball further out into space on each touch when there's room to run into, and only slow to close control right at the point of the take-on.",
      drill: "Cone-gate dribbling at speed: dribble at pace through a corridor of gates, only using extra touches inside the last gate before a defender."
    },
    {
      id: "no-change-of-pace",
      label: "Dribbles at one constant speed — no change of pace",
      keywords: ["same speed", "no change of pace", "predictable dribble", "easy to defend", "didn't accelerate", "one speed dribbler", "easy to read the dribble", "no acceleration", "didn't burst past"],
      why: "A defender can match a constant speed indefinitely; it's the sudden acceleration after a slow approach that actually beats them.",
      fix: "Deliberately slow the approach to draw the defender in, then explode away in one sharp burst rather than dribbling at even pace throughout.",
      drill: "Slow-fast 1v1s: attacker must walk/jog the first 3 yards, then hit a maximum-speed burst on a coach's signal to beat the defender."
    },
    {
      id: "one-move-dribbler",
      label: "Relies on the same move every time (predictable)",
      keywords: ["same move every time", "only does one trick", "predictable dribbler", "defender knew what was coming", "only one trick", "same skill move every time", "reads my move every time", "no variety in dribbling"],
      why: "Repeating one move lets defenders scout and pre-empt it within a single half, even if it worked the first time.",
      fix: "Build at least two counter-moves off the same setup (e.g. a stepover that can go either way) so the defender can't simply sit on the first read.",
      drill: "Randomised 1v1s where a coach calls which side the defender should jockey toward, forcing the attacker to use a different response each rep."
    },
    {
      id: "dribbling-into-traffic",
      label: "Dribbles into a crowd instead of open space",
      keywords: ["dribbled into traffic", "ran into defenders", "no space to dribble", "dribbled into a crowd", "dribbled into pressure", "ran into a crowd of defenders", "no space awareness dribbling"],
      why: "Focus narrows onto the ball and the nearest defender, so wider space and a second or third defender closing in go unnoticed.",
      fix: "Pick the direction of the take-on based on where the open space is, not just where the first defender is standing.",
      drill: "Small-sided game (4v4) with floating 'space' zones marked out — bonus point for any successful dribble that ends inside a zone."
    },
    {
      id: "no-shield-under-pressure",
      label: "Gets dispossessed instead of shielding the ball",
      keywords: ["got dispossessed", "lost the ball under pressure", "didn't shield", "tackled off the ball", "turned over possession", "can't shield the ball", "gets muscled off the ball", "weak under contact", "loses the ball to contact"],
      why: "Without a strong, side-on body position between the ball and the defender, there's nothing stopping the defender reaching straight through.",
      fix: "Get side-on with the body as a barrier, ball on the far foot from the defender, and use the arm (not a push) to feel where the defender is.",
      drill: "Shielding 1v1 in a small grid: attacker must keep the ball for 10 seconds using only body position, no dribbling away allowed."
    },
    {
      id: "head-down-dribbling",
      label: "Dribbles with head down, loses awareness of the pitch",
      keywords: ["head down dribbling", "couldn't see the pitch while dribbling", "ran into a defender while dribbling", "not looking up while dribbling", "eyes on the ball too much"],
      why: "Watching the ball constantly feels safer but removes any picture of teammates, space or incoming pressure until it's already too late to react well.",
      fix: "Practice taking touches that need only a glance, freeing the eyes to come up and scan the pitch between touches rather than staring at the ball throughout.",
      drill: "Dribble-and-count: dribble through a grid while a coach holds up fingers at random intervals — the player must call the number without losing the ball, forcing heads-up dribbling."
    }
  ],
  "shooting": [
    {
      id: "rushed-shot",
      label: "Rushes the shot without setting the plant foot",
      keywords: ["rushed the shot", "shot off balance", "didn't set feet", "scuffed the shot", "mishit the shot", "rushed the finish", "didn't set before shooting", "hurried shot", "hit it before setting"],
      why: "Under time pressure, the strike happens before the plant foot is placed, so the body has no stable base to generate accuracy or power from.",
      fix: "Even at speed, get the plant foot alongside the ball, pointing at the target, a fraction of a second before contact — that's what actually needs to slow down, not the run-up.",
      drill: "Shooting off a first touch under a passive chaser: the emphasis is entirely on planting the standing foot correctly, not on power."
    },
    {
      id: "leaning-back-shot",
      label: "Leans back on the shot — ball flies over the bar",
      keywords: ["shot went over the bar", "leaned back", "ballooned it", "skied the shot", "shot went high", "over the crossbar", "leaned back on the strike", "ballooned the shot"],
      why: "Leaning back at the point of contact naturally lifts the strike upward, since the body's weight is moving away from the target instead of through it.",
      fix: "Keep the head and chest over the ball at contact, weight moving forward through the strike, not falling backward.",
      drill: "Shooting into a low target (a small goal or a line of cones) that only rewards strikes kept under a certain height, retraining the body-over-the-ball habit."
    },
    {
      id: "always-power-no-placement",
      label: "Always tries to smash it instead of placing the shot",
      keywords: ["always shoots for power", "no placement", "blazed it wide", "hit it as hard as possible", "hits it too hard", "no finesse on the shot", "blazes every shot", "power over placement"],
      why: "Maximum power reduces control over the strike surface and follow-through, so accuracy drops exactly when it matters most — one-on-ones and open nets.",
      fix: "Read the goalkeeper's position and pick a side before striking; a well-placed shot at 70% power beats a poorly placed one at 100%.",
      drill: "Target-zone finishing: goal is divided into marked zones, and a shot only counts if it's placed in the zone called before the strike."
    },
    {
      id: "no-composure-one-on-one",
      label: "Panics and rushes a one-on-one with the keeper",
      keywords: ["panicked one on one", "rushed against the keeper", "should have gone round the keeper", "shot straight at the keeper", "rushed one on one with keeper", "no composure in front of goal", "panicked in the box", "should have taken a touch first"],
      why: "Adrenaline compresses decision-making, so the first instinct (shoot immediately) overrides reading what the goalkeeper is actually doing.",
      fix: "Take one extra touch to draw the keeper into committing, then finish into the space they've vacated — the situation is rarely as urgent as it feels.",
      drill: "Repeated 1v1-vs-keeper finishing reps specifically rewarding a touch-then-finish pattern over an immediate first-time strike."
    },
    {
      id: "wrong-foot-forced",
      label: "Forces a shot on the wrong foot instead of adjusting feet",
      keywords: ["forced it on the wrong foot", "should have adjusted feet", "awkward shot", "off foot shot", "shot off the wrong foot", "didn't adjust feet before shooting", "awkward strike", "should have set up the shot better"],
      why: "Adjusting footwork under pressure feels like it costs time, so players often force a strike from an awkward angle rather than take one extra step.",
      fix: "A quick small adjustment step to get the stronger (or correctly-angled) foot to the ball is almost always faster than the resulting scuffed shot.",
      drill: "Crossed/bouncing-ball finishing where the player must adjust footwork before each strike rather than receiving a ball played straight to the shooting foot."
    },
    {
      id: "reluctant-to-shoot",
      label: "Passes up good shooting opportunities instead of shooting",
      keywords: ["should have shot", "passed up a good chance", "too reluctant to shoot", "always looks to pass instead of shooting", "didn't take the shot", "overplayed instead of shooting"],
      why: "Fear of missing (and the visible judgment that comes with it) makes passing feel like the lower-risk option, even when a direct shot is statistically the better choice in range and space.",
      fix: "Set a personal rule for what counts as a 'shooting position' (range, angle, space) in advance, so the decision to shoot is already made before the ball arrives rather than negotiated in the moment.",
      drill: "Shooting-focused small-sided games where a covered pass in a shooting position costs a point, retraining the instinct to shoot when the position is good."
    }
  ],
  "defending": [
    {
      id: "diving-in",
      label: "Dives into the tackle instead of jockeying",
      keywords: ["dived in", "lunged for the tackle", "committed too early", "got skinned", "beaten by the first touch", "lunged in", "dove into the challenge", "committed too soon", "beaten because I dove in"],
      why: "A committed tackle removes the defender's balance and recovery option — if it misses, there is no second chance to close the gap.",
      fix: "Stay on the front foot, delay the tackle, and jockey to show the attacker into less dangerous areas rather than committing to win the ball outright.",
      drill: "1v1 jockeying only (no tackling allowed) for a set time, forcing patience and footwork instead of the instinct to dive in."
    },
    {
      id: "square-on-body-shape",
      label: "Defends square-on instead of side-on",
      keywords: ["square on", "flat footed defending", "no angle on the defender", "beaten for pace", "flat footed", "no defensive angle", "square stance defending", "easy to turn"],
      why: "A square stance is comfortable in both directions but explosive in neither — the attacker only needs to commit one way to win the race.",
      fix: "Angle the body side-on, weight on the balls of the feet, showing the attacker in one preferred direction (usually away from goal or onto the weaker foot).",
      drill: "Shadow defending: mirror an attacker's lateral movement for 20 seconds keeping a consistent side-on angle, no ball involved."
    },
    {
      id: "ball-watching",
      label: "Ball-watches and loses track of the runner",
      keywords: ["ball watching", "lost my man", "didn't track the run", "runner got in behind", "switched off", "switched off marking", "lost the runner", "eyes on the ball only", "didn't track my man"],
      why: "Focusing entirely on the ball feels natural but leaves peripheral vision blind to the exact moment an opponent starts their run.",
      fix: "Position the body so both the ball and the nearest attacker are in view at once — 'ball and man' scanning, not one or the other.",
      drill: "Marking practice where a coach randomly calls 'ball' or 'man' and the defender must point to whichever was called without losing sight of the other."
    },
    {
      id: "no-recovery-run",
      label: "Jogs back instead of sprinting on the recovery run",
      keywords: ["jogged back", "didn't sprint back", "slow recovery run", "gave up on the play", "didn't sprint back", "slow to recover", "gave up chasing", "half hearted recovery run"],
      why: "After losing the ball or being beaten, the instinct to conserve energy kicks in, but a half-paced recovery run rarely closes the real distance needed.",
      fix: "Treat every recovery run as a sprint until goal-side again, then reassess — a slow recovery run is functionally the same as not recovering at all.",
      drill: "Beat-the-defender-then-sprint-back shuttle: get turned by an attacker, then full-sprint 15m to a marked recovery line before rejoining play."
    },
    {
      id: "rash-challenge-in-box",
      label: "Makes a rash, avoidable challenge in a dangerous area",
      keywords: ["conceded a penalty", "rash tackle", "unnecessary challenge in the box", "silly foul in a dangerous area", "silly foul in the box", "gave away a penalty", "unnecessary tackle in the area", "conceded a needless foul"],
      why: "Frustration or panic at being beaten leads to grabbing, pulling or lunging rather than accepting the position is lost and containing the damage.",
      fix: "In dangerous areas, prioritise not conceding a foul over winning the ball back — jockey, delay, and force a wide or difficult angle instead of risking contact.",
      drill: "Box-defending scenario reps where the defending goal is explicitly to prevent a clean shot without giving away a foul, not to win the ball."
    },
    {
      id: "overcommits-in-the-press",
      label: "Overcommits when pressing, opens space in behind",
      keywords: ["pressed and got bypassed", "overcommitted pressing", "left space in behind when pressing", "pressed alone", "got played through after pressing"],
      why: "Pressing individually and out of a team shape leaves a gap the moment the presser is beaten, since there's no cover behind to account for the space just vacated.",
      fix: "Press with an angle that cuts off the most dangerous option rather than the ball itself, and only commit fully when cover is in place behind.",
      drill: "Coordinated pressing-triggers practice in a small-sided game, where the press is only 'on' when a specific cue (bad touch, back pass, sideways ball) happens and cover shifts simultaneously."
    }
  ],
  "positioning": [
    {
      id: "static-off-ball",
      label: "Stands still off the ball instead of creating an option",
      keywords: ["stood still", "didn't move off the ball", "no movement", "static off the ball", "no option for the passer", "didn't move without the ball", "no runs off the ball", "invisible off the ball", "gave no passing option"],
      why: "Without the ball, it's easy to switch off and watch play rather than actively working to give a teammate an option.",
      fix: "Constantly ask 'can I be seen, and am I useful right now?' — drift into space, offer an angle, or drag a defender to create room for someone else.",
      drill: "Continuous rondo/possession drill where every player not in possession must be moving at all times — a coach freezes play to check for static players."
    },
    {
      id: "wrong-side-of-defender",
      label: "Gets caught on the wrong side of the defender/offside",
      keywords: ["caught offside", "wrong side of the defender", "mistimed the run", "flagged offside", "mistimed run", "offside again", "poor run timing", "caught out by the offside trap"],
      why: "Runs are often timed off the ball-carrier's body shape rather than the actual moment of release, so the timing is a fraction early.",
      fix: "Time the run to start as the pass is actually played, not when it looks like it's about to be — and check the defensive line's depth first.",
      drill: "Timed-run practice with a server who varies exactly when they release the pass, rewarding runs that start on release, not before."
    },
    {
      id: "too-narrow-or-wide",
      label: "Collapses the team's shape — too narrow or too wide",
      keywords: ["too narrow", "too wide", "bunched up", "no width", "everyone in the same area", "team shape too narrow", "team shape too wide", "no width in the team", "everyone bunched together"],
      why: "Players naturally drift toward the ball because that's where the action is, which collapses the space the team needs to actually use.",
      fix: "Hold width and depth relative to the ball and teammates on purpose — the player nearest the ball should usually be supported by others spread away from them, not next to them.",
      drill: "Positional possession game with zones marked on the pitch that only one player from each team may occupy at a time, forcing spread."
    },
    {
      id: "no-cover-shadow",
      label: "Doesn't cover the space a teammate has vacated",
      keywords: ["left a gap", "didn't cover for teammate", "space in behind unmarked", "no cover shadow", "gap left open", "no cover for teammate", "left space unmarked", "didn't shift across"],
      why: "Attention is on personal duties in isolation rather than reading the team shape as a connected system that shifts together.",
      fix: "Whenever a teammate steps out (to press, tackle or attack), actively scan for the gap they leave and shift across to cover it before it's exploited.",
      drill: "Rotational defending shape practice: one defender is told to step out unpredictably, and the unit is scored on how quickly the gap is covered."
    },
    {
      id: "reactive-not-proactive",
      label: "Reacts to where the ball is instead of anticipating",
      keywords: ["always a step behind", "reacting instead of anticipating", "late to the second ball", "slow to react", "always reacting late", "slow to anticipate", "a step off the pace", "always chasing the game"],
      why: "Watching the ball alone gives information about the present moment only — anticipation comes from reading body shape and patterns just before the ball moves.",
      fix: "Watch the passer's body shape and the shape of the play developing, not just the ball itself, to move a half-second before the ball does.",
      drill: "Small-sided games with a rule that rewards players who move before a pass is released in the right direction, coached with freeze-and-review moments."
    },
    {
      id: "slow-in-transition",
      label: "Slow to adjust position the moment possession changes",
      keywords: ["slow in transition", "didn't react to losing the ball", "caught out of position after a turnover", "slow to get back into shape", "transition was too slow"],
      why: "Treating attack and defense as separate phases rather than a continuous flow means the first few steps after a turnover are wasted deciding what to do instead of already moving.",
      fix: "Prepare a default reaction for the instant possession changes (nearest player presses, others recover shape) so the first movement happens automatically, not after a pause.",
      drill: "Transition-triggered small-sided games where a coach randomly calls a turnover and the team is scored on how quickly the correct shape re-forms."
    }
  ],
  "decision-making": [
    {
      id: "forcing-hero-play",
      label: "Forces a low-percentage 'hero' play instead of the simple option",
      keywords: ["tried to force it", "went for the hero pass", "overplayed it", "should have kept it simple", "tried something too fancy", "overcomplicated it", "should have played simple", "went for glory instead of the easy pass"],
      why: "The ambition to create something spectacular can override a quick read of the actual odds — a simple 90%-success option is often available but overlooked.",
      fix: "Ask 'what's the highest-percentage option that still moves play forward?' before defaulting to the most eye-catching one.",
      drill: "Small-sided games scored on possession retained per phase, not just end product — rewards decision quality over flair."
    },
    {
      id: "slow-to-decide",
      label: "Takes too long to decide, and the moment passes",
      keywords: ["hesitated", "took too long to decide", "the chance was gone", "froze on the ball", "indecisive on the ball", "too slow on the ball", "missed the moment", "delayed the decision"],
      why: "Hesitation is usually a scanning problem, not a courage problem — the picture wasn't built before the ball arrived, so the decision starts from zero.",
      fix: "Build the picture (scan, weigh options) before receiving, so that on the touch the decision is already made and just needs executing.",
      drill: "Rondo/possession with a strict one- or two-touch limit, which forces pre-decision scanning as the only way to keep up."
    },
    {
      id: "ignores-the-obvious-option",
      label: "Misses an unmarked teammate in a better position",
      keywords: ["missed the open man", "didn't see the free player", "better option available", "ignored the unmarked player", "missed the easy pass", "didn't see the simple option", "overlooked the free player"],
      why: "Tunnel vision narrows focus onto the most obvious or nearest option under pressure, so a better option further away goes unseen.",
      fix: "Scan the full width of the picture, not just the nearest third, especially in the half-second before playing the ball.",
      drill: "Overload possession drills (e.g. 5v3) where the extra players are deliberately spread wide, rewarding recognition of the furthest free option."
    },
    {
      id: "no-plan-b",
      label: "Has no plan B when the first option is closed off",
      keywords: ["had no other option", "got stuck when it was closed off", "no backup plan", "panicked when pressed", "no backup option", "didn't have a second option", "stuck with no options", "ran out of ideas"],
      why: "Preparing only one option leaves nothing to fall back on the instant a defender closes the passing lane or space.",
      fix: "While scanning, identify at least two viable options before the ball arrives, so losing one doesn't mean losing the decision entirely.",
      drill: "Rondo where a defender is allowed to close down the first read, forcing the receiver to already have a second option lined up."
    },
    {
      id: "emotional-decision",
      label: "Lets frustration drive the next decision",
      keywords: ["lost composure", "reacted emotionally", "frustration led to a mistake", "lashed out", "let the last mistake affect the next play", "let emotions take over", "reacted badly to a bad call", "tilted after a mistake", "anger affected the next play"],
      why: "A mistake or bad call triggers a stress response that narrows focus and increases impulsive choices on the very next play.",
      fix: "Use a short reset routine (a breath, a phrase, a physical cue) between plays so the next decision is judged on its own merits, not on residual frustration.",
      drill: "Small-sided games where a coach deliberately makes a tight/wrong call, and players are coached on a visible reset routine before the next action."
    },
    {
      id: "ignores-game-context",
      label: "Plays the same way regardless of the scoreline or time left",
      keywords: ["ignored the scoreline", "didn't manage the game", "played the same with 5 minutes left", "no game management", "didn't see the bigger picture"],
      why: "Decision-making defaults to 'best technical option' without factoring in the actual situation — protecting a lead, chasing a game, or managing a red card — which changes what the correct choice actually is.",
      fix: "Before each phase, briefly register the context (score, time, numbers) alongside the technical picture, so decisions serve the match situation, not just the immediate football problem.",
      drill: "Scenario-based small-sided games where a coach assigns a scoreline and time remaining before each phase, and reviews afterward whether decisions matched the situation."
    }
  ],
  "goalkeeping": [
    {
      id: "poor-starting-position",
      label: "Starting position/angle is wrong before the shot",
      keywords: ["wrong starting position", "poor angle", "not set before the shot", "out of position for the shot", "keeper out of position", "wrong angle for the shot", "not set before the save"],
      why: "Positioning is often judged relative to the goal line instead of the actual angle to the ball, leaving one side of the goal more open than it should be.",
      fix: "Set position on the line connecting the ball to the centre of the goal, adjusting continuously as the ball and play move, not just once per phase.",
      drill: "Angle-play shooting practice where the ball is moved to varying positions before each shot and the keeper must re-set position each time."
    },
    {
      id: "parries-into-danger",
      label: "Parries a save straight back into a dangerous area",
      keywords: ["parried it back into play", "rebound went to an attacker", "spilled the save", "gave up a rebound", "bad rebound", "spilled a save into danger", "parry landed in the six yard box"],
      why: "Under pressure, the instinct is simply to stop the shot, without a split-second decision about where the parry should actually go.",
      fix: "Where possible, direct parries wide of goal or into safe space (corner, out of play) rather than straight back out in front of the goal.",
      drill: "Shot-stopping reps scored not just on the save but on whether the resulting rebound lands in a 'safe zone' marked to the side of the goal."
    },
    {
      id: "poor-communication",
      label: "Doesn't communicate with the defense",
      keywords: ["didn't call it", "no communication", "should have shouted", "defender didn't hear the keeper", "keeper didn't talk", "no organisation from the keeper", "quiet keeper", "didn't direct the defense"],
      why: "The goalkeeper has the clearest view of the whole pitch, but that advantage is wasted if calls aren't made early and clearly enough for defenders to react.",
      fix: "Call information early and specifically (name, direction, 'time' or 'man on') rather than generic shouting after the moment has already passed.",
      drill: "Small-sided games where the keeper is required to make at least one specific, named call before every defensive phase, reviewed afterward."
    },
    {
      id: "hesitant-on-crosses",
      label: "Hesitates on crosses — neither claims nor stays",
      keywords: ["hesitated on the cross", "should have claimed it", "stuck between coming and staying", "indecisive on the cross", "indecisive on crosses", "stuck in no man's land", "neither came nor stayed"],
      why: "Committing to claim a cross is genuinely risky, so an indecisive middle-ground response (half-coming) is the worst of both options — it satisfies neither.",
      fix: "Decide early — claim decisively and early, or stay on the line and organise defenders — and commit fully to whichever call is made.",
      drill: "Crossing practice where the keeper must call 'keeper's' or 'away' loudly the instant the cross is struck, removing the indecisive middle response."
    },
    {
      id: "footwork-on-shots",
      label: "Dives across the body instead of setting footwork first",
      keywords: ["dived across body", "poor footwork on the save", "off balance diving", "couldn't reach the shot", "poor footwork before diving", "flat footed save attempt", "didn't set the feet before diving"],
      why: "Reacting to the ball alone, without a small footwork adjustment first, leaves the body starting from a poor base for the dive.",
      fix: "Use small, quick shuffle steps to square the body to the shot before committing to a dive, rather than diving from a flat-footed, unset position.",
      drill: "Reaction shot-stopping with a mandatory shuffle-step cue before each save, gradually reducing reaction time as footwork becomes automatic."
    },
    {
      id: "poor-distribution-choice",
      label: "Distributes under pressure without picking the best option",
      keywords: ["gave the ball away with a poor kick", "bad distribution", "kicked it straight to an opponent", "rushed distribution", "no options considered before distributing"],
      why: "Distribution is often treated as simply 'get rid of it' under pressure, rather than scanned and chosen the same way an outfield pass would be.",
      fix: "Scan for options while the ball is still live (during the save or as it's collected), so distribution has a plan attached rather than being a reflex clearance.",
      drill: "Restricted-distribution practice where the keeper must complete a variety of distribution types (throw, roll, short kick, long kick) to different scenarios set up by a coach, rewarding the correct choice for each."
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

/* ---------- Famous Match Library ----------
   A small, hand-curated set of historically notable matches spanning
   different eras and competitions — World Cup and continental finals,
   Champions League finals, and famous league/title-race games. This is NOT
   a live "look up any match" feed (PitchIQ has no game-data API or backend,
   same static/offline philosophy as everything else here) — it's a fixed,
   auditable library, same idea as the Skill Library above. Typing something
   like "Argentina vs France 2022" fuzzy-matches against team names, the
   year and a few aliases per match; browse the full list below the search
   box if you'd rather pick one directly. */
const FAMOUS_MATCHES = [
  {
    id: "wc2022-final",
    competition: "FIFA World Cup Final",
    year: 2022,
    date: "18 Dec 2022",
    venue: "Lusail Stadium, Qatar",
    teams: ["Argentina", "France"],
    score: "Argentina 3–3 France (aet) — Argentina won 4–2 on penalties",
    aliases: ["world cup final", "qatar", "lusail", "messi", "mbappe", "mbappé"],
    summary: "Argentina raced into a 2-0 lead through the first hour, only for Kylian Mbappé to drag France level with two goals in a two-minute spell late on. Lionel Messi restored the lead in extra time, Mbappé completed a hat-trick from the penalty spot to force a shootout, and Argentina held their nerve from twelve yards to win the trophy.",
    keyMoments: [
      { minute: "23'", title: "Messi converts from the spot after Di María is fouled", categoryId: "shooting", note: "A composed, low, side-footed penalty — placement over power, sending the keeper the wrong way.", clipVideoId: "1svetCz7vzQ" },
      { minute: "36'", title: "Di María finishes a flowing team move", categoryId: "passing", note: "Built from a patient passing sequence through midfield — the payoff of not forcing the pass early.", clipVideoId: "h03Cg0rEmZc" },
      { minute: "80'-81'", title: "Mbappé scores twice in under two minutes", categoryId: "shooting", note: "A penalty followed almost immediately by a first-time volley — a reminder that a two-goal lead is never truly safe late on.", clipVideoId: "UO2S8hdJ4kA" },
      { minute: "108'", title: "Messi pounces on a rebound in extra time", categoryId: "positioning", note: "Alert to the loose ball after the initial effort was saved — the goal came from anticipating the second phase, not the first shot.", clipVideoId: "zhEWqfP6V_w" },
      { minute: "118'", title: "Mbappé completes his hat-trick from the spot", categoryId: "decision-making", note: "Under maximum pressure, in the final minutes of extra time, he stuck to the same routine rather than rushing it.", clipVideoId: "oOKmiG82F74" },
      { minute: "pens", title: "Argentina win the shootout 4–2", categoryId: "goalkeeping", note: "Emiliano Martínez's saves and Gonzalo Montiel's decisive kick settled it — shootouts are often decided by nerve as much as technique.", clipVideoId: "MCWJNOfJoSM" }
    ],
    talkingPoints: [
      { categoryId: "decision-making", title: "Composure doesn't mean rushing", note: "Both Messi's and Mbappé's biggest moments came from sticking to a simple, practiced routine under the highest possible pressure, not trying something new." },
      { categoryId: "positioning", title: "The game isn't over at 2-0 or even 3-2", note: "Argentina had to defend a two-goal lead twice in the same match — switching off after taking a lead is exactly the kind of static, reactive mentality covered in Positioning above." }
    ]
  },
  {
    id: "wc2014-final",
    competition: "FIFA World Cup Final",
    year: 2014,
    date: "13 Jul 2014",
    venue: "Maracanã, Rio de Janeiro",
    teams: ["Germany", "Argentina"],
    score: "Germany 1–0 Argentina (aet)",
    aliases: ["world cup final", "maracana", "gotze", "götze"],
    summary: "A tight, cagey final decided in extra time. Argentina had the best first-half chance and went close again in normal time, but Germany's bench impact told: substitute Mario Götze controlled a cross on his chest and volleyed home with his first real touch of the half.",
    keyMoments: [
      { minute: "47'", title: "Higuaín has a clear sight of goal but shoots wide", categoryId: "shooting", note: "A rushed strike without setting the plant foot properly on the biggest stage — the same mistake covered in the Shooting library, at full intensity.", clipVideoId: "As_hf0psXMw" },
      { minute: "113'", title: "Götze's chest control and first-time volley", categoryId: "first-touch", note: "The touch and the finish were effectively the same motion — an early cushion off the chest set up an instant strike before a defender could close him down.", clipVideoId: "Go75btfNyew" }
    ],
    talkingPoints: [
      { categoryId: "shooting", title: "A half-chance under fatigue is still a chance", note: "Germany's winner came from a substitute converting a single half-chance late in extra time — quality of execution mattered more than the number of chances created." }
    ]
  },
  {
    id: "wc2014-semifinal",
    competition: "FIFA World Cup Semi-Final",
    year: 2014,
    date: "8 Jul 2014",
    venue: "Estádio Mineirão, Belo Horizonte",
    teams: ["Brazil", "Germany"],
    score: "Germany 7–1 Brazil",
    aliases: ["mineirazo", "mineirao", "semi final", "semifinal", "7-1", "klose"],
    summary: "One of the most one-sided results in World Cup history. Playing at home and without the suspended Neymar and injured captain Thiago Silva, Brazil collapsed defensively, conceding five goals in an eighteen-minute spell either side of the half-hour mark. Germany led 5-0 by the 29th minute and cruised to a 7-1 win.",
    keyMoments: [
      { minute: "11'", title: "Müller scores unmarked from a corner", categoryId: "defending", note: "Left completely free at the back post from a short corner routine — no defender picked him up.", clipVideoId: "aE4BdIP6bvc" },
      { minute: "23'-29'", title: "Germany score four more goals in six minutes", categoryId: "positioning", note: "Brazil's defensive shape disintegrated after the first goal — gaps that opened once were exploited again and again rather than being reorganized.", clipVideoId: "aE4BdIP6bvc" },
      { minute: "90'", title: "Oscar scores a late consolation for Brazil", categoryId: "decision-making", note: "A rare moment of composure late on, after a night where panic had visibly taken over the team's decision-making.", clipVideoId: "aE4BdIP6bvc" }
    ],
    talkingPoints: [
      { categoryId: "defending", title: "One unmarked runner is a warning, not bad luck", note: "Brazil conceded from an almost identical lack of marking multiple times in the same spell — exactly the 'ball-watching, loses track of the runner' pattern covered in Defending, repeated instead of corrected." },
      { categoryId: "decision-making", title: "Panic compounds mistakes", note: "Once the scoreline got away from Brazil, individual errors multiplied — the clearest large-scale example of why the 'reset routine between plays' habit in Decision Making matters most exactly when a game is going badly." }
    ]
  },
  {
    id: "wc2010-final",
    competition: "FIFA World Cup Final",
    year: 2010,
    date: "11 Jul 2010",
    venue: "Soccer City, Johannesburg",
    teams: ["Spain", "Netherlands"],
    score: "Spain 1–0 Netherlands (aet)",
    aliases: ["world cup final", "johannesburg", "iniesta"],
    summary: "One of the most physical finals in World Cup history — the Netherlands tried to disrupt Spain's passing rhythm with a series of hard, and at times reckless, challenges. Spain absorbed it and won it in the closing minutes of extra time through Andrés Iniesta.",
    keyMoments: [
      { minute: "28'", title: "De Jong's chest-high challenge on Alonso goes unpunished", categoryId: "defending", note: "A textbook example of a rash, avoidable challenge — it won nothing back and only invited more pressure on the defense.", clipVideoId: "uwqLn0F8jXk" },
      { minute: "116'", title: "Iniesta volleys in after a cushioned chest control from Fàbregas' pass", categoryId: "shooting", note: "Composed, low, and side-footed under extreme fatigue — the exact opposite of rushing the shot.", clipVideoId: "3pCPQDxZzfY" }
    ],
    talkingPoints: [
      { categoryId: "defending", title: "Frustration is expensive", note: "The Netherlands picked up nine yellow cards trying to break Spain's rhythm with the body instead of positioning — the kind of emotional, reactive defending covered in the Defending library." }
    ]
  },
  {
    id: "wc2006-final",
    competition: "FIFA World Cup Final",
    year: 2006,
    date: "9 Jul 2006",
    venue: "Olympiastadion, Berlin",
    teams: ["Italy", "France"],
    score: "Italy 1–1 France (aet) — Italy won 5–3 on penalties",
    aliases: ["world cup final", "berlin", "zidane", "zinedine zidane", "materazzi"],
    summary: "Remembered as much for its ending as its football. Zinedine Zidane opened the scoring with an audacious 'Panenka' penalty, Marco Materazzi headed Italy level from a corner, and — in his final professional match — Zidane was sent off in extra time for headbutting Materazzi. Italy won the shootout.",
    keyMoments: [
      { minute: "7'", title: "Zidane's chipped 'Panenka' penalty", categoryId: "shooting", note: "A high-risk placement choice under enormous occasion pressure — it worked here, but it's the opposite of the 'read the keeper, don't force it' principle covered in the Shooting library.", clipVideoId: "l3e9G9eJRjc" },
      { minute: "19'", title: "Materazzi heads Italy level from a corner", categoryId: "positioning", note: "Won on pure movement and timing at the near post from a set piece — a reminder that defending set pieces starts with attacking them well too.", clipVideoId: "nyxfM7mTUWw" },
      { minute: "110'", title: "Zidane is sent off for headbutting Materazzi", categoryId: "decision-making", note: "One of the most famous examples in the sport of letting frustration override a decision — it removed Zidane, and arguably France's best outlet, from the shootout.", clipVideoId: "DhIAs8vRZlc" }
    ],
    talkingPoints: [
      { categoryId: "decision-making", title: "The reset routine matters most in the biggest moments", note: "Whatever provoked Zidane, the response cost his team a player in extra time of a World Cup final — exactly the scenario the 'reset routine between plays' fix in Decision Making is built for." }
    ]
  },
  {
    id: "wc1998-final",
    competition: "FIFA World Cup Final",
    year: 1998,
    date: "12 Jul 1998",
    venue: "Stade de France, Saint-Denis",
    teams: ["France", "Brazil"],
    score: "France 3–0 Brazil",
    aliases: ["world cup final", "stade de france", "zidane"],
    summary: "The host nation's first World Cup, built on two Zinedine Zidane headers from corners either side of half-time and a late Emmanuel Petit goal on the counter. Brazil, missing their attacking spark on the day, never got a foothold.",
    keyMoments: [
      { minute: "27' & 45'", title: "Zidane scores twice with near-identical headers from corners", categoryId: "positioning", note: "Both goals came from the same near-post run, arriving on the ball's flight rather than reacting to it after it arrived — proactive movement, not reactive.", clipVideoId: "XZDQoM3a-uw" },
      { minute: "90+3'", title: "Petit finishes a counter-attack to make it 3-0", categoryId: "decision-making", note: "A simple, high-percentage finish on the break rather than trying to work a fancier chance with the game already won.", clipVideoId: "XZDQoM3a-uw" }
    ],
    talkingPoints: [
      { categoryId: "positioning", title: "Set pieces are won before the ball arrives", note: "Both of France's opening goals were the same rehearsed near-post run — a reminder that set-piece routines are about winning the space early, not outjumping someone at the last second." }
    ]
  },
  {
    id: "wc1986-final",
    competition: "FIFA World Cup Final",
    year: 1986,
    date: "29 Jun 1986",
    venue: "Estadio Azteca, Mexico City",
    teams: ["Argentina", "West Germany"],
    score: "Argentina 3–2 West Germany",
    aliases: ["world cup final", "azteca", "maradona", "burruchaga"],
    summary: "Argentina led 2-0 and looked comfortable before West Germany fought back to 2-2 with two headed goals from corners in the space of eight minutes. Diego Maradona settled it with a defense-splitting through ball for Jorge Burruchaga to run onto and finish.",
    keyMoments: [
      { minute: "74' & 80'", title: "West Germany level it up with two headers from corners", categoryId: "defending", note: "Argentina lost track of unmarked runners at the back post twice in the same spell — the same 'ball-watching' pattern covered in the Defending library.", clipVideoId: "zXVMBHmw-60" },
      { minute: "83'", title: "Maradona's pass sets up Burruchaga's winner", categoryId: "passing", note: "A single, perfectly weighted through ball that needed no adjusting touch from the runner — timed to the run, not just struck hard.", clipVideoId: "cPavEdRukT4" }
    ],
    talkingPoints: [
      { categoryId: "defending", title: "A two-goal lead can vanish in ten minutes", note: "Two near-identical set-piece goals conceded in quick succession show how one uncorrected marking issue gets exploited again immediately if it isn't fixed after the first goal." }
    ]
  },
  {
    id: "ucl2005-final",
    competition: "UEFA Champions League Final",
    year: 2005,
    date: "25 May 2005",
    venue: "Atatürk Olympic Stadium, Istanbul",
    teams: ["Liverpool", "AC Milan"],
    score: "Liverpool 3–3 AC Milan (aet) — Liverpool won 3–2 on penalties",
    aliases: ["champions league final", "istanbul", "miracle of istanbul", "gerrard", "dudek"],
    summary: "Known as the 'Miracle of Istanbul'. AC Milan led 3-0 at half-time and looked to have the final won. Liverpool scored three times in six second-half minutes to level it, held on through extra time behind a string of Jerzy Dudek saves, and won the shootout.",
    keyMoments: [
      { minute: "0'-44'", title: "Milan score three times before half-time", categoryId: "shooting", note: "Clinical, varied finishing (header, two close-range strikes) built from a dominant first-half performance — the kind of ruthless edge the Shooting library is built around.", clipVideoId: "PWErN627Il8" },
      { minute: "54'-60'", title: "Liverpool score three goals in six minutes to level it", categoryId: "decision-making", note: "Rather than freezing 3-0 down at half-time, Liverpool's response was immediate and direct — a real-world case of the 'reset routine, don't let the last mistake affect the next play' fix.", clipVideoId: "PWErN627Il8" },
      { minute: "pens", title: "Dudek's saves force and then win the shootout", categoryId: "goalkeeping", note: "A double save in extra time followed by a shootout save — decisive goalkeeping under repeated, sustained pressure.", clipVideoId: "PWErN627Il8" }
    ],
    talkingPoints: [
      { categoryId: "decision-making", title: "3-0 down at half-time is not 3-0 down for the whole match", note: "The most-cited comeback in the competition's history is a direct illustration of resetting after a run of bad play instead of letting it compound." }
    ]
  },
  {
    id: "ucl1999-final",
    competition: "UEFA Champions League Final",
    year: 1999,
    date: "26 May 1999",
    venue: "Camp Nou, Barcelona",
    teams: ["Manchester United", "Bayern Munich"],
    score: "Manchester United 2–1 Bayern Munich",
    aliases: ["champions league final", "camp nou", "solskjaer", "sheringham"],
    summary: "Bayern Munich led from the sixth minute and controlled most of the match, hitting the woodwork twice. Manchester United, chasing a historic treble, scored twice in stoppage time through substitutes Teddy Sheringham and Ole Gunnar Solskjær to complete one of football's most dramatic turnarounds.",
    keyMoments: [
      { minute: "6'", title: "Basler's free kick gives Bayern an early lead", categoryId: "shooting", note: "A well-placed, low free kick that the wall and keeper simply couldn't cover in time.", clipVideoId: "1yON3ySblWQ" },
      { minute: "91'", title: "Sheringham equalizes from a corner scramble", categoryId: "positioning", note: "A striker introduced as a substitute specifically to be in the right place for exactly this kind of second-ball chance.", clipVideoId: "1yON3ySblWQ" },
      { minute: "93'", title: "Solskjær scores the winner with the last kick of the game", categoryId: "positioning", note: "Arriving late into the box from a deeper starting position — the run itself is what created the chance, not a moment of individual skill.", clipVideoId: "1yON3ySblWQ" }
    ],
    talkingPoints: [
      { categoryId: "positioning", title: "Late runners change games", note: "Both United goals came from substitutes making runs into the box that Bayern's defense hadn't accounted for — proactive movement beating a settled, tired back line." }
    ]
  },
  {
    id: "ucl2012-final",
    competition: "UEFA Champions League Final",
    year: 2012,
    date: "19 May 2012",
    venue: "Allianz Arena, Munich",
    teams: ["Chelsea", "Bayern Munich"],
    score: "Chelsea 1–1 Bayern Munich (aet) — Chelsea won 4–3 on penalties",
    aliases: ["champions league final", "munich", "drogba"],
    summary: "Bayern Munich, playing the final in their own stadium, took a late lead through Thomas Müller, but Didier Drogba headed Chelsea level almost immediately. Arjen Robben had a penalty saved in extra time, and Chelsea held on to win the shootout — with Drogba scoring the decisive kick.",
    keyMoments: [
      { minute: "83'", title: "Müller heads Bayern in front", categoryId: "positioning", note: "Ghosted into space between Chelsea's centre-backs at the back post — a gap that had been showing for several minutes before it was punished.", clipVideoId: "NpsTYu2Han4" },
      { minute: "88'", title: "Drogba equalizes with a header from a corner", categoryId: "positioning", note: "An immediate response rather than a team that let the setback affect the next few minutes of play.", clipVideoId: "NpsTYu2Han4" },
      { minute: "penalties", title: "Robben's extra-time penalty is saved", categoryId: "shooting", note: "A well-placed save by Petr Čech rewarded, but also a reminder that even elite penalty-takers can be read under pressure.", clipVideoId: "NpsTYu2Han4" }
    ],
    talkingPoints: [
      { categoryId: "decision-making", title: "Respond immediately, don't dwell", note: "Chelsea conceded with five minutes left and were level within ninety seconds — the value of an immediate, composed response over one that lets panic set in." }
    ]
  },
  {
    id: "euro2020-final",
    competition: "UEFA European Championship Final",
    year: 2021,
    date: "11 Jul 2021",
    venue: "Wembley Stadium, London",
    teams: ["Italy", "England"],
    score: "Italy 1–1 England (aet) — Italy won 3–2 on penalties",
    aliases: ["euro 2020", "euro final", "euros final", "wembley"],
    summary: "England took an early lead — the fastest goal in a European Championship final — but Italy gradually took control of possession, equalized in the second half, and went on to win the shootout.",
    keyMoments: [
      { minute: "2'", title: "Shaw scores from a flowing early move", categoryId: "shooting", note: "A first-time, first-half finish taken instinctively — no time to overthink the placement, and it paid off.", clipVideoId: "MUcW1mcljHU" },
      { minute: "67'", title: "Bonucci scrambles in an equalizer from a corner", categoryId: "positioning", note: "Alert to a loose ball in a crowded box after the initial header wasn't cleared — reading the second phase of a set piece, not just the first contact.", clipVideoId: "g-kwLolv--w" }
    ],
    talkingPoints: [
      { categoryId: "decision-making", title: "An early lead changes nothing about the shape of a 90-minute game", note: "England led for over an hour, but Italy's patient, sustained pressure eventually told — a reminder not to sit back and defend a lead too early or too passively." }
    ]
  },
  {
    id: "pl2012-city-qpr",
    competition: "Premier League",
    year: 2012,
    date: "13 May 2012",
    venue: "Etihad Stadium, Manchester",
    teams: ["Manchester City", "Queens Park Rangers"],
    score: "Manchester City 3–2 QPR",
    aliases: ["man city", "manchester city", "qpr", "aguero", "agüero", "premier league title", "aguerooo"],
    summary: "The final day of the 2011–12 Premier League season. Manchester City needed a win to clinch their first English top-flight title in 44 years, level on points with Manchester United. City fell behind twice to ten-man QPR and were still drawing 2-2 deep into stoppage time before scoring twice in the space of two minutes.",
    keyMoments: [
      { minute: "90+2'", title: "Džeko heads in an equalizer from a corner", categoryId: "positioning", note: "A team refusing to accept the game — and the title — was slipping away, still committing bodies forward in the final minute.", clipVideoId: "Jdft82Jup2U" },
      { minute: "90+4'", title: "Agüero receives, turns and finishes for the winner", categoryId: "first-touch", note: "A composed touch to set himself up for the shot in a congested box, under about as much pressure and stakes as exists in the sport.", clipVideoId: "U1fhiP2fjYc" }
    ],
    talkingPoints: [
      { categoryId: "decision-making", title: "Keep playing until the whistle actually goes", note: "City were a goal down with three minutes of normal time left and still won the match and the title — the value of not letting the situation dictate a passive mentality before it's actually over." }
    ]
  },
  {
    id: "laliga2017-clasico",
    competition: "La Liga (El Clásico)",
    year: 2017,
    date: "23 Apr 2017",
    venue: "Camp Nou, Barcelona",
    teams: ["Barcelona", "Real Madrid"],
    score: "Barcelona 3–2 Real Madrid",
    aliases: ["el clasico", "el clásico", "clasico", "barcelona vs real madrid", "messi"],
    summary: "A back-and-forth Clásico with five different goalscorers, decided in stoppage time when Lionel Messi collected the ball, drove at the Madrid defense and finished for a 3-2 winner — then held up his shirt to a crowd that had whistled him earlier in the game.",
    keyMoments: [
      { minute: "90+2'", title: "Messi's driving run and finish wins it", categoryId: "dribbling", note: "A sharp change of pace to get half a yard on the defender rather than trying to dribble past multiple players at a constant speed.", clipVideoId: "zN1KZkNBhig" }
    ],
    talkingPoints: [
      { categoryId: "dribbling", title: "One decisive burst beats a string of touches", note: "The winning move was one acceleration into space, not a series of tricks — matching the 'change of pace beats constant speed' fix in the Dribbling library." }
    ]
  }
];
const matchById = Object.fromEntries(FAMOUS_MATCHES.map(m => [m.id, m]));

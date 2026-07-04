/* Rooted — data layer.
   Country reference data, the SQ (Sustainability Quotient) scoring model, and the
   Wellness Advisor's knowledge base. */

const COUNTRIES = [
  {
    id: "india",
    name: "India",
    flag: "\u{1F1EE}\u{1F1F3}",
    color: "#2a78d6",
    colorDark: "#3987e5",
    heritage: "Ayurveda & Yogic Living",
    heritageNote: "5,000-year tradition of dosha-based recovery and breathwork already embedded in daily life.",
    currency: "₹"
  },
  {
    id: "mexico",
    name: "Mexico",
    flag: "\u{1F1F2}\u{1F1FD}",
    color: "#1baf7a",
    colorDark: "#199e70",
    heritage: "Temazcal & Curanderismo Traditions",
    heritageNote: "Sweat-lodge ceremony and herbal-medicine practices rooted in Indigenous Mesoamerican culture.",
    currency: "$"
  },
  {
    id: "japan",
    name: "Japan",
    flag: "\u{1F1EF}\u{1F1F5}",
    color: "#eda100",
    colorDark: "#c98500",
    heritage: "Shinrin-yoku & Ikigai",
    heritageNote: "Forest-bathing and 'reason for being' philosophy, both linked in Japanese public-health research to lower cortisol and higher longevity.",
    currency: "¥"
  },
  {
    id: "costarica",
    name: "Costa Rica",
    flag: "\u{1F1E8}\u{1F1F7}",
    color: "#008300",
    colorDark: "#008300",
    heritage: "Pura Vida & Blue Zone Living",
    heritageNote: "Nicoya Peninsula is one of five UN-recognized Blue Zones, where community, purpose and movement are inseparable from daily life.",
    currency: "₡"
  }
];

const countryById = Object.fromEntries(COUNTRIES.map(c => [c.id, c]));

/* ---------- SQ Prototype ----------
   Each category carries a fixed point table (unchanged from the original
   formula, so the score stays auditable) plus per-option "why" and "swap"
   text so the result can explain the specific choice a user made, not just
   show a number. SQ_CATEGORY_META drives both the form labels and the
   category-by-category breakdown/insight rendering in js/app.js. */
const SQ_OPTIONS = {
  workout: [
    { label: "Traditional / cultural practice (yoga, forest walk, beach workout)", points: 30, why: "Traditional practices carry their own built-in recovery ritual, so the workout and the cultural practice reinforce each other instead of competing for time." },
    { label: "Outdoor run or cycle", points: 24, why: "Outdoor cardio avoids gym energy overhead, though it doesn't carry the same built-in cultural-recovery pairing as a traditional practice." },
    { label: "Eco-certified / solar-powered gym", points: 20, why: "Renewable-powered facilities cut the energy footprint of an indoor session substantially versus a standard grid-powered gym." },
    { label: "Home bodyweight workout", points: 16, why: "Zero facility footprint, but indoor and solo, so it misses both the outdoor-setting and shared-practice bonus a traditional session gets." },
    { label: "Conventional air-conditioned gym", points: 8, why: "HVAC load and equipment energy use make this the highest-footprint setting in the model." }
  ],
  gear: [
    { label: "No specialized gear needed", points: 25, why: "Nothing manufactured, shipped or eventually discarded for this session." },
    { label: "Recycled / upcycled activewear", points: 22, why: "Diverts material from landfill and avoids virgin-fibre production, close to the ceiling for this category." },
    { label: "Natural fibre (organic cotton, hemp, agave)", points: 18, why: "Biodegradable and lower embodied energy than synthetics, though still newly manufactured." },
    { label: "New synthetic activewear", points: 8, why: "Petroleum-derived synthetics have the highest production footprint and shed microplastics in washing." }
  ],
  travel: [
    { label: "Worked out at home", points: 25, why: "Zero transport emissions — the ceiling for this category." },
    { label: "Walked or cycled to the session", points: 25, why: "Human-powered travel matches working out at home for transport footprint." },
    { label: "Public transit", points: 17, why: "Shared transport spreads emissions across many riders versus a private vehicle." },
    { label: "Carpooled", points: 11, why: "Splitting a car trip across riders roughly halves (or more) the per-person footprint of driving alone." },
    { label: "Drove alone", points: 4, why: "A single-occupant car trip is the highest per-person transport footprint in the model." }
  ],
  recovery: [
    { label: "Air-dried, no shower needed", points: 20, why: "No water or water-heating energy used post-workout." },
    { label: "Short shower (under 5 minutes)", points: 15, why: "Keeps water and heating-energy use low while still getting a proper rinse." },
    { label: "Standard shower", points: 9, why: "Typical water and energy use for a full shower." },
    { label: "Long shower or bath", points: 3, why: "The highest water and water-heating footprint of the post-workout options." }
  ]
};

/* Drives the SQ form's field order/labels and the per-category breakdown +
   "biggest opportunity" insight in js/app.js — add a category here and both
   update automatically. */
const SQ_CATEGORY_META = [
  { key: "workout", label: "Workout setting", icon: "\u{1F3CB}\u{FE0F}", max: 30 },
  { key: "gear", label: "Gear", icon: "\u{1F455}", max: 25 },
  { key: "travel", label: "Travel to workout", icon: "\u{1F6B2}", max: 25 },
  { key: "recovery", label: "Post-workout resource use", icon: "\u{1F6BF}", max: 20 }
];

const SQ_TIERS = [
  { min: 85, max: 100, name: "Flourishing Root", badge: "\u{1F33F}",
    description: "You're operating near the ceiling of the model — every category is close to its best available option. The main lever left is consistency: repeating this pattern is what turns a single high score into a real footprint reduction." },
  { min: 65, max: 84, name: "Rooted", badge: "\u{1F33E}",
    description: "A solidly sustainable session with one or two categories still leaving points on the table. Closing the single biggest gap below would likely be enough to reach Flourishing Root." },
  { min: 40, max: 64, name: "Growing", badge: "\u{1F331}",
    description: "A mixed session — some genuinely low-footprint choices alongside at least one high-footprint one. The category breakdown below shows exactly which input is holding the score back most." },
  { min: 0, max: 39, name: "Sprout", badge: "\u{1F33B}",
    description: "Every category has real room to improve. That's not a judgment — it's the starting tier everyone begins at, and the single biggest-opportunity swap below is usually worth more points than any other change." }
];

/* Average SQ across a recent illustrative community sample — used only to
   give the result a comparison point ("above/below the community average"),
   not a claim about real user data. */
const SQ_COMMUNITY_AVERAGE = 68;

const CULTURAL_PRACTICES = {
  india: "Try a 10-minute pranayama (breathwork) cool-down — the traditional Ayurvedic recovery method for balancing exertion.",
  mexico: "Consider a guided temazcal-inspired breathing circle — a Mesoamerican sweat-lodge practice for recovery and community bonding.",
  japan: "Take a 20-minute shinrin-yoku forest walk — clinically studied in Japan for lowering cortisol after exertion.",
  costarica: "Close your session with a Pura Vida gratitude pause — a Blue Zone habit linked to long-term stress reduction."
};

/* ---------- Health-concern advisor ----------
   Rule-based keyword matching against a small knowledge base of common,
   non-emergency wellness concerns. Not medical advice — see the disclaimer
   rendered alongside every result in the app. */
const HEALTH_RED_FLAGS = [
  "suicidal", "suicide", "self harm", "self-harm", "chest pain", "can't breathe",
  "cannot breathe", "severe bleeding", "overdose", "collapse", "seizure", "stroke"
];

/* Purely lexical intensity signal — counts how many of these modifier words
   appear alongside a matched concern, to shade the tone of the response
   (Mild / Moderate / Elevated) without ever diagnosing anything. See
   detectIntensity() in js/app.js. */
const HEALTH_INTENSITY_MODIFIERS = [
  "really", "very", "extremely", "so", "always", "constantly", "every night",
  "every day", "all the time", "chronic", "severe", "severely", "can't", "cant",
  "unable to", "nonstop", "non-stop", "terrible", "awful", "worst", "months",
  "weeks now", "keeps happening"
];

/* Pairwise notes shown when two concerns are both matched in the same
   description — gives the advisor a synthesized read instead of just
   listing concerns side by side. */
const HEALTH_CONCERN_COMBOS = [
  { ids: ["stress-anxiety", "sleep"], note: "Stress and poor sleep commonly reinforce each other — an activated nervous system makes it harder to fall asleep, and short sleep lowers your stress threshold the next day. Addressing your evening wind-down routine tends to help both at once." },
  { ids: ["sleep", "low-energy"], note: "Fatigue that follows poor sleep usually resolves as sleep quality improves — treat the sleep routine as the primary lever and expect energy to follow within a few nights." },
  { ids: ["low-energy", "low-mood"], note: "Low energy and low mood often travel together, and light outdoor movement is one of the few actions well-evidenced to lift both at the same time." },
  { ids: ["back-joint-pain", "stress-anxiety"], note: "Muscular tension is a common physical side-effect of stress — gentle mobility work paired with a breathwork practice often eases both the tightness and the underlying tension." },
  { ids: ["stress-anxiety", "digestion"], note: "The gut and the nervous system are closely linked, so stress-related digestive discomfort is common — slowing down at mealtimes alongside your stress practice can help both." }
];

const HEALTH_CONCERNS = [
  {
    id: "stress-anxiety",
    label: "Stress, anxiety or feeling overwhelmed",
    keywords: ["stress", "stressed", "anxious", "anxiety", "overwhelm", "panic", "tense", "worry", "worried", "nervous", "burnout", "burnt out"],
    generalAdvice: "Slow, paced breathing activates the parasympathetic nervous system and is one of the fastest-acting, best-evidenced ways to lower momentary stress.",
    actionPlan: {
      today: "Try a 4-7-8 breath: inhale 4 seconds, hold 7, exhale 8, repeated for five rounds.",
      thisWeek: "Block 10 minutes at the same time each day for whichever regional practice below fits your schedule — consistency matters more than duration.",
      whenToSeekHelp: "If stress or anxiety is interfering with sleep, work or relationships most days for more than two weeks, talk to a doctor or counselor."
    },
    practices: {
      india: "A 10-minute pranayama (breathwork) session — the core stress-management technique taught in Ayurvedic tradition for centuries.",
      mexico: "A guided temazcal-inspired breathing and reflection circle, drawn from Mesoamerican curanderismo tradition.",
      japan: "A 20–40 minute shinrin-yoku forest walk at a certified Forest Therapy Base — Japanese public-health research links it to measurably lower cortisol.",
      costarica: "A brief Pura Vida gratitude pause and social check-in, a documented daily habit in the Nicoya Blue Zone."
    }
  },
  {
    id: "sleep",
    label: "Trouble sleeping or poor sleep quality",
    keywords: ["sleep", "insomnia", "can't sleep", "cant sleep", "tired", "restless", "wake up", "waking up", "sleepless"],
    generalAdvice: "A consistent, screen-free wind-down routine in the hour before bed is one of the most reliable non-clinical sleep-quality improvements.",
    actionPlan: {
      today: "Set a screen cut-off 30–60 minutes before bed and dim lights an hour before that.",
      thisWeek: "Pick a fixed bedtime and wake time (even on weekends) — a stable rhythm improves sleep quality faster than extra hours of unstructured sleep.",
      whenToSeekHelp: "If poor sleep persists most nights for more than a month, or you experience loud snoring with breathing pauses, see a doctor or sleep specialist."
    },
    practices: {
      india: "An evening Abhyanga-inspired self-massage with warm oil, an Ayurvedic wind-down ritual before sleep.",
      mexico: "A warm temazcal-style steam or bath ritual in the early evening to lower body temperature before bed.",
      japan: "A short evening walk in nature (shinrin-yoku) rather than a screen — linked to improved sleep onset in Japanese studies.",
      costarica: "A fixed, unhurried evening routine with family or neighbors — the social-rhythm habit common among Nicoya centenarians."
    }
  },
  {
    id: "low-energy",
    label: "Low energy or fatigue",
    keywords: ["fatigue", "low energy", "exhausted", "exhaustion", "no energy", "sluggish", "lethargic", "tired all the time"],
    generalAdvice: "Short bouts of outdoor movement plus regular hydration and light exposure are well-evidenced, low-effort ways to counter daytime fatigue.",
    actionPlan: {
      today: "Get 10 minutes of outdoor daylight within an hour of waking — it's one of the fastest levers for daytime alertness.",
      thisWeek: "Add one short movement break (5–10 minutes) mid-afternoon, when energy typically dips lowest.",
      whenToSeekHelp: "If fatigue is constant, unexplained and not improved by rest for more than two to three weeks, get it checked by a doctor — it can flag things exercise alone won't fix."
    },
    practices: {
      india: "A short morning Surya Namaskar (sun salutation) sequence, traditionally used in yogic practice to build steady energy.",
      mexico: "A brisk outdoor walk followed by a herbal-infusion break, drawing on traditional curanderismo plant remedies for vitality.",
      japan: "A short forest or park walk (shinrin-yoku) in daylight hours to reset circadian rhythm and mood.",
      costarica: "Light daily movement paired with a plant-forward Nicoya-style breakfast — a Blue Zone longevity habit."
    }
  },
  {
    id: "back-joint-pain",
    label: "Back, joint or muscle pain",
    keywords: ["back pain", "joint pain", "muscle pain", "sore", "soreness", "stiff", "stiffness", "ache", "aches", "arthritis"],
    generalAdvice: "Gentle mobility work and heat-based recovery are common first-line, non-clinical approaches to everyday muscular stiffness — persistent or severe pain should be assessed by a professional.",
    actionPlan: {
      today: "Move through a slow, full range-of-motion stretch for the affected area for 5 minutes — avoid anything sharp or pinching.",
      thisWeek: "Alternate gentle mobility days with rest days rather than pushing through stiffness daily.",
      whenToSeekHelp: "If pain is sharp, radiating, follows an injury, or hasn't eased after a week of gentle care, see a doctor or physiotherapist before continuing."
    },
    practices: {
      india: "Restorative yoga postures with Ayurvedic warm-oil massage (Abhyanga) for joint and muscle recovery.",
      mexico: "A temazcal steam session, traditionally used for muscular relief and circulation.",
      japan: "A slow forest walk (shinrin-yoku) on soft, uneven terrain to gently mobilize joints at low impact.",
      costarica: "Gentle beach or trail walking at a relaxed pace, consistent with everyday Nicoya movement patterns."
    }
  },
  {
    id: "low-mood",
    label: "Low mood or lack of motivation",
    keywords: ["sad", "low mood", "depress", "unmotivated", "no motivation", "down", "hopeless", "lonely", "isolated"],
    generalAdvice: "Time in nature and small, achievable movement goals are well-evidenced mood supports; persistent low mood is worth discussing with a professional.",
    actionPlan: {
      today: "Reach out to one person for a short check-in — social contact is one of the fastest-acting mood supports available.",
      thisWeek: "Set one small, genuinely achievable goal (e.g. a 10-minute walk three times) rather than a big one you might not finish.",
      whenToSeekHelp: "If low mood, hopelessness or loss of interest persists most days for more than two weeks, or affects daily functioning, speak with a doctor or mental-health professional."
    },
    practices: {
      india: "A community yoga or breathwork circle — social practice, not just solo exercise, is central to the Ayurvedic wellness model.",
      mexico: "A group temazcal ceremony, which is traditionally a communal rather than solitary practice.",
      japan: "Reflecting on your Ikigai ('reason for being') alongside a short guided nature walk.",
      costarica: "A Pura Vida-style social gathering (plan sano) — strong daily social connection is a core Blue Zone longevity factor."
    }
  },
  {
    id: "digestion",
    label: "Digestive discomfort",
    keywords: ["digestion", "digestive", "bloating", "bloated", "stomach ache", "indigestion", "gut"],
    generalAdvice: "Mindful eating pace and gentle post-meal movement are common non-clinical supports for occasional digestive discomfort.",
    actionPlan: {
      today: "Slow down your next meal — put utensils down between bites and aim for at least 15–20 minutes.",
      thisWeek: "Take a short, easy walk after your largest meal of the day instead of sitting immediately.",
      whenToSeekHelp: "If discomfort is severe, persistent beyond two weeks, or comes with unexplained weight loss or blood, see a doctor rather than continuing to self-manage."
    },
    practices: {
      india: "Ayurvedic dosha-based meal timing and a short post-meal walk (Vajrasana pose is traditionally used after eating).",
      mexico: "Herbal-infusion remedies from curanderismo tradition, taken alongside a calm, unhurried mealtime.",
      japan: "A slow post-meal walk — 'hara hachi bu' (eating until 80% full) is a related longevity habit from the region.",
      costarica: "A plant-forward, unhurried Nicoya-style meal pattern, a documented Blue Zone dietary habit."
    }
  }
];

/* ---------- Community Hub: self-guided Cultural Practice Library ----------
   Rooted has no existing partnership with any outside organization. This
   in-house library — written and researched by the Rooted team, not run by
   a partner — packages the practices already used by the SQ prototype and
   Wellness Advisor into a browsable per-country collection. See
   buildPracticeLibrary() in js/app.js, which derives it from
   CULTURAL_PRACTICES and HEALTH_CONCERNS below rather than duplicating data. */

/* Six-month illustrative pilot metrics used on the Dashboard tab. */
const MONTHLY_LABELS = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];

const CO2_SAVED_BY_COUNTRY = {
  india: [40, 65, 90, 130, 175, 210],
  mexico: [20, 38, 60, 85, 110, 140],
  japan: [15, 24, 34, 45, 58, 70],
  costarica: [10, 16, 24, 33, 42, 52]
};

const MARKET_OPPORTUNITY_INDEX = {
  india: 82,
  mexico: 71,
  japan: 64,
  costarica: 58
};

const STAT_TILES = [
  { label: "Pilot cities (24-month plan)", value: "5" },
  { label: "Est. CO₂ saved (6-month pilot, all countries)", compute: "co2PilotTotal" },
  { label: "Cultural practices catalogued in-house", compute: "practiceLibraryCount" },
  { label: "Avg. community SQ score", compute: "communityAvgSq" }
];

const TEAM_ROLES = [
  { role: "Product Lead", scope: "Overall product direction and presentation" },
  { role: "Sustainability Lead", scope: "SQ formula design & sustainability impact metrics" },
  { role: "Wellness Content Lead", scope: "Cultural Practice Library & Wellness Advisor knowledge base" },
  { role: "Prototype / Tech Lead", scope: "This web app — build & backend setup" },
  { role: "Community & Partnerships Lead", scope: "Community Connect & future country-by-country rollout" }
];

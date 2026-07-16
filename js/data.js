/* Rooted — data layer.
   Country reference data, the SQ (Sustainability Quotient) scoring model, and the
   Wellness Advisor's knowledge base — the last of these also serves as the
   rule-based fallback the Wellness Advisor uses if the backend (real LLM) is
   unreachable, asleep, or over quota. */

/* Backend that proxies Gemini for the Wellness Advisor — see /backend. Never
   called with an API key in this file; the key lives only in the backend's
   environment variables. */
const BACKEND_URL = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "http://localhost:3001"
  : "https://pitchiq-backend.onrender.com";

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
  "suicidal", "suicide", "kill myself", "want to die", "end my life", "end it all",
  "self harm", "self-harm", "hurt myself", "harm myself",
  "chest pain", "can't breathe", "cannot breathe", "not breathing", "trouble breathing",
  "severe bleeding", "coughing blood", "vomiting blood", "overdose", "poisoning",
  "collapse", "collapsed", "unconscious", "unresponsive", "passed out", "blacked out",
  "seizure", "stroke", "face drooping", "slurred speech", "numbness on one side",
  "can't move my", "cannot move my", "heart attack", "anaphylaxis", "severe allergic reaction",
  "choking", "severe burn", "compound fracture", "broken bone"
];

/* Purely lexical intensity signal — counts how many of these modifier words
   appear alongside a matched concern, to shade the tone of the response
   (Mild / Moderate / Elevated) without ever diagnosing anything. See
   detectIntensity() in js/app.js. */
const HEALTH_INTENSITY_MODIFIERS = [
  "really", "very", "extremely", "so", "always", "constantly", "every night",
  "every day", "all the time", "chronic", "severe", "severely", "can't", "cant",
  "unable to", "nonstop", "non-stop", "terrible", "awful", "worst", "months",
  "weeks now", "keeps happening", "desperate", "unbearable", "every single day",
  "can't cope", "cant cope", "breaking point", "at my limit", "for months",
  "for weeks", "years now", "getting worse", "no relief", "nothing helps", "nothing works"
];

/* Pairwise notes shown when two concerns are both matched in the same
   description — gives the advisor a synthesized read instead of just
   listing concerns side by side. */
const HEALTH_CONCERN_COMBOS = [
  { ids: ["stress-anxiety", "sleep"], note: "Stress and poor sleep commonly reinforce each other — an activated nervous system makes it harder to fall asleep, and short sleep lowers your stress threshold the next day. Addressing your evening wind-down routine tends to help both at once." },
  { ids: ["sleep", "low-energy"], note: "Fatigue that follows poor sleep usually resolves as sleep quality improves — treat the sleep routine as the primary lever and expect energy to follow within a few nights." },
  { ids: ["low-energy", "low-mood"], note: "Low energy and low mood often travel together, and light outdoor movement is one of the few actions well-evidenced to lift both at the same time." },
  { ids: ["back-joint-pain", "stress-anxiety"], note: "Muscular tension is a common physical side-effect of stress — gentle mobility work paired with a breathwork practice often eases both the tightness and the underlying tension." },
  { ids: ["stress-anxiety", "digestion"], note: "The gut and the nervous system are closely linked, so stress-related digestive discomfort is common — slowing down at mealtimes alongside your stress practice can help both." },
  { ids: ["headache", "stress-anxiety"], note: "Tension headaches are one of the most common physical expressions of stress — a breathwork practice that lowers stress often reduces headache frequency too." },
  { ids: ["headache", "eye-screen-strain"], note: "Extended close-up screen focus is a common shared trigger for both eye strain and tension headaches — the 20-20-20 break addresses both at once." },
  { ids: ["headache", "hydration"], note: "Mild dehydration is one of the most common and most overlooked headache triggers — check water intake before anything else." },
  { ids: ["neck-shoulder-tension", "stress-anxiety"], note: "Stress tends to settle physically in the neck and shoulders first — pairing mobility work with a breathwork practice usually eases both faster than either alone." },
  { ids: ["immune-cold", "low-energy"], note: "Fatigue is one of the most common companions of a cold or flu — treat rest as part of the recovery plan, not a delay to it." },
  { ids: ["irritability-anger", "sleep"], note: "Poor sleep lowers the threshold for irritability the next day — a stable wind-down routine tends to ease both together." },
  { ids: ["irritability-anger", "stress-anxiety"], note: "Unmanaged stress often surfaces as short temper before it's consciously felt as stress — the same breathwork reset helps with both." },
  { ids: ["appetite-changes", "stress-anxiety"], note: "Stress commonly disrupts appetite in either direction — a regular, unhurried mealtime rhythm helps stabilize it alongside your stress practice." },
  { ids: ["grief-loss", "low-mood"], note: "Grief and low mood frequently overlap, and both respond to the same gentle approach — staying lightly connected to others rather than withdrawing." },
  { ids: ["grief-loss", "sleep"], note: "Grief commonly disrupts sleep — a consistent, low-pressure evening routine can help even while the grieving process itself continues." },
  { ids: ["social-anxiety", "stress-anxiety"], note: "Social anxiety is a specific flavor of the same stress response — the same breathing reset used for general stress applies well right before a social situation." },
  { ids: ["motivation-to-exercise", "low-energy"], note: "Low energy often gets mistaken for low motivation — a short burst of light movement frequently increases energy rather than requiring it first." },
  { ids: ["motivation-to-exercise", "low-mood"], note: "Loss of motivation and low mood reinforce each other — a very small, achievable movement goal tends to move both at once." },
  { ids: ["hydration", "low-energy"], note: "Mild dehydration commonly presents as fatigue before thirst is even noticed — check water intake as a first, easy lever." },
  { ids: ["muscle-cramps", "hydration"], note: "Cramping during or after exercise is frequently linked to fluid and electrolyte loss — rehydrating is usually the fastest fix." },
  { ids: ["jet-lag-travel-fatigue", "sleep"], note: "Jet lag is fundamentally a sleep-timing problem — anchoring to the new local light-dark cycle resolves both together faster than either fix alone." },
  { ids: ["menstrual-discomfort", "irritability-anger"], note: "Hormonal shifts around menstruation commonly affect mood alongside physical discomfort — treating both with rest and warmth together tends to help." }
];

const HEALTH_CONCERNS = [
  {
    id: "stress-anxiety",
    label: "Stress, anxiety or feeling overwhelmed",
    keywords: ["stress", "stressed", "stressful", "anxious", "anxiety", "overwhelm", "overwhelmed", "panic", "panicking", "panic attack", "tense", "worry", "worried", "worrying", "nervous", "burnout", "burnt out", "on edge", "can't relax", "cant relax", "racing thoughts", "keyed up", "under pressure", "too much on my plate"],
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
    keywords: ["sleep", "insomnia", "can't sleep", "cant sleep", "tired", "restless", "wake up", "waking up", "sleepless", "nightmares", "waking up at night", "middle of the night", "groggy", "poor sleep", "bad sleep", "trouble falling asleep", "tossing and turning"],
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
    keywords: ["fatigue", "low energy", "exhausted", "exhaustion", "no energy", "sluggish", "lethargic", "tired all the time", "drained", "running on empty", "worn out", "burnt out", "always tired", "can't stay awake", "cant stay awake"],
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
    keywords: ["back pain", "joint pain", "muscle pain", "sore muscles", "muscles are sore", "feeling sore", "soreness", "stiff", "stiffness", "body ache", "body aches", "muscle ache", "muscles ache", "joint ache", "aching muscles", "aching joints", "arthritis", "tight muscles", "knots", "muscle tightness", "tender", "pulled muscle", "strained"],
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
    keywords: ["sad", "low mood", "depress", "depressed", "depressing", "unmotivated", "no motivation", "down", "hopeless", "lonely", "isolated", "empty", "numb", "don't enjoy things anymore", "dont enjoy things anymore", "nothing feels fun", "flat", "withdrawn"],
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
    keywords: ["digestion", "digestive", "bloating", "bloated", "stomach ache", "stomach pain", "indigestion", "gut", "nausea", "nauseous", "gassy", "constipated", "constipation", "diarrhea", "upset stomach"],
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
  },
  {
    id: "headache",
    label: "Headaches or migraines",
    keywords: ["headache", "headaches", "migraine", "migraines", "head hurts", "head pain", "throbbing head", "pounding head", "tension headache"],
    generalAdvice: "Most everyday headaches are linked to dehydration, eye strain, tension or irregular sleep — addressing the trigger usually resolves it faster than treating the pain alone.",
    actionPlan: {
      today: "Drink a full glass of water, step away from screens for 10 minutes, and gently massage the base of the skull and temples.",
      thisWeek: "Track when headaches occur (time of day, screen use, meals, sleep) for a few days — a pattern usually points straight at the trigger.",
      whenToSeekHelp: "See a doctor if headaches are sudden and severe ('worst of your life'), come with visual changes, fever or neck stiffness, or if migraines are frequent enough to disrupt daily life."
    },
    practices: {
      india: "A cooling Ayurvedic head massage with sesame or coconut oil (Shiroabhyanga), traditionally used to ease tension headaches.",
      mexico: "A calming herbal tea (manzanilla/chamomile or peppermint) from curanderismo tradition, paired with rest in a dark, quiet room.",
      japan: "A short shinrin-yoku walk away from screens and artificial light — outdoor light exposure is linked to fewer tension headaches.",
      costarica: "A Pura Vida-style slow-down: step outside, hydrate, and take an unhurried break rather than pushing through."
    }
  },
  {
    id: "neck-shoulder-tension",
    label: "Neck and shoulder tension",
    keywords: ["neck pain", "shoulder tension", "tight shoulders", "stiff neck", "tech neck", "hunched shoulders", "neck tension", "shoulders are tight"],
    generalAdvice: "Prolonged forward-head posture (desks, phones) overloads the neck and upper-trap muscles — regular posture breaks and mobility work relieve it faster than a single stretch.",
    actionPlan: {
      today: "Do 5 slow neck rolls each direction and a doorway chest-stretch for 30 seconds to counter a hunched posture.",
      thisWeek: "Set an hourly reminder to check posture and roll the shoulders back — little and often beats one long stretching session.",
      whenToSeekHelp: "See a doctor or physiotherapist if there's numbness or tingling down an arm, or the pain hasn't improved after two weeks of regular mobility work."
    },
    practices: {
      india: "Restorative yoga shoulder-openers combined with warm-oil Abhyanga massage across the neck and shoulders.",
      mexico: "A temazcal-style steam session for muscular release, or a warm compress inspired by curanderismo herbal remedies.",
      japan: "A slow nature walk with deliberate shoulder drops on each exhale — pairing shinrin-yoku with simple posture resets.",
      costarica: "Gentle stretching outdoors in the sun, a relaxed Pura Vida habit that pairs movement with fresh air rather than a rushed desk-stretch."
    }
  },
  {
    id: "immune-cold",
    label: "Cold, flu or feeling run down",
    keywords: ["cold", "flu", "sick", "congested", "sore throat", "runny nose", "stuffy nose", "cough", "coughing", "feel run down", "under the weather", "coming down with something"],
    generalAdvice: "Rest, fluids and warmth are the best-evidenced supports for a common cold or flu while the immune system does the actual work — most symptoms resolve within a week to ten days.",
    actionPlan: {
      today: "Prioritize fluids and warm broths, and rest instead of pushing through a workout — training through illness typically extends recovery time.",
      thisWeek: "Ease back into activity only once energy and breathing feel normal, starting light and building back up over several days.",
      whenToSeekHelp: "See a doctor if symptoms last more than 10 days, a fever is high or persistent, or breathing becomes difficult — those go beyond a routine cold."
    },
    practices: {
      india: "A warm turmeric-milk (haldi doodh) or ginger-tulsi tea, a traditional Ayurvedic remedy for congestion and immunity.",
      mexico: "A traditional curanderismo herbal remedy — manzanilla, eucalyptus steam inhalation, or a warm limón-and-honey tea.",
      japan: "Rest paired with warm, simple foods (miso soup, rice porridge) and an early night rather than pushing through the day.",
      costarica: "A Nicoya-style ginger and citrus infusion alongside extra rest — treating recovery as seriously as the illness itself."
    }
  },
  {
    id: "skin-irritation",
    label: "Skin irritation, chafing or sunburn",
    keywords: ["chafing", "skin irritation", "rash", "blisters", "sunburn", "sunburnt", "skin is raw", "chafed"],
    generalAdvice: "Most exercise-related skin irritation comes down to friction, moisture or sun exposure — addressing the cause (fit, fabric, sunscreen) prevents repeat flare-ups better than treating each one after the fact.",
    actionPlan: {
      today: "Clean and dry the affected area, apply a fragrance-free moisturizer or aloe for sunburn, and avoid re-irritating it with the same gear today.",
      thisWeek: "Identify the cause — seam, fabric, sunscreen gap — and adjust gear or reapply sunscreen every two hours during outdoor sessions going forward.",
      whenToSeekHelp: "See a doctor if a rash spreads, blisters look infected (increasing redness, warmth, pus), or a sunburn blisters over a large area."
    },
    practices: {
      india: "A cooling aloe vera or sandalwood paste, traditional Ayurvedic remedies for skin irritation and sunburn.",
      mexico: "A soothing aloe-and-herbal compress drawn from curanderismo skin-care tradition.",
      japan: "A cool compress followed by gentle care — avoiding further sun and friction rather than masking it with fragranced products.",
      costarica: "Aloe straight from the plant — common in Nicoya households — plus staying out of direct sun until it settles."
    }
  },
  {
    id: "focus-concentration",
    label: "Trouble focusing or concentrating",
    keywords: ["can't focus", "cant focus", "trouble concentrating", "distracted", "brain fog", "scattered", "can't concentrate", "cant concentrate", "hard to focus", "mind keeps wandering"],
    generalAdvice: "Focus is a finite resource that depletes with poor sleep, long unbroken work stretches and constant notifications — short breaks and single-tasking restore it faster than pushing through.",
    actionPlan: {
      today: "Work in a focused 25-minute block with phone notifications off, then take a genuine 5-minute break away from the screen.",
      thisWeek: "Protect one distraction-free block each day for your highest-priority task, ideally earlier when focus is naturally higher.",
      whenToSeekHelp: "If brain fog or concentration problems are new, persistent, and not explained by sleep or stress, mention it to a doctor — it can occasionally flag something worth checking."
    },
    practices: {
      india: "A short pranayama breathing session before focused work — used traditionally in yogic practice to sharpen mental clarity.",
      mexico: "A brief reflective pause inspired by curanderismo tradition — stepping outside before returning to the task with a clearer head.",
      japan: "A short shinrin-yoku break — even a few minutes among trees is linked in Japanese research to measurable attention restoration.",
      costarica: "A Pura Vida-style pause — stepping outside, breathing, and returning to the task at an unhurried pace rather than forcing focus."
    }
  },
  {
    id: "eye-screen-strain",
    label: "Eye strain or screen fatigue",
    keywords: ["eye strain", "eyes hurt", "screen fatigue", "tired eyes", "dry eyes", "eyes are sore", "blurry vision after screen", "staring at a screen too long"],
    generalAdvice: "Extended close-up screen focus reduces blink rate and tires the eye muscles — regular distance-focus breaks are the most reliable fix.",
    actionPlan: {
      today: "Follow the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds.",
      thisWeek: "Adjust screen brightness to match the room and increase text size rather than leaning in closer to compensate.",
      whenToSeekHelp: "See an optometrist if strain persists despite regular breaks, or if vision changes, as it may need a prescription check rather than more rest."
    },
    practices: {
      india: "A cooling rose-water eye compress, a traditional Ayurvedic remedy for tired eyes.",
      mexico: "A cool cucumber or chamomile compress from curanderismo home-remedy tradition.",
      japan: "A short walk outdoors to reset focus on distant, natural scenery — a simple pairing with shinrin-yoku principles.",
      costarica: "Time outdoors looking at the horizon or ocean — a natural, unhurried break from close-up focus."
    }
  },
  {
    id: "weather-seasonal-mood",
    label: "Seasonal low mood (less daylight / winter months)",
    keywords: ["seasonal", "winter blues", "less daylight", "dark early", "seasonal affective", "harder in winter", "mood drops in winter", "shorter days"],
    generalAdvice: "Reduced daylight exposure in shorter days is linked to lower mood and energy for many people — deliberately seeking daylight, especially earlier in the day, is a well-evidenced counter.",
    actionPlan: {
      today: "Get outside during the brightest part of the day, even for 10-15 minutes, ideally within a few hours of waking.",
      thisWeek: "Build a standing outdoor block into each day rather than relying on it happening by chance as daylight hours shrink.",
      whenToSeekHelp: "If seasonal low mood is significant, recurring every year, and affects daily functioning, a doctor can discuss options including light therapy."
    },
    practices: {
      india: "A midday outdoor pranayama session timed to catch the strongest available daylight.",
      mexico: "An outdoor herbal-tea break in the sun, treating daylight exposure as part of the wellness ritual itself.",
      japan: "A daytime shinrin-yoku walk — Japanese seasonal-affective research specifically favors daylight forest exposure over indoor light alone.",
      costarica: "Leaning into Pura Vida's outdoor-first lifestyle — deliberately structuring the day around the available daylight."
    }
  },
  {
    id: "social-anxiety",
    label: "Social anxiety or nervousness around others",
    keywords: ["social anxiety", "nervous around people", "public speaking", "anxious in groups", "shy", "awkward in social situations", "nervous meeting new people", "anxious before a social event"],
    generalAdvice: "Social anxiety responds well to gradual exposure and preparation — small, repeated low-stakes interactions build confidence faster than avoidance, which tends to reinforce the anxiety over time.",
    actionPlan: {
      today: "Before the situation, do a short breathing exercise (4-7-8) and prepare one or two simple opening lines rather than trying to plan the whole conversation.",
      thisWeek: "Choose one small, low-stakes social interaction to deliberately practice (a brief chat with a neighbor, a question in a group setting) rather than avoiding it.",
      whenToSeekHelp: "If social anxiety is limiting work, school or relationships, or causes panic-level physical symptoms, a therapist experienced in anxiety (e.g. CBT) can help substantially."
    },
    practices: {
      india: "A community yoga class — a low-pressure, shared-practice setting traditionally used to build comfort around others.",
      mexico: "A group temazcal ceremony — traditionally communal, and a gentle way to practice being present with others.",
      japan: "Reflecting on Ikigai in a small shared group setting — a structured, low-pressure way to practice social connection.",
      costarica: "A relaxed Pura Vida-style gathering (plan sano) — informal, low-pressure socializing is culturally the norm rather than the exception."
    }
  },
  {
    id: "grief-loss",
    label: "Grief or loss",
    keywords: ["grief", "grieving", "someone died", "lost my", "mourning", "loss of a loved one", "passed away", "coping with a death"],
    generalAdvice: "Grief is a normal, non-linear process rather than something to be fixed quickly — staying connected to others and allowing rest, rather than pushing through, tends to support healthier processing.",
    actionPlan: {
      today: "Allow yourself to rest without guilt today — grief is physically and mentally taxing, and there's no schedule it's supposed to follow.",
      thisWeek: "Stay lightly connected to at least one person or routine this week, even briefly — isolation tends to make grief heavier, not lighter.",
      whenToSeekHelp: "If grief includes thoughts of self-harm, complete inability to function after several weeks, or feels 'stuck', a grief counselor or therapist can help — this is common and support is normal to seek."
    },
    practices: {
      india: "A quiet breathwork or meditation practice, and leaning on the community rituals around loss that are central to Indian tradition.",
      mexico: "Honoring the person through remembrance — Mexican tradition (e.g. Día de los Muertos customs) treats remembering, not just moving on, as part of healing.",
      japan: "A quiet, unhurried shinrin-yoku walk — time in nature is a traditionally accepted space for reflection in Japanese culture.",
      costarica: "Leaning on the strong Pura Vida community-support norm — sharing the load with neighbors and family rather than processing it alone."
    }
  },
  {
    id: "irritability-anger",
    label: "Irritability or short temper",
    keywords: ["irritable", "irritability", "angry", "short temper", "snapping at people", "frustrated easily", "on edge", "quick to anger", "losing my temper"],
    generalAdvice: "Irritability is often a downstream symptom of poor sleep, hunger, or unmanaged stress rather than a standalone issue — addressing the underlying driver usually resolves it faster than managing the anger itself.",
    actionPlan: {
      today: "Before reacting, pause for a slow breath and ask whether hunger, tiredness or stress is amplifying the reaction right now.",
      thisWeek: "Track what precedes irritable moments for a few days (sleep, meals, workload) — a clear pattern usually points to the actual fix.",
      whenToSeekHelp: "If irritability is frequent, affecting relationships, or feels disproportionate to the trigger, a doctor or counselor can help identify and address the underlying cause."
    },
    practices: {
      india: "A cooling pranayama breath practice (Sheetali) specifically used in yogic tradition to calm heightened irritability.",
      mexico: "A grounding temazcal-style breathing circle to release built-up tension before it surfaces as irritability.",
      japan: "A short shinrin-yoku walk to lower physiological arousal before returning to whatever triggered the frustration.",
      costarica: "A Pura Vida pause — deliberately stepping back from the moment rather than reacting immediately."
    }
  },
  {
    id: "motivation-to-exercise",
    label: "Struggling to stay motivated to exercise",
    keywords: ["no motivation to exercise", "can't get motivated", "cant get motivated", "skipping workouts", "keep skipping the gym", "lazy", "procrastinating workout", "don't feel like working out", "dont feel like working out"],
    generalAdvice: "Motivation reliably follows action more often than it precedes it — lowering the barrier to starting (a shorter session, an easier version) tends to work better than waiting to 'feel like it'.",
    actionPlan: {
      today: "Commit to just 5 minutes of movement with permission to stop after — most sessions continue naturally once started.",
      thisWeek: "Pair the workout with something you already do consistently (after coffee, after work) so it attaches to an existing habit rather than needing fresh motivation each time.",
      whenToSeekHelp: "If a total loss of motivation extends beyond exercise into most areas of life, it may be linked to low mood — worth mentioning to a doctor rather than treating as a willpower problem."
    },
    practices: {
      india: "A short, traditional Surya Namaskar sequence — low barrier to entry, and rooted in daily ritual rather than treated as a big commitment.",
      mexico: "Pairing movement with a social plan, like a group walk before a temazcal session — accountability through community.",
      japan: "Framing movement around Ikigai — connecting the workout to a personal 'reason for being' rather than an isolated chore.",
      costarica: "Leaning on the Pura Vida norm of movement as a natural, social part of the day rather than a separate obligation."
    }
  },
  {
    id: "hydration",
    label: "Not drinking enough water / dehydration",
    keywords: ["dehydrated", "dehydration", "not drinking enough water", "dry mouth", "thirsty all the time", "forget to drink water", "barely drink water"],
    generalAdvice: "Mild, everyday dehydration is a common and easily-fixed contributor to headaches, fatigue and poor focus — building in regular water intake usually resolves it within a day or two.",
    actionPlan: {
      today: "Drink a glass of water now, and keep a filled bottle visible as a reminder for the rest of the day.",
      thisWeek: "Anchor water intake to existing habits — a glass with each meal and one before each workout — rather than relying on remembering to drink.",
      whenToSeekHelp: "If thirst is extreme and constant, or comes with frequent urination or unexplained weight change, see a doctor — those can flag something beyond simple habit."
    },
    practices: {
      india: "Warm water with lemon first thing in the morning — a traditional Ayurvedic habit for hydration and digestion.",
      mexico: "Aguas frescas (fruit-infused water) — a traditional, flavorful way to increase intake without relying on sugary drinks.",
      japan: "Herbal or green tea alongside water through the day — a steady, low-caffeine hydration habit.",
      costarica: "Fresh coconut water — a natural, electrolyte-rich Costa Rican staple, especially after outdoor activity."
    }
  },
  {
    id: "muscle-cramps",
    label: "Muscle cramps or spasms",
    keywords: ["cramp", "cramps", "cramping", "charley horse", "muscle spasm", "calf cramp", "leg cramp"],
    generalAdvice: "Exercise-related cramps are most often linked to dehydration, electrolyte loss or fatigue in the muscle rather than a serious issue — gentle stretching and rehydrating typically resolve them quickly.",
    actionPlan: {
      today: "Gently stretch and massage the cramping muscle, and rehydrate with water or an electrolyte drink rather than pushing through more activity immediately.",
      thisWeek: "If cramps happen during exercise regularly, check hydration and electrolyte intake in the hours before training, not just during it.",
      whenToSeekHelp: "See a doctor if cramps are frequent outside of exercise, severe, or come with swelling or discoloration — that can point beyond a routine muscular cause."
    },
    practices: {
      india: "A warm sesame-oil massage (Abhyanga) on the affected muscle, traditionally used in Ayurveda for muscular relief.",
      mexico: "A warm temazcal-style compress to ease muscle tension and improve circulation.",
      japan: "Gentle mobility on soft, natural terrain (as in shinrin-yoku walking) rather than resuming hard training immediately.",
      costarica: "Fresh coconut water for natural electrolyte replacement, alongside light stretching."
    }
  },
  {
    id: "jet-lag-travel-fatigue",
    label: "Jet lag or travel fatigue",
    keywords: ["jet lag", "jetlag", "time zone", "travel fatigue", "traveling tired", "flight tired", "adjusting to a new time zone"],
    generalAdvice: "Jet lag comes from a mismatched internal clock — anchoring to the new local light-dark cycle as quickly as possible resets it faster than fighting through on the old schedule.",
    actionPlan: {
      today: "Get outdoor daylight exposure at the new local time, and avoid a long nap that would delay adjusting to the new schedule.",
      thisWeek: "Keep meals and bedtime aligned to local time from day one, even if appetite and sleepiness don't match right away — the body follows the routine.",
      whenToSeekHelp: "If travel fatigue or disrupted sleep persists well beyond a few days after returning to a normal schedule, a doctor can help rule out other causes."
    },
    practices: {
      india: "A grounding pranayama breathing practice on arrival to settle the nervous system after travel.",
      mexico: "A calming herbal tea ritual at the new local bedtime to signal the shift to the body.",
      japan: "A daylight shinrin-yoku walk on arrival — outdoor light exposure is one of the fastest resets for circadian rhythm.",
      costarica: "A Pura Vida-style unhurried first day — resisting the urge to pack the schedule while the body catches up."
    }
  },
  {
    id: "appetite-changes",
    label: "Appetite changes or stress eating",
    keywords: ["not hungry", "loss of appetite", "overeating", "stress eating", "emotional eating", "appetite changes", "eating too much when stressed", "no appetite"],
    generalAdvice: "Both suppressed and increased appetite are common, non-clinical stress responses — regular, unhurried meals help stabilize appetite signals that stress tends to scramble.",
    actionPlan: {
      today: "Eat at a regular mealtime even without much appetite, or pause before a stress-driven snack to ask if it's hunger or something else.",
      thisWeek: "Rebuild a consistent meal rhythm (roughly the same times each day) — irregular eating tends to amplify both under- and over-eating patterns.",
      whenToSeekHelp: "If appetite changes are significant, persistent beyond a few weeks, or come with major unintended weight change, speak with a doctor."
    },
    practices: {
      india: "Ayurvedic dosha-based meal timing, which treats regular, mindful mealtimes as central to digestive and emotional balance.",
      mexico: "A calm, unhurried mealtime ritual from curanderismo tradition rather than eating on the move.",
      japan: "'Hara hachi bu' — eating until about 80% full — a regional habit that supports steadier appetite regulation.",
      costarica: "A plant-forward, social Nicoya-style mealtime — eating slowly and with company rather than alone and rushed."
    }
  },
  {
    id: "menstrual-discomfort",
    label: "Menstrual cramps or discomfort",
    keywords: ["period pain", "period cramps", "menstrual cramps", "menstrual pain", "pms", "period discomfort", "cramping during my period"],
    generalAdvice: "Heat, gentle movement and rest are well-evidenced, non-clinical supports for common menstrual discomfort — severe or worsening pain is worth having checked rather than assumed routine.",
    actionPlan: {
      today: "Apply a warm compress to the lower abdomen or lower back, and favor gentle movement (a short walk or light stretching) over intense exercise if it feels uncomfortable.",
      thisWeek: "Track symptoms across the cycle if this is new or worsening — a clear pattern is useful information for a doctor if it's ever needed.",
      whenToSeekHelp: "See a doctor if pain is severe enough to disrupt daily activities, worsens over time, or comes with unusually heavy bleeding — that goes beyond routine discomfort."
    },
    practices: {
      india: "A warm castor-oil abdominal massage and restorative yoga poses, traditionally used in Ayurveda during menstruation.",
      mexico: "A warm herbal tea (manzanilla or canela) alongside rest, drawn from curanderismo remedies for menstrual discomfort.",
      japan: "A warm bath and gentle stretching rather than pushing through a full workout on higher-discomfort days.",
      costarica: "Rest paired with a warm Nicoya-style herbal infusion and permission to slow the day down."
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
  { role: "Product Lead", scope: "Overall product direction and presentation", name: "Nishk Jain" },
  { role: "Sustainability Lead", scope: "SQ formula design & sustainability impact metrics", name: "Aarav Kapoor" },
  { role: "Wellness Content Lead", scope: "Cultural Practice Library & Wellness Advisor knowledge base", name: "Akul Sood" },
  { role: "Prototype / Tech Lead", scope: "This web app — build & backend setup", name: "Aarav Kapoor" },
  { role: "Community & Partnerships Lead", scope: "Community Connect & future country-by-country rollout", name: "Neiv Malhotra" },
  { role: "Finance Lead", scope: "Budgeting & financial planning", name: "Akul Sood" }
];

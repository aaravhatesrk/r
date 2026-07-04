/* Athlyze — data layer.
   Sport presets ship a default set of metrics (label, unit, and whether a
   lower value is the "better" direction) so logging a first entry is a
   couple of clicks; every sport also accepts a fully custom metric. Colors
   are the eight validated categorical slots from the shared design-system
   reference palette (blue, aqua, yellow, green, violet, red, magenta,
   orange) — one slot per sport, ordering fixed for colorblind-safe
   adjacency, never reassigned. */

const SPORTS = [
  {
    id: "running", name: "Running", icon: "\u{1F3C3}",
    color: "#2a78d6", colorDark: "#3987e5",
    metrics: [
      { id: "time5k", label: "5K time", unit: "min", lowerIsBetter: true },
      { id: "time10k", label: "10K time", unit: "min", lowerIsBetter: true },
      { id: "pace", label: "Average pace", unit: "min/km", lowerIsBetter: true },
      { id: "longestRun", label: "Longest run", unit: "km", lowerIsBetter: false }
    ]
  },
  {
    id: "swimming", name: "Swimming", icon: "\u{1F3CA}",
    color: "#1baf7a", colorDark: "#199e70",
    metrics: [
      { id: "time100mFree", label: "100m freestyle time", unit: "sec", lowerIsBetter: true },
      { id: "time50mFree", label: "50m freestyle time", unit: "sec", lowerIsBetter: true },
      { id: "sessionDistance", label: "Session distance", unit: "m", lowerIsBetter: false }
    ]
  },
  {
    id: "cycling", name: "Cycling", icon: "\u{1F6B4}",
    color: "#eda100", colorDark: "#c98500",
    metrics: [
      { id: "rideDistance", label: "Ride distance", unit: "km", lowerIsBetter: false },
      { id: "avgSpeed", label: "Average speed", unit: "km/h", lowerIsBetter: false },
      { id: "elevationGain", label: "Elevation gain", unit: "m", lowerIsBetter: false }
    ]
  },
  {
    id: "weightlifting", name: "Weightlifting", icon: "\u{1F3CB}",
    color: "#008300", colorDark: "#008300",
    metrics: [
      { id: "benchPress", label: "Bench press (1RM)", unit: "kg", lowerIsBetter: false },
      { id: "squat", label: "Squat (1RM)", unit: "kg", lowerIsBetter: false },
      { id: "deadlift", label: "Deadlift (1RM)", unit: "kg", lowerIsBetter: false }
    ]
  },
  {
    id: "basketball", name: "Basketball", icon: "\u{1F3C0}",
    color: "#4a3aa7", colorDark: "#9085e9",
    metrics: [
      { id: "pointsGame", label: "Points scored (game)", unit: "pts", lowerIsBetter: false },
      { id: "fgPct", label: "Field goal %", unit: "%", lowerIsBetter: false },
      { id: "ftStreak", label: "Free throws made in a row", unit: "makes", lowerIsBetter: false }
    ]
  },
  {
    id: "football", name: "Football / Soccer", icon: "⚽",
    color: "#e34948", colorDark: "#e66767",
    metrics: [
      { id: "goalsMatch", label: "Goals scored (match)", unit: "goals", lowerIsBetter: false },
      { id: "sprint40m", label: "40m sprint time", unit: "sec", lowerIsBetter: true }
    ]
  },
  {
    id: "tennis", name: "Tennis", icon: "\u{1F3BE}",
    color: "#e87ba4", colorDark: "#d55181",
    metrics: [
      { id: "serveSpeed", label: "Serve speed", unit: "km/h", lowerIsBetter: false },
      { id: "longestRally", label: "Longest rally", unit: "shots", lowerIsBetter: false }
    ]
  },
  {
    id: "other", name: "Other / custom sport", icon: "\u{1F3AF}",
    color: "#eb6834", colorDark: "#d95926",
    metrics: []
  }
];

const sportById = Object.fromEntries(SPORTS.map(s => [s.id, s]));

const STORAGE_KEY = "athlyze-entries";

/* Six-month illustrative demo data so the dashboard isn't empty on first
   load — clearly marked as sample rows and easy to clear from History. */
function demoSeedEntries() {
  const today = new Date();
  const daysAgo = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };
  return [
    { id: "seed-1", sportId: "running", sportName: "Running", metricLabel: "5K time", unit: "min", lowerIsBetter: true, value: 28.5, date: daysAgo(84), notes: "Sample entry — safe to delete" },
    { id: "seed-2", sportId: "running", sportName: "Running", metricLabel: "5K time", unit: "min", lowerIsBetter: true, value: 27.1, date: daysAgo(56), notes: "Sample entry — safe to delete" },
    { id: "seed-3", sportId: "running", sportName: "Running", metricLabel: "5K time", unit: "min", lowerIsBetter: true, value: 25.9, date: daysAgo(28), notes: "Sample entry — safe to delete" },
    { id: "seed-4", sportId: "running", sportName: "Running", metricLabel: "5K time", unit: "min", lowerIsBetter: true, value: 24.8, date: daysAgo(3), notes: "Sample entry — safe to delete" },
    { id: "seed-5", sportId: "weightlifting", sportName: "Weightlifting", metricLabel: "Bench press (1RM)", unit: "kg", lowerIsBetter: false, value: 55, date: daysAgo(70), notes: "Sample entry — safe to delete" },
    { id: "seed-6", sportId: "weightlifting", sportName: "Weightlifting", metricLabel: "Bench press (1RM)", unit: "kg", lowerIsBetter: false, value: 62.5, date: daysAgo(35), notes: "Sample entry — safe to delete" },
    { id: "seed-7", sportId: "weightlifting", sportName: "Weightlifting", metricLabel: "Bench press (1RM)", unit: "kg", lowerIsBetter: false, value: 67.5, date: daysAgo(7), notes: "Sample entry — safe to delete" }
  ];
}

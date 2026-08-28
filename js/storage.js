const KEY = "nines-sudoku-v1";

export const defaultSettings = {
  autoCheck: true,
  highlightPeers: true,
  highlightSame: true,
  autoRemoveNotes: true,
  mistakeLimit: true,
  darkMode: false,
  showTimer: true,
};

function emptyDiffStats() {
  return { started: 0, won: 0, bestTime: null, totalWinTime: 0, perfect: 0 };
}

export function defaultStats() {
  return {
    easy: emptyDiffStats(),
    medium: emptyDiffStats(),
    hard: emptyDiffStats(),
    expert: emptyDiffStats(),
    master: emptyDiffStats(),
    extreme: emptyDiffStats(),
    streak: 0,
    bestStreak: 0,
    lastDailyWin: null,
    dailyWins: {},
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { settings: { ...defaultSettings }, stats: defaultStats(), game: null };
    const parsed = JSON.parse(raw);
    return {
      settings: { ...defaultSettings, ...(parsed.settings || {}) },
      stats: { ...defaultStats(), ...(parsed.stats || {}) },
      game: parsed.game || null,
    };
  } catch {
    return { settings: { ...defaultSettings }, stats: defaultStats(), game: null };
  }
}

export function saveState(state) {
  const payload = {
    settings: state.settings,
    stats: state.stats,
    game: state.game,
  };
  localStorage.setItem(KEY, JSON.stringify(payload));
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}:${String(m % 60).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  }
  return `${m}:${String(r).padStart(2, "0")}`;
}

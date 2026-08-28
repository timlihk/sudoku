import {
  DIFFICULTIES,
  cloneGrid,
  conflictCells,
  dateKey,
  findHint,
  flatten,
  generateDaily,
  generatePuzzle,
  isSolved,
  unflatten,
  candidates,
} from "./engine.js";
import {
  defaultSettings,
  formatTime,
  loadState,
  saveState,
} from "./storage.js";

const stored = loadState();

const state = {
  settings: stored.settings,
  stats: stored.stats,
  difficulty: "easy",
  daily: false,
  dateKey: null,
  puzzle: null,
  solution: null,
  grid: null,
  notes: new Int16Array(81),
  selected: -1,
  selectedDigit: 0,
  notesMode: false,
  digitLock: false,
  mistakes: 0,
  hints: 0,
  elapsed: 0,
  paused: false,
  over: false,
  won: false,
  history: [],
  redo: [],
  secondChanceUsed: false,
  hintCell: -1,
};

let clock = null;
let lastTick = 0;
let toastTimer = null;

const els = {
  board: document.getElementById("board"),
  wrap: document.getElementById("board-wrap"),
  pad: document.getElementById("pad"),
  diffName: document.getElementById("diff-name"),
  mistakes: document.getElementById("mistakes"),
  timer: document.getElementById("timer"),
  toast: document.getElementById("hint-toast"),
  dailyDate: document.getElementById("daily-date"),
  statWon: document.getElementById("stat-won"),
  statStreak: document.getElementById("stat-streak"),
  dirtyWarn: document.getElementById("dirty-warn"),
  diffGrid: document.getElementById("diff-grid"),
  winTime: document.getElementById("win-time"),
  winCopy: document.getElementById("win-copy"),
  statsTable: document.getElementById("stats-table"),
  statsLede: document.getElementById("stats-lede"),
  settingsList: document.getElementById("settings-list"),
};

function pos(i) {
  return { r: (i / 9) | 0, c: i % 9 };
}

function idx(r, c) {
  return r * 9 + c;
}

function isGiven(i) {
  const { r, c } = pos(i);
  return state.puzzle[r][c] !== 0;
}

function snapshot() {
  return {
    grid: flatten(state.grid),
    notes: Array.from(state.notes),
    mistakes: state.mistakes,
    selected: state.selected,
  };
}

function restore(snap) {
  state.grid = unflatten(snap.grid);
  state.notes = Int16Array.from(snap.notes);
  state.mistakes = snap.mistakes;
  state.selected = snap.selected;
}

function persist() {
  saveState({
    settings: state.settings,
    stats: state.stats,
    game: state.won || !state.grid
      ? null
      : {
          difficulty: state.difficulty,
          daily: state.daily,
          dateKey: state.dateKey,
          puzzle: flatten(state.puzzle),
          solution: flatten(state.solution),
          grid: flatten(state.grid),
          notes: Array.from(state.notes),
          mistakes: state.mistakes,
          hints: state.hints,
          elapsed: state.elapsed,
          over: state.over,
          won: state.won,
          secondChanceUsed: state.secondChanceUsed,
          notesMode: state.notesMode,
        },
  });
}

function applyTheme() {
  document.documentElement.dataset.theme = state.settings.darkMode ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    "content",
    state.settings.darkMode ? "#141210" : "#f3efe6",
  );
}

function overlay(id, show) {
  const node = document.getElementById(id);
  if (!node) return;
  node.classList.toggle("show", !!show);
}

function closeOverlays() {
  document.querySelectorAll(".overlay").forEach((n) => n.classList.remove("show"));
}

function remaining(d) {
  let n = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) if (state.grid[r][c] === d) n++;
  }
  return Math.max(0, 9 - n);
}

function userFilledCount() {
  let n = 0;
  for (let i = 0; i < 81; i++) {
    const { r, c } = pos(i);
    if (!state.puzzle[r][c] && state.grid[r][c]) n++;
  }
  return n;
}

function isDirty() {
  if (!state.grid || state.won || state.over) return false;
  return state.elapsed > 4 || userFilledCount() > 0;
}

function buildBoard() {
  els.board.innerHTML = "";
  for (let b = 0; b < 9; b++) {
    const box = document.createElement("div");
    box.className = "box";
    const br = Math.floor(b / 3) * 3;
    const bc = (b % 3) * 3;
    for (let k = 0; k < 9; k++) {
      const r = br + Math.floor(k / 3);
      const c = bc + (k % 3);
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell";
      cell.dataset.i = String(idx(r, c));
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-label", `Row ${r + 1}, column ${c + 1}`);
      box.appendChild(cell);
    }
    els.board.appendChild(box);
  }
}

function buildPad() {
  els.pad.innerHTML = "";
  for (let d = 1; d <= 9; d++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pad-btn";
    btn.dataset.d = String(d);
    btn.innerHTML = `<span class="n">${d}</span><span class="left" data-left="${d}"></span>`;
    els.pad.appendChild(btn);
  }
}

function renderBoard() {
  if (!state.grid) return;
  const conflicts = state.settings.highlightPeers ? conflictCells(state.grid) : new Set();
  const sel = state.selected;
  const selDigit =
    state.selectedDigit ||
    (sel >= 0 ? state.grid[pos(sel).r][pos(sel).c] : 0);
  const selR = sel >= 0 ? pos(sel).r : -1;
  const selC = sel >= 0 ? pos(sel).c : -1;

  els.board.querySelectorAll(".cell").forEach((cell) => {
    const i = Number(cell.dataset.i);
    const { r, c } = pos(i);
    const v = state.grid[r][c];
    const given = isGiven(i);
    const classes = ["cell"];
    if (given) classes.push("is-given");
    else if (v) classes.push("is-user");
    if (i === sel) classes.push("is-selected");
    else if (sel >= 0 && state.settings.highlightPeers) {
      if (r === selR || c === selC || (Math.floor(r / 3) === Math.floor(selR / 3) && Math.floor(c / 3) === Math.floor(selC / 3))) {
        classes.push("is-peer");
      }
    }
    if (v && selDigit && v === selDigit && state.settings.highlightSame) classes.push("is-same");
    if (conflicts.has(i) || (state.settings.autoCheck && v && !given && v !== state.solution[r][c])) {
      classes.push("is-error");
    }
    if (i === state.hintCell) classes.push("is-hint");
    cell.className = classes.join(" ");

    if (v) {
      cell.innerHTML = `<span class="value">${v}</span>`;
    } else {
      const bits = state.notes[i];
      const parts = [];
      for (let d = 1; d <= 9; d++) {
        parts.push(`<span class="${bits & (1 << d) ? "on" : ""}">${d}</span>`);
      }
      cell.innerHTML = `<div class="notes">${parts.join("")}</div>`;
    }
  });
}

function renderChrome() {
  const spec = DIFFICULTIES[state.difficulty] || DIFFICULTIES.easy;
  els.diffName.textContent = state.daily ? `Daily · ${spec.label}` : spec.label;
  const limit = state.settings.mistakeLimit;
  els.mistakes.hidden = !limit;
  els.mistakes.innerHTML = `Mistakes <strong>${state.mistakes}/3</strong>`;
  els.mistakes.classList.toggle("is-hot", state.mistakes >= 2);
  els.timer.textContent = formatTime(state.elapsed);
  els.timer.parentElement.hidden = !state.settings.showTimer;
  els.wrap.classList.toggle("is-paused", state.paused && !state.won && !state.over);
  document.getElementById("btn-notes").setAttribute("aria-pressed", String(state.notesMode));

  els.pad.querySelectorAll(".pad-btn").forEach((btn) => {
    const d = Number(btn.dataset.d);
    const left = remaining(d);
    btn.querySelector(".left").textContent = String(left);
    btn.classList.toggle("is-done", left === 0);
    btn.classList.toggle("is-on", state.selectedDigit === d);
  });

  const totalWon = Object.keys(DIFFICULTIES).reduce(
    (n, id) => n + (state.stats[id]?.won || 0),
    0,
  );
  els.statWon.textContent = String(totalWon);
  els.statStreak.textContent = String(state.stats.streak || 0);
  els.dailyDate.textContent = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const today = dateKey();
  const dailyBtn = document.getElementById("btn-daily");
  if (state.stats.dailyWins?.[today]) {
    dailyBtn.textContent = `Solved today · ${formatTime(state.stats.dailyWins[today])}`;
  } else {
    dailyBtn.textContent = "Play today’s puzzle";
  }
}

function render() {
  renderBoard();
  renderChrome();
}

function startClock() {
  stopClock();
  lastTick = Date.now();
  clock = setInterval(() => {
    if (!state.paused && !state.won && !state.over) {
      const now = Date.now();
      state.elapsed += (now - lastTick) / 1000;
      lastTick = now;
      els.timer.textContent = formatTime(state.elapsed);
    } else {
      lastTick = Date.now();
    }
  }, 250);
}

function stopClock() {
  if (clock) clearInterval(clock);
  clock = null;
}

function pause(on) {
  if (state.won || state.over) return;
  state.paused = on;
  if (!on) lastTick = Date.now();
  renderChrome();
  persist();
}

function showToast(title, body) {
  els.toast.innerHTML = `<b>${title}</b>${body}`;
  els.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 7000);
}

function stripPeerNotes(r, c, digit) {
  if (!state.settings.autoRemoveNotes) return;
  const bit = 1 << digit;
  for (let i = 0; i < 9; i++) {
    state.notes[idx(r, i)] &= ~bit;
    state.notes[idx(i, c)] &= ~bit;
  }
  const br = r - (r % 3);
  const bc = c - (c % 3);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) state.notes[idx(br + i, bc + j)] &= ~bit;
  }
}

function place(i, digit, { fromHint = false } = {}) {
  if (state.over || state.won || state.paused) return;
  if (i < 0 || isGiven(i)) return;
  const { r, c } = pos(i);
  const current = state.grid[r][c];
  if (digit && current === digit && !state.notesMode) return;

  const before = snapshot();

  if (state.notesMode && !fromHint) {
    if (current) return;
    if (!digit) {
      state.notes[i] = 0;
    } else {
      state.notes[i] ^= 1 << digit;
    }
    state.history.push(before);
    state.redo = [];
    render();
    persist();
    return;
  }

  if (!digit) {
    state.grid[r][c] = 0;
    state.notes[i] = 0;
    state.history.push(before);
    state.redo = [];
    render();
    persist();
    return;
  }

  const correct = digit === state.solution[r][c];
  state.grid[r][c] = digit;
  state.notes[i] = 0;
  if (correct) stripPeerNotes(r, c, digit);

  if (state.settings.autoCheck && !correct && !fromHint) {
    state.mistakes += 1;
  }

  state.history.push(before);
  state.redo = [];
  state.hintCell = fromHint ? i : -1;
  render();

  if (state.settings.mistakeLimit && state.mistakes >= 3 && !state.won) {
    state.over = true;
    state.paused = true;
    persist();
    overlay("overlay-over", true);
    return;
  }

  if (isSolved(state.grid, state.solution)) {
    onWin();
    return;
  }
  persist();
}

function onWin() {
  state.won = true;
  state.paused = true;
  const diff = state.difficulty;
  const stats = state.stats[diff] || (state.stats[diff] = { started: 0, won: 0, bestTime: null, totalWinTime: 0, perfect: 0 });
  stats.won += 1;
  stats.totalWinTime += state.elapsed;
  if (stats.bestTime == null || state.elapsed < stats.bestTime) stats.bestTime = state.elapsed;
  if (state.mistakes === 0) stats.perfect += 1;

  if (state.daily && state.dateKey) {
    const today = state.dateKey;
    state.stats.dailyWins = state.stats.dailyWins || {};
    if (!state.stats.dailyWins[today]) {
      state.stats.dailyWins[today] = Math.floor(state.elapsed);
      const last = state.stats.lastDailyWin;
      const yest = dateKey(new Date(Date.now() - 86400000));
      if (last === yest) state.stats.streak += 1;
      else if (last !== today) state.stats.streak = 1;
      state.stats.bestStreak = Math.max(state.stats.bestStreak || 0, state.stats.streak);
      state.stats.lastDailyWin = today;
    }
  }

  els.winTime.textContent = formatTime(state.elapsed);
  const best = stats.bestTime;
  const parts = [
    DIFFICULTIES[diff].label,
    `${state.mistakes} mistake${state.mistakes === 1 ? "" : "s"}`,
    `${state.hints} hint${state.hints === 1 ? "" : "s"}`,
  ];
  let extra = "";
  if (best != null && stats.won > 1 && Math.abs(state.elapsed - best) < 0.6) {
    extra = " A new best time.";
  } else if (best != null && state.elapsed > best) {
    extra = ` Best on ${DIFFICULTIES[diff].label.toLowerCase()} is ${formatTime(best)}.`;
  }
  els.winCopy.textContent = `${parts.join(" · ")}.${extra}`;
  persist();
  renderChrome();
  overlay("overlay-win", true);
}

function undo() {
  if (!state.history.length || state.won) return;
  if (state.over) return;
  state.redo.push(snapshot());
  restore(state.history.pop());
  render();
  persist();
}

function redo() {
  if (!state.redo.length || state.over || state.won) return;
  state.history.push(snapshot());
  restore(state.redo.pop());
  render();
  persist();
}

function hint() {
  if (state.over || state.won || state.paused) return;
  const h = findHint(state.grid, state.solution);
  if (!h) return;
  state.hints += 1;
  state.selected = idx(h.r, h.c);
  state.selectedDigit = 0;
  const wasNotes = state.notesMode;
  state.notesMode = false;
  place(state.selected, h.n, { fromHint: true });
  state.notesMode = wasNotes;
  showToast(h.technique, h.why);
}

function fillNotes() {
  if (!state.grid || state.won || state.over) return;
  const before = snapshot();
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (state.grid[r][c]) continue;
      let bits = 0;
      for (const d of candidates(state.grid, r, c)) bits |= 1 << d;
      state.notes[idx(r, c)] = bits;
    }
  }
  state.history.push(before);
  state.redo = [];
  render();
  persist();
}

function onCellClick(i) {
  if (state.paused) {
    pause(false);
    return;
  }
  if (state.digitLock && state.selectedDigit && !isGiven(i)) {
    state.selected = i;
    place(i, state.selectedDigit);
    return;
  }
  state.selected = i;
  state.digitLock = false;
  const { r, c } = pos(i);
  state.selectedDigit = state.grid[r][c] || 0;
  render();
}

function onPadClick(d) {
  if (state.paused) return;
  if (state.selectedDigit === d && state.selected < 0) {
    state.selectedDigit = 0;
    state.digitLock = false;
    render();
    return;
  }
  state.selectedDigit = d;
  state.digitLock = true;
  if (state.selected >= 0) {
    place(state.selected, d);
    return;
  }
  render();
}

function moveSel(dr, dc) {
  let r = 4;
  let c = 4;
  if (state.selected >= 0) {
    ({ r, c } = pos(state.selected));
  }
  r = Math.max(0, Math.min(8, r + dr));
  c = Math.max(0, Math.min(8, c + dc));
  state.selected = idx(r, c);
  state.selectedDigit = 0;
  render();
}

function loadGameFromSave(game) {
  state.difficulty = game.difficulty || "easy";
  state.daily = !!game.daily;
  state.dateKey = game.dateKey || null;
  state.puzzle = unflatten(game.puzzle);
  state.solution = unflatten(game.solution);
  state.grid = unflatten(game.grid);
  state.notes = Int16Array.from(game.notes || []);
  if (state.notes.length !== 81) state.notes = new Int16Array(81);
  state.mistakes = game.mistakes || 0;
  state.hints = game.hints || 0;
  state.elapsed = game.elapsed || 0;
  state.over = !!game.over;
  state.won = !!game.won;
  state.secondChanceUsed = !!game.secondChanceUsed;
  state.notesMode = !!game.notesMode;
  state.paused = false;
  state.history = [];
  state.redo = [];
  state.selected = -1;
  state.selectedDigit = 0;
  render();
  startClock();
  if (state.over) overlay("overlay-over", true);
}

function recordStart(difficulty, daily) {
  const id = daily ? "medium" : difficulty;
  if (!state.stats[id]) {
    state.stats[id] = { started: 0, won: 0, bestTime: null, totalWinTime: 0, perfect: 0 };
  }
  state.stats[id].started += 1;
}

async function startPuzzle({ difficulty = "easy", daily = false } = {}) {
  closeOverlays();
  overlay("overlay-loading", true);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  let pack;
  try {
    pack = daily ? generateDaily(new Date()) : generatePuzzle(difficulty);
  } catch (err) {
    overlay("overlay-loading", false);
    showToast("Could not build a puzzle", String(err.message || err));
    return;
  }
  overlay("overlay-loading", false);
  state.difficulty = pack.difficulty;
  state.daily = !!pack.daily;
  state.dateKey = pack.dateKey || (daily ? dateKey() : null);
  state.puzzle = pack.puzzle;
  state.solution = pack.solution;
  state.grid = cloneGrid(pack.puzzle);
  state.notes = new Int16Array(81);
  state.selected = -1;
  state.selectedDigit = 0;
  state.notesMode = false;
  state.mistakes = 0;
  state.hints = 0;
  state.elapsed = 0;
  state.paused = false;
  state.over = false;
  state.won = false;
  state.history = [];
  state.redo = [];
  state.secondChanceUsed = false;
  state.hintCell = -1;
  recordStart(state.difficulty, state.daily);
  render();
  startClock();
  persist();
}

function secondChance() {
  if (state.secondChanceUsed && state.over) {
    // still allow one revive
  }
  state.over = false;
  state.paused = false;
  state.secondChanceUsed = true;
  if (state.mistakes >= 3) state.mistakes = 2;
  // clear last incorrect fill
  for (let r = 8; r >= 0; r--) {
    for (let c = 8; c >= 0; c--) {
      if (!state.puzzle[r][c] && state.grid[r][c] && state.grid[r][c] !== state.solution[r][c]) {
        state.grid[r][c] = 0;
        state.notes[idx(r, c)] = 0;
        state.selected = idx(r, c);
        closeOverlays();
        lastTick = Date.now();
        render();
        persist();
        return;
      }
    }
  }
  closeOverlays();
  lastTick = Date.now();
  render();
  persist();
}

function renderNewGameModal() {
  els.dirtyWarn.hidden = !isDirty();
  els.diffGrid.innerHTML = Object.values(DIFFICULTIES)
    .map((d) => {
      const s = state.stats[d.id] || {};
      const best = s.bestTime != null ? formatTime(s.bestTime) : "—";
      return `<button class="diff-card" data-diff="${d.id}">
        <b>${d.label}</b>
        <span>${d.blurb}</span>
        <em>best ${best}</em>
      </button>`;
    })
    .join("");
}

function renderStatsModal() {
  const totalWon = Object.keys(DIFFICULTIES).reduce((n, id) => n + (state.stats[id]?.won || 0), 0);
  const totalStarted = Object.keys(DIFFICULTIES).reduce((n, id) => n + (state.stats[id]?.started || 0), 0);
  const rate = totalStarted ? Math.round((totalWon / totalStarted) * 100) : 0;
  els.statsLede.textContent = `${totalWon} wins · ${rate}% finish rate · daily streak ${state.stats.streak || 0} (best ${state.stats.bestStreak || 0})`;
  els.statsTable.innerHTML = `
    <thead><tr><th>Level</th><th>Started</th><th>Won</th><th>Best</th><th>Avg</th><th>Perfect</th></tr></thead>
    <tbody>
      ${Object.values(DIFFICULTIES)
        .map((d) => {
          const s = state.stats[d.id] || {};
          const avg = s.won ? formatTime(s.totalWinTime / s.won) : "—";
          return `<tr>
            <td>${d.label}</td>
            <td>${s.started || 0}</td>
            <td>${s.won || 0}</td>
            <td>${s.bestTime != null ? formatTime(s.bestTime) : "—"}</td>
            <td>${avg}</td>
            <td>${s.perfect || 0}</td>
          </tr>`;
        })
        .join("")}
    </tbody>`;
}

const SETTING_ROWS = [
  ["autoCheck", "Auto-check mistakes", "Wrong digits (versus the solution) turn red and count as a mistake."],
  ["highlightPeers", "Highlight row, column, box", "The selected cell lights its house."],
  ["highlightSame", "Highlight identical numbers", "Every copy of the selected digit is marked."],
  ["autoRemoveNotes", "Auto-remove notes", "Placing a digit clears that candidate from its houses."],
  ["mistakeLimit", "Three-mistake limit", "The round ends after the third error."],
  ["showTimer", "Show timer", "Hide it if you would rather not race."],
  ["darkMode", "Dark theme", "Ink on paper, inverted."],
];

function renderSettings() {
  els.settingsList.innerHTML = SETTING_ROWS.map(
    ([key, label, help]) => `
      <button class="toggle" data-setting="${key}" aria-pressed="${state.settings[key] ? "true" : "false"}">
        <span>${label}<small>${help}</small></span>
        <span class="switch" aria-hidden="true"></span>
      </button>`,
  ).join("");
}

function bind() {
  els.board.addEventListener("click", (e) => {
    const cell = e.target.closest(".cell");
    if (!cell) return;
    onCellClick(Number(cell.dataset.i));
  });

  els.pad.addEventListener("click", (e) => {
    const btn = e.target.closest(".pad-btn");
    if (!btn) return;
    onPadClick(Number(btn.dataset.d));
  });

  document.getElementById("btn-undo").addEventListener("click", undo);
  document.getElementById("btn-erase").addEventListener("click", () => {
    if (state.selected >= 0) place(state.selected, 0);
  });
  document.getElementById("btn-notes").addEventListener("click", () => {
    state.notesMode = !state.notesMode;
    renderChrome();
  });
  document.getElementById("btn-hint").addEventListener("click", hint);
  document.getElementById("timer-btn").addEventListener("click", () => pause(!state.paused));
  document.getElementById("resume-btn").addEventListener("click", () => pause(false));
  document.getElementById("btn-daily").addEventListener("click", () => startPuzzle({ daily: true }));
  document.getElementById("win-daily").addEventListener("click", () => startPuzzle({ daily: true }));
  document.getElementById("second-chance").addEventListener("click", secondChance);
  document.getElementById("fill-notes").addEventListener("click", () => {
    fillNotes();
    closeOverlays();
  });

  document.addEventListener("click", (e) => {
    const open = e.target.closest("[data-open]");
    if (open) {
      const which = open.getAttribute("data-open");
      if (which === "daily") {
        startPuzzle({ daily: true });
        return;
      }
      if (which === "new") {
        closeOverlays();
        renderNewGameModal();
        overlay("overlay-new", true);
        return;
      }
      if (which === "stats") {
        closeOverlays();
        renderStatsModal();
        overlay("overlay-stats", true);
        return;
      }
      if (which === "how") {
        closeOverlays();
        overlay("overlay-how", true);
        return;
      }
      if (which === "settings") {
        closeOverlays();
        renderSettings();
        overlay("overlay-settings", true);
        return;
      }
    }
    if (e.target.closest("[data-close]")) {
      closeOverlays();
      return;
    }
    if (e.target.classList.contains("overlay") && e.target.id !== "overlay-loading") {
      e.target.classList.remove("show");
    }
  });

  els.diffGrid.addEventListener("click", (e) => {
    const card = e.target.closest("[data-diff]");
    if (!card) return;
    startPuzzle({ difficulty: card.getAttribute("data-diff") });
  });

  els.settingsList.addEventListener("click", (e) => {
    const row = e.target.closest("[data-setting]");
    if (!row) return;
    const key = row.getAttribute("data-setting");
    state.settings[key] = !state.settings[key];
    if (key === "darkMode") applyTheme();
    renderSettings();
    render();
    persist();
  });

  document.addEventListener("keydown", (e) => {
    const modalOpen = [...document.querySelectorAll(".overlay.show")].some((n) => n.id !== "overlay-loading");
    if (e.key === "Escape") {
      if (modalOpen) closeOverlays();
      else pause(!state.paused);
      return;
    }
    if (modalOpen) return;
    if (e.target.matches("input, textarea")) return;

    if (e.key >= "1" && e.key <= "9") {
      e.preventDefault();
      onPadClick(Number(e.key));
      return;
    }
    if (e.key === "0" || e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      if (state.selected >= 0) place(state.selected, 0);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      moveSel(-1, 0);
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveSel(1, 0);
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      moveSel(0, -1);
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      moveSel(0, 1);
    }
    if (e.key === "n" || e.key === "N") {
      state.notesMode = !state.notesMode;
      renderChrome();
    }
    if (e.key === "h" || e.key === "H") hint();
    if (e.key === "u" || e.key === "U" || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !e.shiftKey)) {
      e.preventDefault();
      undo();
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && e.shiftKey) {
      e.preventDefault();
      redo();
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
      e.preventDefault();
      redo();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause(true);
  });
}

function boot() {
  applyTheme();
  Object.assign(state.settings, { ...defaultSettings, ...stored.settings });
  applyTheme();
  buildBoard();
  buildPad();
  bind();
  if (stored.game && stored.game.puzzle && !stored.game.won) {
    loadGameFromSave(stored.game);
  } else {
    startPuzzle({ difficulty: "easy" });
  }
}

if (document.body.dataset.page === "play") boot();

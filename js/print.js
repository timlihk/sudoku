import {
  DIFFICULTIES,
  dateKey,
  emptyGrid,
  generatePuzzle,
  hashSeed,
  mulberry32,
} from "./engine.js";

const els = {
  sheets: document.getElementById("sheets"),
  status: document.getElementById("status"),
  date: document.getElementById("print-date"),
  custom: document.getElementById("custom-controls"),
  count: document.getElementById("print-count"),
};

const state = {
  mode: "daily",
  paper: "a4",
  perPage: 2,
  solutions: true,
  difficulty: "medium",
  count: 4,
  date: dateKey(),
  packs: [],
};

function applyTheme() {
  try {
    const stored = JSON.parse(localStorage.getItem("nines-sudoku-v1") || "{}");
    document.documentElement.dataset.theme = stored.settings?.darkMode ? "dark" : "light";
  } catch {
    /* ignore */
  }
}

function formatLong(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function inkBoard(grid, { answers = false, clues = null } = {}) {
  const clueGrid = clues || grid;
  let html = '<div class="ink-board">';
  for (let b = 0; b < 9; b++) {
    html += '<div class="ink-box">';
    const br = Math.floor(b / 3) * 3;
    const bc = (b % 3) * 3;
    for (let k = 0; k < 9; k++) {
      const r = br + Math.floor(k / 3);
      const c = bc + (k % 3);
      const clue = clueGrid[r][c];
      const v = answers ? grid[r][c] : clue;
      const cls = answers && !clue ? "ink-cell is-answer" : "ink-cell is-clue";
      html += `<div class="${cls}">${v || ""}</div>`;
    }
    html += "</div>";
  }
  html += "</div>";
  return html;
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function card(pack, answers) {
  const spec = DIFFICULTIES[pack.difficulty] || { label: pack.difficulty };
  const title = pack.blank
    ? `Blank grid ${pack.index}`
    : `${spec.label} · ${pack.index}`;
  const grid = answers ? pack.solution : pack.puzzle;
  return `<article class="paper-card">
    <h3>${title}</h3>
    ${inkBoard(grid, { answers, clues: pack.puzzle })}
    ${answers ? "" : `<p>Each row, column, and 3×3 box uses 1–9 once.</p>`}
  </article>`;
}

function sheetHTML(packs, { answers = false, page, pages } = {}) {
  const per = state.perPage;
  const label = answers ? "Answers" : "Puzzles";
  const dateLabel = state.mode === "daily" ? formatLong(state.date) : "Custom pack";
  return `<section class="paper${answers ? " answers" : ""}" data-per="${per}">
    <header class="paper-head">
      <div class="paper-brand">sudo<em>ku</em></div>
      <div class="paper-meta">${label} · ${dateLabel} · ${page}/${pages} · soduku.net</div>
    </header>
    <div class="paper-puzzles">
      ${packs.map((p) => card(p, answers)).join("")}
    </div>
  </section>`;
}

function render() {
  document.documentElement.dataset.paper = state.paper;
  const packs = state.packs;
  if (!packs.length) {
    els.sheets.innerHTML = "";
    return;
  }
  const groups = chunk(packs, state.perPage);
  const answerGroups = state.solutions && !packs[0].blank ? groups : [];
  const pages = groups.length + answerGroups.length;
  let page = 1;
  let html = "";
  for (const g of groups) {
    html += sheetHTML(g, { answers: false, page, pages });
    page++;
  }
  for (const g of answerGroups) {
    html += sheetHTML(g, { answers: true, page, pages });
    page++;
  }
  els.sheets.innerHTML = html;
}

function setStatus(text) {
  els.status.textContent = text;
}

async function yieldUi() {
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}

async function loadDaily() {
  const [y, m, d] = state.date.split("-").map(Number);
  const key = dateKey(new Date(y, m - 1, d));
  const packs = [];
  const ids = ["easy", "medium", "hard", "expert", "master"];
  for (let i = 0; i < ids.length; i++) {
    setStatus(`Setting ${DIFFICULTIES[ids[i]].label} (${i + 1}/5)…`);
    await yieldUi();
    const pack = generatePuzzle(ids[i], mulberry32(hashSeed(`${key}:print:${ids[i]}`)));
    pack.dateKey = key;
    pack.index = i + 1;
    pack.daily = true;
    packs.push(pack);
  }
  state.packs = packs;
  setStatus(`${formatLong(state.date)} · five difficulties, one of each.`);
  render();
}

async function loadCustom() {
  setStatus(`Carving ${state.count} ${DIFFICULTIES[state.difficulty].label.toLowerCase()} puzzle${state.count === 1 ? "" : "s"}…`);
  await yieldUi();
  const packs = [];
  const seed = hashSeed(`${Date.now()}:${state.difficulty}:${state.count}`);
  const rng = mulberry32(seed);
  for (let i = 0; i < state.count; i++) {
    setStatus(`Carving ${i + 1} of ${state.count}…`);
    await yieldUi();
    const pack = generatePuzzle(state.difficulty, rng);
    pack.index = i + 1;
    packs.push(pack);
  }
  state.packs = packs;
  setStatus(`${state.count} ${DIFFICULTIES[state.difficulty].label.toLowerCase()} puzzle${state.count === 1 ? "" : "s"} · unique solutions.`);
  render();
}

function loadBlank() {
  state.packs = Array.from({ length: state.count }, (_, i) => ({
    puzzle: emptyGrid(),
    solution: emptyGrid(),
    difficulty: "blank",
    index: i + 1,
    blank: true,
  }));
  setStatus("Blank grids — for copying a newspaper puzzle, or teaching.");
  render();
}

async function refresh() {
  els.custom.hidden = state.mode !== "custom" && state.mode !== "blank";
  document.getElementById("diff-seg").hidden = state.mode !== "custom";
  if (state.mode === "daily") await loadDaily();
  else if (state.mode === "blank") loadBlank();
  else await loadCustom();
}

function press(seg, value) {
  seg.querySelectorAll("button").forEach((b) => {
    const on = b.dataset.value === String(value);
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });
}

function bind() {
  document.getElementById("mode-seg").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-value]");
    if (!btn) return;
    state.mode = btn.dataset.value;
    press(e.currentTarget, state.mode);
    refresh();
  });
  document.getElementById("paper-seg").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-value]");
    if (!btn) return;
    state.paper = btn.dataset.value;
    press(e.currentTarget, state.paper);
    render();
  });
  document.getElementById("per-seg").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-value]");
    if (!btn) return;
    state.perPage = Number(btn.dataset.value);
    press(e.currentTarget, state.perPage);
    render();
  });
  document.getElementById("sol-seg").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-value]");
    if (!btn) return;
    state.solutions = btn.dataset.value === "yes";
    press(e.currentTarget, btn.dataset.value);
    render();
  });
  document.getElementById("diff-seg").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-value]");
    if (!btn) return;
    state.difficulty = btn.dataset.value;
    press(e.currentTarget, state.difficulty);
    if (state.mode === "custom") refresh();
  });
  els.date.value = state.date;
  els.date.addEventListener("change", () => {
    state.date = els.date.value || dateKey();
    if (state.mode === "daily") refresh();
  });
  els.count.value = String(state.count);
  els.count.addEventListener("change", () => {
    state.count = Math.max(1, Math.min(12, Number(els.count.value) || 4));
    if (state.mode !== "daily") refresh();
  });
  document.getElementById("btn-print").addEventListener("click", () => window.print());
  document.getElementById("btn-refresh").addEventListener("click", () => {
    if (state.mode === "daily") return refresh();
    refresh();
  });
}

applyTheme();
bind();
refresh();

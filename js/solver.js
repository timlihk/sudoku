import {
  candidates,
  cloneGrid,
  conflictCells,
  emptyGrid,
  nextStep,
  parsePuzzle,
  serializePuzzle,
  solveGrid,
} from "./engine.js";

const EXAMPLE =
  "530070000600195000098000060800060003400803001700020006060000280000419005000080079";

const els = {
  board: document.getElementById("solver-board"),
  status: document.getElementById("solver-status"),
  log: document.getElementById("step-log"),
  paste: document.getElementById("paste"),
};

const state = {
  grid: emptyGrid(),
  givens: emptyGrid(),
  selected: -1,
  highlight: -1,
  showCandidates: false,
  steps: [],
};

function applyTheme() {
  try {
    const stored = JSON.parse(localStorage.getItem("nines-sudoku-v1") || "{}");
    document.documentElement.dataset.theme = stored.settings?.darkMode ? "dark" : "light";
  } catch {
    /* ignore */
  }
}

function idx(r, c) {
  return r * 9 + c;
}
function pos(i) {
  return { r: (i / 9) | 0, c: i % 9 };
}

function clueCount() {
  let n = 0;
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (state.grid[r][c]) n++;
  return n;
}

function diagnose() {
  const n = clueCount();
  if (n === 0) return { cls: "", text: "Enter clues, paste 81 characters, or load the example." };
  const conflicts = conflictCells(state.grid);
  if (conflicts.size) return { cls: "is-bad", text: "A digit repeats in a row, column, or box." };
  const solved = solveGrid(state.grid);
  if (solved.status === "none") return { cls: "is-bad", text: "No solution — a clue is wrong." };
  if (solved.status === "multiple") {
    return { cls: "", text: `${n} clues · more than one solution. Add another given.` };
  }
  return { cls: "is-ok", text: `${n} clues · unique solution. Step through, or solve all.` };
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
      box.appendChild(cell);
    }
    els.board.appendChild(box);
  }
}

function render() {
  const conflicts = conflictCells(state.grid);
  const sel = state.selected;
  const selDigit = sel >= 0 ? state.grid[pos(sel).r][pos(sel).c] : 0;
  els.board.querySelectorAll(".cell").forEach((cell) => {
    const i = Number(cell.dataset.i);
    const { r, c } = pos(i);
    const v = state.grid[r][c];
    const given = state.givens[r][c] !== 0;
    const classes = ["cell"];
    if (given) classes.push("is-given");
    else if (v) classes.push("is-user");
    if (i === sel) classes.push("is-selected");
    if (i === state.highlight) classes.push("is-hint");
    if (v && selDigit && v === selDigit) classes.push("is-same");
    if (conflicts.has(i)) classes.push("is-error");
    cell.className = classes.join(" ");
    if (v) {
      cell.innerHTML = `<span class="value">${v}</span>`;
    } else if (state.showCandidates) {
      const cand = candidates(state.grid, r, c);
      const parts = [];
      for (let d = 1; d <= 9; d++) {
        parts.push(`<span class="${cand.includes(d) ? "on" : ""}">${d}</span>`);
      }
      cell.innerHTML = `<div class="notes">${parts.join("")}</div>`;
    } else {
      cell.innerHTML = "";
    }
  });
  const d = diagnose();
  els.status.className = `solver-status ${d.cls}`;
  els.status.textContent = d.text;
  els.log.innerHTML = state.steps
    .map(
      (s) =>
        `<li><b>${s.technique} · R${s.r + 1}C${s.c + 1} = ${s.n}</b><span>${s.why}</span></li>`,
    )
    .join("");
}

function setCell(i, n) {
  const { r, c } = pos(i);
  state.grid[r][c] = n;
  state.givens[r][c] = n;
  state.highlight = -1;
}

function loadGrid(grid) {
  state.grid = cloneGrid(grid);
  state.givens = cloneGrid(grid);
  state.steps = [];
  state.highlight = -1;
  els.paste.value = serializePuzzle(grid);
  render();
}

function stepOnce() {
  const move = nextStep(state.grid);
  if (move.error) {
    els.status.className = "solver-status is-bad";
    els.status.textContent = move.error;
    return false;
  }
  if (move.done) {
    els.status.className = "solver-status is-ok";
    els.status.textContent = "Solved.";
    return false;
  }
  state.grid[move.r][move.c] = move.n;
  state.selected = idx(move.r, move.c);
  state.highlight = state.selected;
  state.steps.push(move);
  render();
  els.log.querySelector("li:last-child")?.scrollIntoView({ block: "nearest" });
  return true;
}

function solveAll() {
  let guard = 0;
  while (guard++ < 81) {
    const move = nextStep(state.grid);
    if (move.error || move.done) {
      if (move.done) {
        els.status.className = "solver-status is-ok";
        els.status.textContent = `Solved in ${state.steps.length} step${state.steps.length === 1 ? "" : "s"}.`;
      } else {
        els.status.className = "solver-status is-bad";
        els.status.textContent = move.error;
      }
      render();
      return;
    }
    state.grid[move.r][move.c] = move.n;
    state.highlight = idx(move.r, move.c);
    state.steps.push(move);
  }
  render();
}

function bind() {
  els.board.addEventListener("click", (e) => {
    const cell = e.target.closest(".cell");
    if (!cell) return;
    state.selected = Number(cell.dataset.i);
    render();
  });
  document.getElementById("solver-pad").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-d]");
    if (!btn || state.selected < 0) return;
    setCell(state.selected, Number(btn.dataset.d));
    render();
  });
  document.getElementById("btn-erase").addEventListener("click", () => {
    if (state.selected < 0) return;
    setCell(state.selected, 0);
    render();
  });
  document.getElementById("btn-step").addEventListener("click", () => stepOnce());
  document.getElementById("btn-solve").addEventListener("click", () => solveAll());
  document.getElementById("btn-candidates").addEventListener("click", (e) => {
    state.showCandidates = !state.showCandidates;
    e.currentTarget.setAttribute("aria-pressed", String(state.showCandidates));
    render();
  });
  document.getElementById("btn-clear").addEventListener("click", () => {
    loadGrid(emptyGrid());
  });
  document.getElementById("btn-example").addEventListener("click", () => {
    loadGrid(parsePuzzle(EXAMPLE).grid);
  });
  document.getElementById("btn-paste").addEventListener("click", () => {
    const parsed = parsePuzzle(els.paste.value);
    if (parsed.error && !parsed.grid) {
      els.status.className = "solver-status is-bad";
      els.status.textContent = parsed.error;
      return;
    }
    if (parsed.error) {
      loadGrid(parsed.grid);
      els.status.className = "solver-status is-bad";
      els.status.textContent = parsed.error;
      return;
    }
    loadGrid(parsed.grid);
  });
  document.getElementById("btn-copy").addEventListener("click", async () => {
    const s = serializePuzzle(state.grid);
    els.paste.value = s;
    try {
      await navigator.clipboard.writeText(s);
      els.status.textContent = "Copied 81-character string.";
    } catch {
      els.status.textContent = "Copy the string from the box.";
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.target.matches("textarea, input")) return;
    if (e.key >= "1" && e.key <= "9" && state.selected >= 0) {
      setCell(state.selected, Number(e.key));
      render();
    }
    if ((e.key === "0" || e.key === "Backspace" || e.key === "Delete") && state.selected >= 0) {
      setCell(state.selected, 0);
      render();
    }
    if (e.key === "ArrowUp" && state.selected >= 0) {
      e.preventDefault();
      state.selected = Math.max(0, state.selected - 9);
      render();
    }
    if (e.key === "ArrowDown" && state.selected >= 0) {
      e.preventDefault();
      state.selected = Math.min(80, state.selected + 9);
      render();
    }
    if (e.key === "ArrowLeft" && state.selected >= 0) {
      e.preventDefault();
      state.selected = Math.max(0, state.selected - 1);
      render();
    }
    if (e.key === "ArrowRight" && state.selected >= 0) {
      e.preventDefault();
      state.selected = Math.min(80, state.selected + 1);
      render();
    }
  });
}

applyTheme();
buildBoard();
bind();
const params = new URLSearchParams(location.search);
if (params.get("p")) {
  const parsed = parsePuzzle(params.get("p"));
  if (parsed.grid) loadGrid(parsed.grid);
  else render();
} else {
  render();
}

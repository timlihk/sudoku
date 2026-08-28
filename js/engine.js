const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const ALL_BITS = 0x3fe; // bits 1–9

export const DIFFICULTIES = {
  easy: {
    id: "easy",
    label: "Easy",
    clues: 40,
    rank: 1,
    blurb: "A warm-up. Plenty of givens — most cells are naked singles.",
  },
  medium: {
    id: "medium",
    label: "Medium",
    clues: 34,
    rank: 2,
    blurb: "Look a little further. Hidden singles start to show up.",
  },
  hard: {
    id: "hard",
    label: "Hard",
    clues: 28,
    rank: 3,
    blurb: "Pairs and pointing candidates. Guessing will waste your three lives.",
  },
  expert: {
    id: "expert",
    label: "Expert",
    clues: 24,
    rank: 4,
    blurb: "Sparse givens. Every placement has to be earned.",
  },
  master: {
    id: "master",
    label: "Master",
    clues: 22,
    rank: 5,
    blurb: "For people who enjoy being stuck for a minute.",
  },
  extreme: {
    id: "extreme",
    label: "Extreme",
    clues: 20,
    rank: 6,
    blurb: "Near-minimum clues. Logic only — there is still one unique solution.",
  },
};

export function emptyGrid() {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

export function cloneGrid(grid) {
  return grid.map((row) => row.slice());
}

export function boxIndex(r, c) {
  return Math.floor(r / 3) * 3 + Math.floor(c / 3);
}

export function flatten(grid) {
  return grid.flat();
}

export function unflatten(arr) {
  const grid = emptyGrid();
  for (let i = 0; i < 81; i++) grid[(i / 9) | 0][i % 9] = arr[i] | 0;
  return grid;
}

function popcount(n) {
  let c = 0;
  while (n) {
    n &= n - 1;
    c++;
  }
  return c;
}

function rngInt(rng, n) {
  return Math.floor(rng() * n);
}

export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rngInt(rng, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A known-valid completed Sudoku, then band/stack/digit/transpose shuffles.
 * Always produces a legal completed grid.
 */
export function generateComplete(rng = Math.random) {
  const seed = emptyGrid();
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      seed[r][c] = ((r * 3 + Math.floor(r / 3) + c) % 9) + 1;
    }
  }

  const map = [0, ...shuffle(DIGITS, rng)];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) seed[r][c] = map[seed[r][c]];
  }

  const bands = shuffle([0, 1, 2], rng);
  const rows = [];
  for (const band of bands) {
    rows.push(...shuffle([0, 1, 2], rng).map((i) => band * 3 + i));
  }
  const stacks = shuffle([0, 1, 2], rng);
  const cols = [];
  for (const stack of stacks) {
    cols.push(...shuffle([0, 1, 2], rng).map((i) => stack * 3 + i));
  }

  const out = emptyGrid();
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) out[r][c] = seed[rows[r]][cols[c]];
  }

  if (rng() < 0.5) {
    const transposed = emptyGrid();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) transposed[r][c] = out[c][r];
    }
    return transposed;
  }
  return out;
}

export function countSolutions(grid, cap = 2) {
  const rows = new Uint16Array(9);
  const cols = new Uint16Array(9);
  const boxes = new Uint16Array(9);
  const empties = [];

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = grid[r][c];
      if (v) {
        const bit = 1 << v;
        const b = boxIndex(r, c);
        if (rows[r] & bit || cols[c] & bit || boxes[b] & bit) return 0;
        rows[r] |= bit;
        cols[c] |= bit;
        boxes[b] |= bit;
      } else {
        empties.push(r * 9 + c);
      }
    }
  }

  let count = 0;

  function dfs() {
    if (count >= cap) return;
    if (empties.length === 0) {
      count++;
      return;
    }

    let bestK = 0;
    let bestMask = 0;
    let bestBits = 10;
    let bestPos = 0;

    for (let k = 0; k < empties.length; k++) {
      const pos = empties[k];
      const r = (pos / 9) | 0;
      const c = pos % 9;
      const mask = ALL_BITS & ~(rows[r] | cols[c] | boxes[boxIndex(r, c)]);
      const bits = popcount(mask);
      if (bits < bestBits) {
        bestBits = bits;
        bestMask = mask;
        bestK = k;
        bestPos = pos;
        if (bits <= 1) break;
      }
    }

    if (bestBits === 0) return;

    empties.splice(bestK, 1);
    const r = (bestPos / 9) | 0;
    const c = bestPos % 9;
    const b = boxIndex(r, c);
    let mask = bestMask;
    while (mask) {
      const bit = mask & -mask;
      mask ^= bit;
      rows[r] |= bit;
      cols[c] |= bit;
      boxes[b] |= bit;
      dfs();
      if (count >= cap) break;
      rows[r] ^= bit;
      cols[c] ^= bit;
      boxes[b] ^= bit;
    }
    empties.splice(bestK, 0, bestPos);
  }

  dfs();
  return count;
}

function tryClear(puzzle, r, c) {
  if (puzzle[r][c] === 0) return false;
  const bak = puzzle[r][c];
  puzzle[r][c] = 0;
  if (countSolutions(puzzle, 2) !== 1) {
    puzzle[r][c] = bak;
    return false;
  }
  return true;
}

export function generatePuzzle(difficulty = "easy", rng = Math.random) {
  const spec = DIFFICULTIES[difficulty] || DIFFICULTIES.easy;
  const solution = generateComplete(rng);
  const puzzle = cloneGrid(solution);
  const order = shuffle([...Array(81).keys()], rng);
  let clues = 81;
  const seen = new Uint8Array(81);

  for (const i of order) {
    if (clues <= spec.clues) break;
    if (seen[i]) continue;
    const r = (i / 9) | 0;
    const c = i % 9;
    const j = 80 - i;
    const r2 = (j / 9) | 0;
    const c2 = j % 9;

    if (i === j) {
      if (tryClear(puzzle, r, c)) {
        clues--;
        seen[i] = 1;
      }
      continue;
    }

    const bakA = puzzle[r][c];
    const bakB = puzzle[r2][c2];
    puzzle[r][c] = 0;
    puzzle[r2][c2] = 0;
    if (bakA && bakB && countSolutions(puzzle, 2) === 1 && clues - 2 >= spec.clues) {
      clues -= 2;
      seen[i] = 1;
      seen[j] = 1;
    } else {
      puzzle[r][c] = bakA;
      puzzle[r2][c2] = bakB;
      if (tryClear(puzzle, r, c)) {
        clues--;
        seen[i] = 1;
      }
    }
  }

  return {
    puzzle,
    solution,
    difficulty: spec.id,
    clues,
  };
}

export function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function generateDaily(date = new Date()) {
  const key = dateKey(date);
  const [y, m, d] = key.split("-").map(Number);
  const seed = (y * 10000 + m * 100 + d) ^ 0x51d0c0de;
  const result = generatePuzzle("medium", mulberry32(seed >>> 0));
  result.daily = true;
  result.dateKey = key;
  result.difficulty = "medium";
  return result;
}

export function candidates(grid, r, c) {
  if (grid[r][c]) return [];
  const used = new Set();
  for (let i = 0; i < 9; i++) {
    used.add(grid[r][i]);
    used.add(grid[i][c]);
  }
  const br = r - (r % 3);
  const bc = c - (c % 3);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) used.add(grid[br + i][bc + j]);
  }
  return DIGITS.filter((n) => !used.has(n));
}

export function conflictCells(grid) {
  const bad = new Set();

  function mark(cells) {
    const buckets = new Map();
    for (const [r, c] of cells) {
      const v = grid[r][c];
      if (!v) continue;
      if (!buckets.has(v)) buckets.set(v, []);
      buckets.get(v).push(r * 9 + c);
    }
    for (const arr of buckets.values()) {
      if (arr.length > 1) arr.forEach((i) => bad.add(i));
    }
  }

  for (let r = 0; r < 9; r++) {
    mark(Array.from({ length: 9 }, (_, c) => [r, c]));
  }
  for (let c = 0; c < 9; c++) {
    mark(Array.from({ length: 9 }, (_, r) => [r, c]));
  }
  for (let b = 0; b < 9; b++) {
    const br = Math.floor(b / 3) * 3;
    const bc = (b % 3) * 3;
    const cells = [];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) cells.push([br + i, bc + j]);
    }
    mark(cells);
  }
  return bad;
}

export function findHint(grid, solution) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c]) continue;
      const cand = candidates(grid, r, c);
      if (cand.length === 1) {
        return {
          r,
          c,
          n: cand[0],
          technique: "Naked single",
          why: `This cell can only be ${cand[0]} — every other digit already appears in its row, column, or box.`,
        };
      }
    }
  }

  const units = [];
  for (let r = 0; r < 9; r++) {
    units.push({
      name: `row ${r + 1}`,
      cells: Array.from({ length: 9 }, (_, c) => [r, c]),
    });
  }
  for (let c = 0; c < 9; c++) {
    units.push({
      name: `column ${c + 1}`,
      cells: Array.from({ length: 9 }, (_, r) => [r, c]),
    });
  }
  for (let b = 0; b < 9; b++) {
    const br = Math.floor(b / 3) * 3;
    const bc = (b % 3) * 3;
    const cells = [];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) cells.push([br + i, bc + j]);
    }
    units.push({ name: `box ${b + 1}`, cells });
  }

  for (const unit of units) {
    for (const d of DIGITS) {
      if (unit.cells.some(([r, c]) => grid[r][c] === d)) continue;
      const spots = unit.cells.filter(
        ([r, c]) => !grid[r][c] && candidates(grid, r, c).includes(d),
      );
      if (spots.length === 1) {
        const [r, c] = spots[0];
        return {
          r,
          c,
          n: d,
          technique: "Hidden single",
          why: `${d} can only go in this cell within ${unit.name}.`,
        };
      }
    }
  }

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (!grid[r][c]) {
        return {
          r,
          c,
          n: solution[r][c],
          technique: "Reveal",
          why: `No naked or hidden single is available. This cell is ${solution[r][c]}.`,
        };
      }
    }
  }
  return null;
}

export function isSolved(grid, solution) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] !== solution[r][c]) return false;
    }
  }
  return true;
}

export function isValidComplete(grid) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] < 1 || grid[r][c] > 9) return false;
    }
  }
  return countSolutions(grid, 2) === 1;
}

export function clueCount(grid) {
  let n = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) if (grid[r][c]) n++;
  }
  return n;
}

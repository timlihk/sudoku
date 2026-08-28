import assert from "node:assert/strict";
import {
  generateComplete,
  generatePuzzle,
  generateDaily,
  generateDailySet,
  countSolutions,
  isValidComplete,
  isSolved,
  candidates,
  findHint,
  mulberry32,
  clueCount,
  parsePuzzle,
  serializePuzzle,
  solveGrid,
  nextStep,
  DIFFICULTIES,
} from "../js/engine.js";

const complete = generateComplete(mulberry32(1));
assert.equal(isValidComplete(complete), true, "complete grid is a valid unique Sudoku");
assert.equal(countSolutions(complete, 2), 1);

for (const id of Object.keys(DIFFICULTIES)) {
  const { puzzle, solution, clues } = generatePuzzle(id, mulberry32(42 + DIFFICULTIES[id].rank));
  assert.equal(isValidComplete(solution), true, `${id}: solution valid`);
  assert.equal(countSolutions(puzzle, 2), 1, `${id}: unique solution`);
  assert.equal(isSolved(solution, solution), true);
  assert.ok(clueCount(puzzle) === clues, `${id}: clue count matches`);
  assert.ok(clues >= DIFFICULTIES[id].clues, `${id}: at least target clues`);
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (puzzle[r][c]) assert.equal(puzzle[r][c], solution[r][c]);
    }
  }
}

const dailyA = generateDaily(new Date("2026-08-28T12:00:00"));
const dailyB = generateDaily(new Date("2026-08-28T23:00:00"));
assert.deepEqual(dailyA.puzzle, dailyB.puzzle, "daily puzzle is stable for the calendar day");
assert.equal(dailyA.dateKey, "2026-08-28");
assert.equal(countSolutions(dailyA.puzzle, 2), 1);

const easy = generatePuzzle("easy", mulberry32(7));
const hint = findHint(easy.puzzle, easy.solution);
assert.ok(hint, "easy puzzles expose a hint");
assert.equal(hint.n, easy.solution[hint.r][hint.c]);
assert.ok(candidates(easy.puzzle, hint.r, hint.c).includes(hint.n));

const parsed = parsePuzzle("530070000600195000098000060800060003400803001700020006060000280000419005000080079");
assert.ok(parsed.grid, parsed.error);
const solved = solveGrid(parsed.grid);
assert.equal(solved.status, "unique");
assert.equal(serializePuzzle(parsed.grid).replace(/0/g, ".").length, 81);
const step = nextStep(parsed.grid);
assert.ok(step.technique);
assert.ok(step.n >= 1 && step.n <= 9);

const set = generateDailySet(new Date("2026-08-28T12:00:00"));
assert.equal(set.length, 5);
assert.equal(set[0].dateKey, "2026-08-28");
assert.equal(countSolutions(set[0].puzzle, 2), 1);
assert.equal(countSolutions(set[4].puzzle, 2), 1);

const bad = parsePuzzle("1234");
assert.ok(bad.error);

console.log("engine tests passed");

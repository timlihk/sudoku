import assert from "node:assert/strict";
import {
  generateComplete,
  generatePuzzle,
  generateDaily,
  countSolutions,
  isValidComplete,
  isSolved,
  candidates,
  findHint,
  mulberry32,
  clueCount,
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

console.log("engine tests passed");

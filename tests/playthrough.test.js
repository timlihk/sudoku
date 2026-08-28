import assert from "node:assert/strict";
import { generatePuzzle, findHint, isSolved, cloneGrid, mulberry32 } from "../js/engine.js";

const { puzzle, solution } = generatePuzzle("easy", mulberry32(99));
const grid = cloneGrid(puzzle);
let steps = 0;
while (!isSolved(grid, solution)) {
  const hint = findHint(grid, solution);
  assert.ok(hint, "hint available until solved");
  assert.equal(hint.n, solution[hint.r][hint.c]);
  assert.equal(grid[hint.r][hint.c], 0);
  grid[hint.r][hint.c] = hint.n;
  steps++;
  assert.ok(steps <= 81, "solve terminates");
}
assert.equal(isSolved(grid, solution), true);
assert.ok(steps >= 20, `easy should need many fills, got ${steps}`);
console.log(`playthrough solved in ${steps} hints`);

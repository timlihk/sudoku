# Sudoku

A free in-browser Sudoku game in the spirit of [sudoku.com](https://sudoku.com): a 9×9 board, six difficulties, pencil notes, a three-mistake limit, hints that name the technique, a daily puzzle, and local stats.

No account. No build step. Every puzzle is generated in the browser and checked for a unique solution.

## Run it

```bash
cd Code/sudoku
python3 -m http.server 8765
```

Open [http://localhost:8765](http://localhost:8765).

Or: `npm start`.

## What’s in here

- **Classic Sudoku** — Easy through Extreme
- **Daily challenge** — one shared Medium puzzle per local calendar day
- **Notes / pencil marks**, with optional auto-remove
- **Hints** — naked single, hidden single, then a reveal
- **Undo / erase**, timer, pause
- **Auto-check** against the unique solution (three lives, second chance)
- **Stats** — wins, best/average time, perfect games, daily streak
- **Dark theme** and other toggles in Settings
- Progress saved in `localStorage`

## Keys

| Key | Action |
| --- | --- |
| `1–9` | Fill (or pencil, in notes mode) |
| `N` | Toggle notes |
| `H` | Hint |
| `U` / `Ctrl+Z` | Undo |
| `Delete` | Erase |
| Arrows | Move |
| `Esc` | Pause / close |

## Tests

```bash
npm test
```

The generator uses a completed-grid shuffle (bands, stacks, digits, transpose) then punches holes while proving uniqueness with an MRV bitmask solver.

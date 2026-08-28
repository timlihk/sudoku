# Sudoku

A free in-browser Sudoku game in the spirit of [sudoku.com](https://sudoku.com): a 9×9 board, six difficulties, pencil notes, a three-mistake limit, hints that name the technique, a daily puzzle, and local stats.

**Live:** [https://soduku.net](https://soduku.net) (Cloudflare Pages, account `tim@timli.net`)

- Play: [soduku.net](https://soduku.net)
- Print: [soduku.net/printable](https://soduku.net/printable)
- Solver: [soduku.net/solver](https://soduku.net/solver)
- How to play: [soduku.net/how-to-play](https://soduku.net/how-to-play)

No account. No build step. Every puzzle is generated in the browser and checked for a unique solution.

## Run it locally

```bash
cd ~/Code/sudoku
python3 -m http.server 8765
```

Open [http://localhost:8765](http://localhost:8765). Or: `npm start`.

## Deploy

```bash
./deploy.sh
```

That stages the static files and runs `wrangler pages deploy` to the `soduku` Pages project, which is bound to `soduku.net` and `www.soduku.net`.

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

## Google SEO

On-page pieces are already deployed with the site:

- `https://soduku.net/robots.txt` — allows crawlers, points at the sitemap
- `https://soduku.net/sitemap.xml` — Play, Print, Solver, How to play
- Canonical URLs (apex, no `.html`), `www` → apex 301
- Open Graph + Twitter card + `og.png` (1200×630)
- JSON-LD (`WebSite` / `WebApplication` / `FAQPage`)

**The one thing Google still needs from you** is Search Console ownership, once:

1. Open [Google Search Console](https://search.google.com/search-console) as the Google account you want as owner.
2. Add a **URL prefix** property: `https://soduku.net`
3. Pick **HTML tag** verification and paste the `google-site-verification` content here — I’ll drop it into `index.html` and redeploy. DNS TXT on the Cloudflare zone works too.
4. After it verifies: **Sitemaps → Add sitemap** → `https://soduku.net/sitemap.xml`

Indexing a new domain usually takes days, not minutes. Print and How to play are the pages most likely to rank for “printable sudoku” / “how to play sudoku”; the game itself is a thin competitor to sudoku.com until it has some links.

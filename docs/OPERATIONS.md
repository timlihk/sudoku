# soduku.net — operations

Live Sudoku site. Domain spelling is **soduku.net** (as registered), not sudoku.net.

## URLs

| What | URL |
| --- | --- |
| Apex | https://soduku.net |
| WWW (301 → apex) | https://www.soduku.net |
| Pages origin | https://soduku.pages.dev |
| Play | https://soduku.net/ |
| Print | https://soduku.net/printable |
| Solver | https://soduku.net/solver |
| How to play | https://soduku.net/how-to-play |
| Privacy | https://soduku.net/privacy |
| ads.txt | https://soduku.net/ads.txt |
| robots.txt | https://soduku.net/robots.txt |
| sitemap.xml | https://soduku.net/sitemap.xml |

Aliases: `/print` → `/printable`, `/how` → `/how-to-play`.

## Repos & deploy

| | |
| --- | --- |
| Local | `~/Code/sudoku` |
| GitHub | https://github.com/timlihk/sudoku (public, homepage soduku.net) |
| Branch | `main` |
| Deploy | `./deploy.sh` from the repo root |

```bash
cd ~/Code/sudoku
git add -A && git commit -m "…"
# GitHub via this NAS: unset the HTTP proxy or gh/git 502
env -u http_proxy -u https_proxy -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u all_proxy \
  git push origin main
./deploy.sh
```

Pages is **not** git-connected. A GitHub push does not go live. `./deploy.sh` stages static files and runs `wrangler pages deploy`.

Local preview: `python3 -m http.server 8765` or `npm start`. Tests: `npm test`.

## Cloudflare

| | |
| --- | --- |
| Login | `tim@timli.net` |
| Account | Tim@timli.net's Account |
| Account ID | `eb9f6b365e71b1efe8f7c7f5ac00ad30` |
| Zone | `soduku.net` |
| Zone ID | `c597dc8eb03ab9f048ff1382ea8dcdce` |
| Plan | Free Website, full setup |
| Nameservers | `eve.ns.cloudflare.com`, `vasilii.ns.cloudflare.com` |
| Pages project | `soduku` |
| Wrangler | OAuth in `~/.wrangler/config/default.toml` (user tim@timli.net, `pages:write`) |
| DNS token | `~/.cloudflared/cf-dns-edit-token` (same value as `cf-api-token`) — Zone:Read + DNS:Edit |

DNS (proxied CNAMEs):

| Type | Name | Content |
| --- | --- | --- |
| CNAME | `soduku.net` | `soduku.pages.dev` |
| CNAME | `www` | `soduku.pages.dev` |

Pretty URLs (`/printable`) are Cloudflare Pages’ default for `printable.html`. Do **not** add `_redirects` rewrites of `/printable` → `/printable.html` — that 308-loops.

## Google AdSense

| | |
| --- | --- |
| Publisher ID | `ca-pub-6869218428296242` |
| ads.txt | `google.com, pub-6869218428296242, DIRECT, f08c47fec0942fa0` |
| Meta (every page) | `<meta name="google-adsense-account" content="ca-pub-6869218428296242">` |
| Script (every `<head>`) | `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6869218428296242` |
| Config | `js/ads-config.js` |
| Slot IDs | empty — Auto ads until Display units are created |

Classic frames (hidden until `.is-live`, i.e. until a slot ID is set):

| `data-ad` | Intended size | Where |
| --- | --- | --- |
| `leaderboard` | 728×90 | Above the board |
| `sidebar` | 300×250 | Right rail |
| `footer` | 728×90 | Below the game |
| `mobile` | 300×250 | Under the keypad on phones |

To pin those boxes: create four **Display** units in AdSense, paste IDs into `SLOTS` in `js/ads-config.js`, deploy.

**Site status (as of 2026-08-28):** ownership verified via meta tag. **Request review** must be clicked in AdSense; ads will not fill until the site is **Ready**. Empty “Advertisement” labels are hidden on purpose until then.

**CMP (EEA / UK / Switzerland only):** use Google’s certified CMP (Funding Choices) with **3 choices** (Consent, Do not consent, Manage options), apply to this site and future sites. US / Canada / Hong Kong do **not** see that banner. No extra snippet — the existing `adsbygoogle.js` serves it after you publish the message in AdSense → Privacy & messaging.

In Auto ads, turn **off** overlays, anchors, and vignettes.

Do not click your own ads.

## Google Search Console

Not verified yet. After adding the URL-prefix property `https://soduku.net`:

1. HTML-tag verification — paste `google-site-verification` content into `index.html` (or DNS TXT on the zone).
2. Sitemaps → add `https://soduku.net/sitemap.xml`.

## SEO already live

- Canonicals on pretty URLs; www → apex 301
- `og.png` 1200×630
- JSON-LD WebSite / WebApplication / FAQPage
- Privacy policy at `/privacy` (required for AdSense review)

## App notes

- `localStorage` key: `nines-sudoku-v1` (progress, settings, stats). Never sent to a server.
- Daily puzzle is seeded by local calendar date (Medium). Printable daily set is Easy–Master, same date seed.
- Contact on the privacy page: `tim@timli.net`

## Keyboard

| Key | Action |
| --- | --- |
| `1–9` | Fill (or pencil in notes mode) |
| `N` | Notes |
| `H` | Hint |
| `U` / `Ctrl+Z` | Undo |
| `Delete` / `Backspace` | Erase |
| Arrows | Move |
| `Esc` | Pause / close modal |

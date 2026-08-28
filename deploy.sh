#!/usr/bin/env bash
# Deploy the static Sudoku app to Cloudflare Pages (soduku.net).
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")"

PROJECT="${PROJECT:-soduku}"
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-eb9f6b365e71b1efe8f7c7f5ac00ad30}"
export CLOUDFLARE_ACCOUNT_ID="$ACCOUNT_ID"

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

cp index.html printable.html solver.html how-to-play.html favicon.svg og.png apple-touch-icon.png \
  robots.txt sitemap.xml _headers _redirects "$STAGE/"
cp -r css js "$STAGE/"

# ads.txt is required by AdSense once a publisher ID exists.
python3 - << 'PY'
from pathlib import Path
import re
text = Path("js/ads-config.js").read_text()
m = re.search(r'ADSENSE_CLIENT\s*=\s*"(ca-pub-\d+)"', text)
if m:
    pub = m.group(1).removeprefix("ca-")
    Path("ads.txt").write_text(
        f"google.com, {pub}, DIRECT, f08c47fec0942fa0\n",
        encoding="utf-8",
    )
    print(f"Wrote ads.txt for {m.group(1)}")
PY
if [ -f ads.txt ]; then
  cp ads.txt "$STAGE/"
fi

echo "Deploying $PROJECT from staged assets..."
wrangler pages deploy "$STAGE" \
  --project-name "$PROJECT" \
  --branch main \
  --commit-dirty=true \
  --commit-message "deploy $(git rev-parse --short HEAD)"

echo "Live: https://soduku.net  (also https://${PROJECT}.pages.dev)"

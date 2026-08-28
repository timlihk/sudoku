#!/usr/bin/env bash
# Deploy the static Sudoku app to Cloudflare Pages (soduku.net).
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")"

PROJECT="${PROJECT:-soduku}"
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-eb9f6b365e71b1efe8f7c7f5ac00ad30}"
export CLOUDFLARE_ACCOUNT_ID="$ACCOUNT_ID"

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

cp index.html printable.html solver.html how-to-play.html privacy.html favicon.svg og.png apple-touch-icon.png \
  robots.txt sitemap.xml ads.txt _headers _redirects "$STAGE/"
cp -r css js "$STAGE/"

echo "Deploying $PROJECT from staged assets..."
wrangler pages deploy "$STAGE" \
  --project-name "$PROJECT" \
  --branch main \
  --commit-dirty=true \
  --commit-message "deploy $(git rev-parse --short HEAD)"

echo "Live: https://soduku.net  (also https://${PROJECT}.pages.dev)"

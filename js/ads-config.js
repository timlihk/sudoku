/**
 * Google AdSense — display units only (no Auto ads, no overlays, no anchors).
 *
 * 1. Apply at https://www.google.com/adsense with site soduku.net
 * 2. After approval, paste ca-pub-… into CLIENT
 * 3. Create four Display ad units and paste the slot numbers:
 *      leaderboard  — 728×90
 *      sidebar      — 300×250
 *      footer       — 728×90
 *      mobile       — 300×250
 * 4. Redeploy. ads.txt is written from CLIENT by deploy.sh
 */
export const ADSENSE_CLIENT = "";

export const SLOTS = {
  leaderboard: "",
  sidebar: "",
  footer: "",
  mobile: "",
};

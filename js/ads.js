import { ADSENSE_CLIENT, SLOTS } from "./ads-config.js";

const FORMAT = {
  leaderboard: {
    format: "horizontal",
    style: "display:block;width:100%;min-height:90px",
  },
  sidebar: {
    format: "rectangle",
    style: "display:block;width:100%;min-height:250px",
  },
  footer: {
    format: "horizontal",
    style: "display:block;width:100%;min-height:90px",
  },
  mobile: {
    format: "rectangle",
    style: "display:block;width:100%;min-height:250px",
  },
};

function ready() {
  return ADSENSE_CLIENT && /^ca-pub-\d+$/.test(ADSENSE_CLIENT);
}

function boot() {
  if (!ready()) return;

  if (!document.querySelector('meta[name="google-adsense-account"]')) {
    const meta = document.createElement("meta");
    meta.name = "google-adsense-account";
    meta.content = ADSENSE_CLIENT;
    document.head.appendChild(meta);
  }

  const existing = document.querySelector('script[src*="pagead2.googlesyndication.com"]');
  if (existing) {
    if (window.adsbygoogle) fill();
    else existing.addEventListener("load", fill);
    return;
  }
  const script = document.createElement("script");
  script.async = true;
  script.dataset.adsense = "1";
  script.crossOrigin = "anonymous";
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ADSENSE_CLIENT)}`;
  script.addEventListener("load", fill);
  document.head.appendChild(script);
}

function fill() {
  window.adsbygoogle = window.adsbygoogle || [];
  document.querySelectorAll(".ad-frame[data-ad]").forEach((frame) => {
    if (frame.querySelector("ins.adsbygoogle")) return;
    const key = frame.getAttribute("data-ad");
    const slot = SLOTS[key];
    if (!slot) return;
    const spec = FORMAT[key] || FORMAT.leaderboard;
    const ins = document.createElement("ins");
    ins.className = "adsbygoogle";
    ins.style.cssText = spec.style;
    ins.setAttribute("data-ad-client", ADSENSE_CLIENT);
    ins.setAttribute("data-ad-slot", slot);
    ins.setAttribute("data-ad-format", spec.format);
    ins.setAttribute("data-full-width-responsive", "true");
    frame.appendChild(ins);
    frame.closest(".ad-unit")?.classList.add("is-live");
    try {
      window.adsbygoogle.push({});
    } catch {
      /* blocked or not ready */
    }
  });
}

boot();

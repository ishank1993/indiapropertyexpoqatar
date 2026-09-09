// Cross-page marketing attribution capture.
//
// Persists first-touch (the very first page + campaign params a visitor
// arrived on, in this browser) and last-touch (the most recent page +
// campaign params seen) in localStorage, so attribution survives the
// visitor browsing from an ad-tagged landing page to whatever page they
// actually submit the RSVP form from — where window.location.href alone
// would no longer carry the original utm_source/gclid/etc.

const STORAGE_KEY = "nri_attribution_v1";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;
const CLICK_ID_KEYS = ["gclid", "fbclid"] as const;
type TrackedParam = (typeof UTM_KEYS)[number] | (typeof CLICK_ID_KEYS)[number];

interface Touch {
  url: string;
  referrer: string;
  timestamp: string;
  params: Partial<Record<TrackedParam, string>>;
}

interface AttributionRecord {
  first_touch: Touch;
  last_touch: Touch;
}

function readTrackedParams(search: string): Partial<Record<TrackedParam, string>> {
  const params = new URLSearchParams(search);
  const out: Partial<Record<TrackedParam, string>> = {};
  for (const key of [...UTM_KEYS, ...CLICK_ID_KEYS]) {
    const value = params.get(key);
    if (value) out[key] = value;
  }
  return out;
}

function captureTouch(): Touch {
  return {
    url: window.location.href,
    referrer: document.referrer || "",
    timestamp: new Date().toISOString(),
    params: readTrackedParams(window.location.search),
  };
}

function load(): AttributionRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AttributionRecord) : null;
  } catch {
    return null;
  }
}

function save(record: AttributionRecord) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // private browsing / storage disabled — attribution just won't persist
    // across pages for this visitor, not fatal.
  }
}

// Call on every page view (including in-app route changes). Records
// first-touch only once ever per browser; last-touch is refreshed each
// call, carrying forward any previously-seen utm/click-id params that
// aren't present on the current page's URL.
export function recordPageView(): void {
  if (typeof window === "undefined") return;

  const existing = load();
  const current = captureTouch();

  const last_touch: Touch = {
    url: current.url,
    referrer: current.referrer,
    timestamp: current.timestamp,
    params: { ...existing?.last_touch?.params, ...current.params },
  };

  save({
    first_touch: existing?.first_touch || current,
    last_touch,
  });
}

export interface AttributionSnapshot {
  landing_page_url: string;
  first_touch_referrer: string;
  current_page_url: string;
  current_referrer: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
  gclid: string;
  fbclid: string;
}

// Call at submission time for the full attribution snapshot to send
// alongside a lead.
export function getAttributionSnapshot(): AttributionSnapshot {
  const record = load();
  const current = captureTouch();
  const params = { ...record?.last_touch?.params, ...current.params };

  return {
    landing_page_url: record?.first_touch?.url || current.url,
    first_touch_referrer: record?.first_touch?.referrer || current.referrer,
    current_page_url: current.url,
    current_referrer: current.referrer,
    utm_source: params.utm_source || "",
    utm_medium: params.utm_medium || "",
    utm_campaign: params.utm_campaign || "",
    utm_term: params.utm_term || "",
    utm_content: params.utm_content || "",
    gclid: params.gclid || "",
    fbclid: params.fbclid || "",
  };
}

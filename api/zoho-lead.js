// Forwards a successful registration into our Qatar "Register Your Interest"
// Zoho Form, without ever affecting the visitor's own registration flow.
//
// Zoho doesn't publish an API for this — this posts straight to the same
// undocumented endpoint their hosted form's own JS calls
// (<form-perma-url>/records). Reverse-engineered by watching the real
// network request a live submission makes: no API key needed (it's the
// same unauthenticated endpoint the public iframe uses), but the exact
// field names below are internal to this specific Zoho form and were
// confirmed by testing, not guessed from the DOM. If Zoho changes this
// form (adds/renames/reorders fields), this silently breaks — worth a spot
// check in Zoho after a few real registrations.

const ZOHO_RECORDS_URL =
  "https://forms.zohopublic.in/nriniveshrealstate1/form/RegisterYourInterest/formperma/Lj0f0TmIyo5zKFxOKwOMYn--en55raCy4hkjJk3961w/records";

// Zoho's "Preferred City of Interest" dropdown is REQUIRED and only accepts
// these exact labels. Our own field is optional and also offers "Still
// Exploring" / "Multiple Cities", which Zoho has no equivalent for. Keys
// match the slugs RegistrationModal.tsx generates from its indianCities list
// (city.toLowerCase().replace(/\s+/g, "-")).
const ZOHO_CITY_LABELS = {
  mumbai: "Mumbai",
  bangalore: "Bangalore",
  "delhi-ncr": "Delhi NCR",
  pune: "Pune",
  hyderabad: "Hyderabad",
  chennai: "Chennai",
  goa: "Goa",
  ahmedabad: "Ahmedabad",
  kolkata: "Kolkata",
  jaipur: "Jaipur",
  chandigarh: "Chandigarh",
  kochi: "Kochi",
  indore: "Indore",
  lucknow: "Lucknow",
  coimbatore: "Coimbatore",
};

// Used whenever preferred_city is blank, "exploring", "multiple", or
// anything else outside Zoho's fixed list — Zoho requires a value here even
// though our own form intentionally leaves the field optional. This is a
// placeholder to satisfy that required field, not a real signal; change
// this single constant if a different default city is preferred, or flag
// to Zoho that the Dropdown field should be made optional/extended.
const ZOHO_FALLBACK_CITY = "Mumbai";

// Zoho's Name field is a composite of two independently-required
// sub-fields. Our form only collects one "Full Name" input, so split it:
// first word -> first name, remainder -> last name. A single-word name
// reuses itself as the last name (confirmed Zoho accepts this — it only
// rejects an empty/whitespace-only value).
function splitName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "Guest", last: "Guest" };
  if (parts.length === 1) return { first: parts[0], last: parts[0] };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false });
    return;
  }

  try {
    const { product_interest, full_name, phone, email, preferred_city, page_url } = req.body || {};

    if (!full_name || !phone || !email) {
      console.error("Zoho lead relay: skipped, missing required field(s)", req.body);
    } else {
      const { first, last } = splitName(full_name);
      const cityLabel = ZOHO_CITY_LABELS[preferred_city] || ZOHO_FALLBACK_CITY;

      const payload = {
        Radio: product_interest || "",
        Name: { Name_First: first, Name_Last: last },
        PhoneNumber: phone,
        Email: email,
        Dropdown: cityLabel,
        REFERRER_NAME: page_url || "",
        ADDED_LANGUAGE: "en",
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      try {
        const response = await fetch(ZOHO_RECORDS_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/zoho.forms-v1+json",
            "X-Requested-With": "XMLHttpRequest",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          console.error("Zoho lead relay: Zoho rejected the lead", response.status, text);
        }
      } finally {
        clearTimeout(timeout);
      }
    }
  } catch (error) {
    // Never let a Zoho-side failure surface to the caller — this relay is
    // purely best-effort and must not affect the visitor's registration.
    console.error("Zoho lead relay error:", error);
  }

  res.status(200).json({ ok: true });
}

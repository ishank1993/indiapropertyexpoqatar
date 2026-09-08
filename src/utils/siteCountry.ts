// Universal NRI NIVESH RSVP form: country is captured automatically from the
// domain the form is submitted on, never typed by the user.
//
// Every NRI NIVESH country website is a clone of this same codebase. When you
// clone this repo for a new country, only DEFAULT_COUNTRY (and, if the new
// domain isn't obviously named, an entry in HOSTNAME_COUNTRY_MAP) needs to
// change — the rest of the form is identical everywhere.

const DEFAULT_COUNTRY = "Qatar";

// Keyed by a lowercase substring of location.hostname. Add an entry here only
// if a domain's country can't be inferred from its name.
const HOSTNAME_COUNTRY_MAP: Record<string, string> = {
  qatar: "Qatar",
  singapore: "Singapore",
  hongkong: "Hong Kong",
  "hong-kong": "Hong Kong",
  abudhabi: "UAE",
  "abu-dhabi": "UAE",
  dubai: "UAE",
  uae: "UAE",
};

export function getSiteCountry(): string {
  if (typeof window === "undefined" || !window.location?.hostname) {
    return DEFAULT_COUNTRY;
  }

  const hostname = window.location.hostname.toLowerCase();

  for (const [key, country] of Object.entries(HOSTNAME_COUNTRY_MAP)) {
    if (hostname.includes(key)) return country;
  }

  return DEFAULT_COUNTRY;
}

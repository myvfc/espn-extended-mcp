// utils.js

// Map “friendly” sport names to ESPN path segments
const SPORT_MAP = {
  football: "football/college-football",
  "college-football": "football/college-football",
  ncaaf: "football/college-football",

  "mens-college-basketball": "basketball/mens-college-basketball",
  "men's-college-basketball": "basketball/mens-college-basketball",
  ncaam: "basketball/mens-college-basketball",

  "womens-college-basketball": "basketball/womens-college-basketball",
  "women's-college-basketball": "basketball/womens-college-basketball",
  ncaaw: "basketball/womens-college-basketball",

  softball: "softball/college-softball",
  baseball: "baseball/college-baseball",
  soccer: "soccer/college-soccer",
  gymnastics: "gymnastics/college-gymnastics",
  wrestling: "wrestling/college-wrestling"
};

// Minimal team normalization (you can expand this)
const TEAM_SLUG_ALIASES = {
  ou: "oklahoma-sooners",
  "oklahoma": "oklahoma-sooners",
  "oklahoma sooners": "oklahoma-sooners",
  sooners: "oklahoma-sooners"
};

export function normalizeSport(input) {
  if (!input) return null;
  const key = String(input).toLowerCase().trim();
  if (SPORT_MAP[key]) return SPORT_MAP[key];
  return key; // fallback – assume caller already gave ESPN-style path
}

export function normalizeTeamSlug(input) {
  if (!input) return null;
  const key = String(input).toLowerCase().trim();
  if (TEAM_SLUG_ALIASES[key]) return TEAM_SLUG_ALIASES[key];
  // generic slugify
  return key
    .replace(/sooners$/i, "sooners") // example tweak; expand as needed
    .replace(/[’'"]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildQueryString(params = {}) {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (!entries.length) return "";
  const qs = new URLSearchParams();
  for (const [k, v] of entries) {
    qs.append(k, String(v));
  }
  return `?${qs.toString()}`;
}

export function formatTeamSummary(team, extra = {}) {
  if (!team) return "No team data available.";

  const lines = [];
  const {
    displayName,
    shortDisplayName,
    abbreviation,
    nickname,
    location,
    record,
    rank,
    conference,
    coach
  } = {
    displayName: team.displayName || team.name,
    shortDisplayName: team.shortDisplayName,
    abbreviation: team.abbreviation,
    nickname: team.nickname,
    location: team.location,
    record: extra.record,
    rank: extra.rank,
    conference: extra.conference,
    coach: extra.coach
  };

  lines.push(`**${displayName || "Unknown Team"}**`);
  if (nickname || shortDisplayName) {
    lines.push(`Nickname: ${nickname || shortDisplayName}`);
  }
  if (abbreviation) {
    lines.push(`Abbrev: ${abbreviation}`);
  }
  if (location) {
    lines.push(`Location: ${location}`);
  }
  if (conference) {
    lines.push(`Conference: ${conference}`);
  }
  if (rank) {
    lines.push(`Rank: ${rank}`);
  }
  if (record) {
    lines.push(`Record: ${record}`);
  }
  if (coach) {
    lines.push(`Head Coach: ${coach}`);
  }

  return lines.join("\n");
}

export function formatAthleteSummary(athlete, extra = {}) {
  if (!athlete) return "No athlete data available.";

  const lines = [];
  const {
    fullName,
    displayName,
    position,
    team,
    number,
    height,
    weight,
    age,
    classYear,
    hometown
  } = {
    fullName: athlete.fullName || athlete.name,
    displayName: athlete.displayName,
    position: extra.position || athlete.position?.abbreviation,
    team: extra.team || athlete.team?.displayName,
    number: extra.number || athlete.jersey,
    height: extra.height || athlete.displayHeight,
    weight: extra.weight || athlete.displayWeight,
    age: extra.age || athlete.age,
    classYear: extra.classYear || athlete.class,
    hometown: extra.hometown || athlete.hometown
  };

  lines.push(`**${fullName || displayName || "Unknown Athlete"}**`);
  if (team) lines.push(`Team: ${team}`);
  if (position || number) {
    lines.push(`Pos / # : ${position || "N/A"} / ${number || "N/A"}`);
  }
  if (height || weight) {
    lines.push(`Ht / Wt : ${height || "N/A"} / ${weight || "N/A"}`);
  }
  if (classYear) lines.push(`Class: ${classYear}`);
  if (age) lines.push(`Age: ${age}`);
  if (hometown) lines.push(`Hometown: ${hometown}`);

  return lines.join("\n");
}

export function truncateJson(obj, maxLength = 4000) {
  const str = JSON.stringify(obj, null, 2);
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "\n\n... (truncated)";
}

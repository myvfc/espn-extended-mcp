// utils.js
const SPORT_MAP = {
  football: "football/college-football",
  "college-football": "football/college-football",
  ncaaf: "football/college-football",
  "mens-college-basketball": "basketball/mens-college-basketball",
  ncaam: "basketball/mens-college-basketball",
  "womens-college-basketball": "basketball/womens-college-basketball",
  ncaaw: "basketball/womens-college-basketball",
  softball: "softball/college-softball",
  baseball: "baseball/college-baseball",
  soccer: "soccer/college-soccer",
  gymnastics: "gymnastics/college-gymnastics",
  wrestling: "wrestling/college-wrestling"
};

const TEAM_SLUG_ALIASES = {
  ou: "201",
  sooners: "201",
  oklahoma: "201",
  "oklahoma sooners": "201"
};

export function normalizeSport(sport) {
  if (!sport) return null;
  const key = sport.toLowerCase().trim();
  return SPORT_MAP[key] || key;
}

export function normalizeTeamSlug(name) {
  if (!name) return null;
  const key = name.toLowerCase().trim();
  if (TEAM_SLUG_ALIASES[key]) return TEAM_SLUG_ALIASES[key];
  return key
    .replace(/[''"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildQueryString(params = {}) {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (!entries.length) return "";
  const qs = new URLSearchParams();
  for (const [k, v] of entries) qs.append(k, v);
  return `?${qs.toString()}`;
}

export function truncateJson(obj, max = 4000) {
  const str = JSON.stringify(obj, null, 2);
  return str.length <= max ? str : str.slice(0, max) + "\n\n... (truncated)";
}

// Summaries
export function formatTeamSummary(team, extra = {}) {
  const lines = [];
  const name = team.displayName || team.name || "Unknown Team";
  lines.push(`**${name}**`);
  if (extra.conference) lines.push(`Conference: ${extra.conference}`);
  if (extra.record) lines.push(`Record: ${extra.record}`);
  if (extra.rank) lines.push(`Rank: ${extra.rank}`);
  if (extra.coach) lines.push(`Head Coach: ${extra.coach}`);
  return lines.join("\n");
}

export function formatAthleteSummary(player) {
  const lines = [];
  const name = player.fullName || player.displayName || "Unknown Athlete";
  lines.push(`**${name}**`);
  if (player.team?.displayName) lines.push(`Team: ${player.team.displayName}`);
  if (player.jersey) lines.push(`Jersey: #${player.jersey}`);
  if (player.position?.abbreviation)
    lines.push(`Position: ${player.position.abbreviation}`);
  return lines.join("\n");
}



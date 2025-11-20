// espn.js
import fetch from "node-fetch";
import { cache } from "./cache.js";
import {
  normalizeSport,
  normalizeTeamSlug,
  buildQueryString,
  formatTeamSummary,
  formatAthleteSummary
} from "./utils.js";

const ESPN_SITE_BASE = "https://site.api.espn.com/apis/site/v2/sports";

/**
 * Generic ESPN fetch with caching & basic error handling.
 */
async function fetchEspnJson(url, ttlMs) {
  const cached = cache.get(url);
  if (cached) return cached;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "ESPN-Extended-MCP/1.0"
    }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`ESPN request failed: ${res.status} ${res.statusText} – ${text}`);
  }

  const json = await res.json();
  cache.set(url, json, ttlMs);
  return json;
}

function buildTeamBaseUrl(sportPath, teamIdOrSlug) {
  return `${ESPN_SITE_BASE}/${sportPath}/teams/${teamIdOrSlug}`;
}

// ---------- TEAM-LEVEL HELPERS ----------

export async function getTeamInfo({ sport, teamId, teamSlug, ttlMs }) {
  const sportPath = normalizeSport(sport);
  if (!sportPath) throw new Error("sport is required.");
  const teamKey = teamId || normalizeTeamSlug(teamSlug);
  if (!teamKey) throw new Error("teamId or teamSlug is required.");

  const url = buildTeamBaseUrl(sportPath, teamKey);
  const data = await fetchEspnJson(url, ttlMs);

  // Try to pull useful summary bits
  const team = data.team || data;
  const record =
    team.record?.items?.[0]?.summary ||
    team.record?.items?.[0]?.stats?.find((s) => s.name === "overallRecord")?.displayValue;

  const rank =
    team.rank ||
    team.currentRank ||
    team.record?.items?.[0]?.stats?.find((s) => s.name === "rank")?.displayValue;

  const conference =
    team.conference?.name ||
    team.groups?.[0]?.name ||
    team.groups?.[0]?.shortName;

  const coach =
    team.coaches?.[0]?.displayName || team.coaches?.[0]?.fullName;

  const summary = formatTeamSummary(team, { record, rank, conference, coach });

  return { summary, raw: data };
}

export async function getTeamRoster({ sport, teamId, teamSlug, ttlMs }) {
  const sportPath = normalizeSport(sport);
  const teamKey = teamId || normalizeTeamSlug(teamSlug);
  if (!sportPath || !teamKey) {
    throw new Error("sport and teamId/teamSlug are required.");
  }

  const url = `${buildTeamBaseUrl(sportPath, teamKey)}/roster`;
  const data = await fetchEspnJson(url, ttlMs);

  const athletes = data.athletes || data.items || [];
  const topSample = athletes.slice(0, 10).map((ath) => {
    const name = ath.fullName || ath.displayName || ath.name;
    const pos = ath.position?.abbreviation || ath.position?.name;
    const num = ath.jersey;
    const year = ath.class || ath.experience?.displayValue;
    return `${name} – #${num ?? "?"} ${pos ?? ""} (${year ?? "N/A"})`;
  });

  const summary = [
    `Roster sample (first ${topSample.length} players):`,
    ...topSample
  ].join("\n");

  return { summary, raw: data };
}

export async function getTeamDepthChart({ sport, teamId, teamSlug, ttlMs }) {
  const sportPath = normalizeSport(sport);
  const teamKey = teamId || normalizeTeamSlug(teamSlug);
  if (!sportPath || !teamKey) {
    throw new Error("sport and teamId/teamSlug are required.");
  }

  const url = `${buildTeamBaseUrl(sportPath, teamKey)}/depthchart`;
  const data = await fetchEspnJson(url, ttlMs);

  const positions = data.positions || [];
  const lines = [];
  for (const pos of positions.slice(0, 10)) {
    const label = pos.name || pos.abbreviation;
    const starters = (pos.athletes || []).slice(0, 3).map((ath) => {
      const a = ath.athlete || ath;
      return a.displayName || a.fullName || a.name;
    });
    lines.push(`${label}: ${starters.join(", ")}`);
  }

  const summary = lines.length
    ? "Depth chart (sample):\n" + lines.join("\n")
    : "No depth chart data available.";

  return { summary, raw: data };
}

export async function getTeamInjuries({ sport, teamId, teamSlug, ttlMs }) {
  const sportPath = normalizeSport(sport);
  const teamKey = teamId || normalizeTeamSlug(teamSlug);
  if (!sportPath || !teamKey) {
    throw new Error("sport and teamId/teamSlug are required.");
  }

  const url = `${buildTeamBaseUrl(sportPath, teamKey)}/injuries`;
  const data = await fetchEspnJson(url, ttlMs);

  const items = data.injuries || data.items || [];
  if (!items.length) {
    return { summary: "No listed injuries for this team.", raw: data };
  }

  const lines = items.slice(0, 10).map((item) => {
    const athlete = item.athlete || {};
    const name = athlete.displayName || athlete.fullName || athlete.name;
    const pos = athlete.position?.abbreviation || "";
    const status = item.status || item.type || "N/A";
    const detail = item.details || item.comment || "";
    return `${name} (${pos}) – ${status}${detail ? ` – ${detail}` : ""}`;
  });

  const summary = "Injury report (sample):\n" + lines.join("\n");
  return { summary, raw: data };
}

export async function getTeamNews({ sport, teamId, teamSlug, ttlMs }) {
  const sportPath = normalizeSport(sport);
  const teamKey = teamId || normalizeTeamSlug(teamSlug);
  if (!sportPath || !teamKey) {
    throw new Error("sport and teamId/teamSlug are required.");
  }

  const url = `${buildTeamBaseUrl(sportPath, teamKey)}/news`;
  const data = await fetchEspnJson(url, ttlMs);

  const articles = data.articles || data.headlines || data.stories || [];
  const lines = articles.slice(0, 5).map((a) => {
    return `• ${a.headline || a.title}${a.description ? ` – ${a.description}` : ""}`;
  });

  const summary = lines.length
    ? "Recent team news:\n" + lines.join("\n")
    : "No recent news items.";
  return { summary, raw: data };
}

export async function getTeamStandings({ sport, groupId, ttlMs }) {
  const sportPath = normalizeSport(sport);
  if (!sportPath) throw new Error("sport is required.");

  const url = `${ESPN_SITE_BASE}/${sportPath}/standings${buildQueryString({
    group: groupId
  })}`;

  const data = await fetchEspnJson(url, ttlMs);

  const children = data.children || data.standings?.groups || [];
  const lines = [];

  for (const group of children.slice(0, 3)) {
    const groupName = group.name || group.description;
    lines.push(`\n**${groupName}**`);
    const teams = group.standings?.entries || group.entries || [];
    for (const entry of teams.slice(0, 5)) {
      const team = entry.team || {};
      const name = team.displayName || team.shortDisplayName || team.name;
      const record =
        entry.stats?.find((s) => s.name === "overallRecord")?.displayValue ||
        entry.records?.overall?.summary;
      lines.push(`- ${name} (${record || "N/A"})`);
    }
  }

  const summary = lines.length
    ? "Standings snapshot:" + lines.join("\n")
    : "No standings data available.";
  return { summary, raw: data };
}

// ---------- LEAGUE / NEWS HELPERS ----------

export async function getLeagueNews({ sport, ttlMs }) {
  const sportPath = normalizeSport(sport);
  if (!sportPath) throw new Error("sport is required.");

  const url = `${ESPN_SITE_BASE}/${sportPath}/news`;
  const data = await fetchEspnJson(url, ttlMs);

  const articles = data.articles || data.headlines || data.stories || [];
  const lines = articles.slice(0, 5).map((a) => {
    return `• ${a.headline || a.title}${a.description ? ` – ${a.description}` : ""}`;
  });

  const summary = lines.length
    ? "League headlines:\n" + lines.join("\n")
    : "No league headlines found.";
  return { summary, raw: data };
}

export async function getConferenceInfo({ sport, groupId, ttlMs }) {
  const sportPath = normalizeSport(sport);
  if (!sportPath || !groupId) {
    throw new Error("sport and groupId are required (groupId is ESPN conference/group id).");
  }

  const url = `${ESPN_SITE_BASE}/${sportPath}/standings${buildQueryString({
    group: groupId
  })}`;
  const data = await fetchEspnJson(url, ttlMs);

  const group =
    data.children?.[0] || data.standings?.groups?.[0] || data.groups?.[0] || null;
  if (!group) {
    return { summary: "No conference/group info found.", raw: data };
  }

  const name = group.name || group.description;
  const children = group.children || group.standings?.groups || [];
  const summaryLines = [`**${name || "Conference"}**`];

  const teams = group.standings?.entries || group.entries || [];
  for (const entry of teams.slice(0, 10)) {
    const team = entry.team || {};
    const tName = team.displayName || team.shortDisplayName || team.name;
    const record =
      entry.stats?.find((s) => s.name === "overallRecord")?.displayValue ||
      entry.records?.overall?.summary;
    summaryLines.push(`- ${tName} (${record || "N/A"})`);
  }

  return { summary: summaryLines.join("\n"), raw: data };
}

// ---------- ATHLETE-LEVEL HELPERS ----------

export async function getAthleteBio({ sport, leagueHint, athleteId, ttlMs }) {
  if (!athleteId) throw new Error("athleteId is required.");

  const sportPath = normalizeSport(sport || leagueHint || "football");
  const url = `${ESPN_SITE_BASE}/${sportPath}/athletes/${athleteId}`;
  const data = await fetchEspnJson(url, ttlMs);

  const summary = formatAthleteSummary(data, {});
  return { summary, raw: data };
}

export async function getAthleteStats({ sport, leagueHint, athleteId, ttlMs }) {
  if (!athleteId) throw new Error("athleteId is required.");

  const sportPath = normalizeSport(sport || leagueHint || "football");
  const url = `${ESPN_SITE_BASE}/${sportPath}/athletes/${athleteId}/stats`;
  const data = await fetchEspnJson(url, ttlMs);

  const splits = data.splits || data.stats || [];
  const lines = [];
  for (const split of splits.slice(0, 3)) {
    const header = split.displayName || split.name;
    lines.push(`\n**${header}**`);
    const stats = split.stats || split.categories || [];
    for (const s of stats.slice(0, 6)) {
      const label = s.displayName || s.name;
      const value = s.displayValue || s.value;
      lines.push(`- ${label}: ${value}`);
    }
  }

  const summary = lines.length
    ? "Key athlete stats (sample):\n" + lines.join("\n")
    : "No stats available.";
  return { summary, raw: data };
}

export async function getAthleteNews({ sport, leagueHint, athleteId, ttlMs }) {
  if (!athleteId) throw new Error("athleteId is required.");

  const sportPath = normalizeSport(sport || leagueHint || "football");
  const url = `${ESPN_SITE_BASE}/${sportPath}/athletes/${athleteId}/news`;
  const data = await fetchEspnJson(url, ttlMs);

  const articles = data.articles || data.headlines || data.stories || [];
  const lines = articles.slice(0, 5).map((a) => {
    return `• ${a.headline || a.title}${a.description ? ` – ${a.description}` : ""}`;
  });

  const summary = lines.length
    ? "Recent news for this athlete:\n" + lines.join("\n")
    : "No recent athlete-specific headlines.";
  return { summary, raw: data };
}

// ---------- GAME-LEVEL HELPERS ----------

export async function getGameSummary({ sport, gameId, ttlMs }) {
  if (!gameId) throw new Error("gameId is required.");
  const sportPath = normalizeSport(sport);
  if (!sportPath) throw new Error("sport is required.");

  const url = `${ESPN_SITE_BASE}/${sportPath}/summary${buildQueryString({
    event: gameId
  })}`;
  const data = await fetchEspnJson(url, ttlMs);

  const header = data.header || {};
  const comps = header.competitions?.[0] || {};
  const competitors = comps.competitors || [];

  const lines = [];

  for (const comp of competitors) {
    const team = comp.team || {};
    const name = team.displayName || team.shortDisplayName || team.name;
    const score = comp.score;
    const record = comp.records?.[0]?.summary;
    const winner = comp.winner ? " (W)" : "";
    lines.push(`${name}${winner} – ${score} (${record || "N/A"})`);
  }

  const status = header.competitions?.[0]?.status?.type?.description;
  if (status) lines.push(`Status: ${status}`);

  const summary = lines.length
    ? "Game summary:\n" + lines.join("\n")
    : "No game summary available.";
  return { summary, raw: data };
}

export async function getPlayByPlay({ sport, gameId, ttlMs }) {
  if (!gameId) throw new Error("gameId is required.");
  const sportPath = normalizeSport(sport);
  if (!sportPath) throw new Error("sport is required.");

  const url = `${ESPN_SITE_BASE}/${sportPath}/playbyplay${buildQueryString({
    event: gameId
  })}`;
  const data = await fetchEspnJson(url, ttlMs);

  const drives = data.drives?.previous || data.plays || [];
  const lines = [];

  let count = 0;
  for (const drive of drives) {
    if (drive.plays) {
      for (const play of drive.plays) {
        if (count >= 10) break;
        const clock = play.clock?.displayValue || "";
        const text = play.text || play.description || "";
        lines.push(`${clock} – ${text}`);
        count++;
      }
    } else {
      const clock = drive.clock?.displayValue || "";
      const text = drive.text || "";
      if (text) {
        lines.push(`${clock} – ${text}`);
        count++;
      }
    }
    if (count >= 10) break;
  }

  const summary = lines.length
    ? "Play-by-play snapshot:\n" + lines.join("\n")
    : "No play-by-play data found.";
  return { summary, raw: data };
}

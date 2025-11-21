import fetch from "node-fetch";
import { cache } from "./cache.js";
import {
  normalizeSport,
  normalizeTeamSlug,
  buildQueryString,
  formatTeamSummary,
  formatAthleteSummary
} from "./utils.js";

const BASE = "https://site.api.espn.com/apis/site/v2/sports";

async function getJson(url, ttl = 300000) {
  const cached = cache.get(url);
  if (cached) return cached;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`ESPN error ${res.status}`);
  const data = await res.json();

  cache.set(url, data, ttl);
  return data;
}

function teamBase(sport, teamKey) {
  return `${BASE}/${sport}/teams/${teamKey}`;
}

// TEAM INFO
export async function getTeamInfo({ sport, teamId, teamSlug, ttlMs }) {
  const sp = normalizeSport(sport);
  const tk = teamId || normalizeTeamSlug(teamSlug);

  const url = teamBase(sp, tk);
  const data = await getJson(url, ttlMs);

  const team = data.team || data;
  const record =
    team.record?.items?.[0]?.summary ||
    team.record?.items?.[0]?.stats?.find((s) => s.name === "overallRecord")?.displayValue;

  const rank = team.rank || team.currentRank;
  const conference = team.conference?.name || team.groups?.[0]?.name;
  const coach = team.coaches?.[0]?.displayName;

  return { summary: formatTeamSummary(team, { record, rank, conference, coach }), raw: data };
}

export async function getTeamRoster({ sport, teamId, teamSlug, ttlMs }) {
  const sp = normalizeSport(sport);
  const tk = teamId || normalizeTeamSlug(teamSlug);
  const url = teamBase(sp, tk) + "/roster";

  const data = await getJson(url, ttlMs);
  
  // Athletes are grouped by position (offense, defense, etc.)
  const allAthletes = [];
  if (data.athletes && Array.isArray(data.athletes)) {
    for (const group of data.athletes) {
      if (group.items && Array.isArray(group.items)) {
        allAthletes.push(...group.items);
      }
    }
  }
  
  const players = allAthletes.slice(0, 15).map((p) => {
    const jersey = p.jersey ? `#${p.jersey}` : '';
    const pos = p.position?.abbreviation || p.position?.name || '';
    return `${jersey} ${p.displayName} - ${pos}`.trim();
  });
  
  return { 
    summary: `Roster (${allAthletes.length} players):\n` + players.join("\n"), 
    raw: data 
  };
}

export async function getTeamDepthChart({ sport, teamId, teamSlug, ttlMs }) {
  const sp = normalizeSport(sport);
  const tk = teamId || normalizeTeamSlug(teamSlug);
  const url = teamBase(sp, tk) + "/depthchart";

  const data = await getJson(url, ttlMs);
  const lines = (data.positions || [])
    .slice(0, 5)
    .map((p) => `${p.name}: ${p.athletes?.[0]?.athlete?.displayName || "N/A"}`);

  return { summary: "Depth chart sample:\n" + lines.join("\n"), raw: data };
}

export async function getTeamInjuries({ sport, teamId, teamSlug, ttlMs }) {
  const sp = normalizeSport(sport);
  const tk = teamId || normalizeTeamSlug(teamSlug);
  const url = teamBase(sp, tk) + "/injuries";

  const data = await getJson(url, ttlMs);
  const items = data.injuries || [];

  if (!items.length) return { summary: "No injuries listed.", raw: data };

  const lines = items.slice(0, 5).map((i) => {
    const ath = i.athlete || {};
    return `${ath.displayName || "Unknown"} – ${i.status || "Unknown status"}`;
  });

  return { summary: "Injuries:\n" + lines.join("\n"), raw: data };
}

export async function getTeamNews({ sport, teamId, teamSlug, ttlMs }) {
  const sp = normalizeSport(sport);
  const tk = teamId || normalizeTeamSlug(teamSlug);
  const url = teamBase(sp, tk) + "/news";

  const data = await getJson(url, ttlMs);
  const stories = data.articles || [];

  const lines = stories.slice(0, 5).map((s) => `• ${s.headline}`);
  return { summary: "Recent News:\n" + lines.join("\n"), raw: data };
}

export async function getTeamStandings({ sport, groupId, ttlMs }) {
  const sp = normalizeSport(sport);
  const url = `${BASE}/${sp}/standings${buildQueryString({ group: groupId })}`;

  const data = await getJson(url, ttlMs);
  const groups = data.children || [];

  const lines = [];
  for (const g of groups.slice(0, 2)) {
    lines.push(`\n**${g.name}**`);
    for (const t of (g.standings?.entries || []).slice(0, 5)) {
      lines.push(`- ${t.team?.displayName}`);
    }
  }

  return { summary: "Standings:\n" + lines.join("\n"), raw: data };
}

export async function getLeagueNews({ sport, ttlMs }) {
  const sp = normalizeSport(sport);
  const url = `${BASE}/${sp}/news`;

  const data = await getJson(url, ttlMs);
  const lines = (data.articles || []).slice(0, 5).map((s) => `• ${s.headline}`);

  return { summary: "League News:\n" + lines.join("\n"), raw: data };
}

export async function getConferenceInfo({ sport, groupId, ttlMs }) {
  const sp = normalizeSport(sport);
  const url = `${BASE}/${sp}/standings${buildQueryString({ group: groupId })}`;

  const data = await getJson(url, ttlMs);
  const g = data.children?.[0];

  if (!g) return { summary: "No conference data.", raw: data };

  const lines = [`**${g.name}**`];
  for (const t of (g.standings?.entries || []).slice(0, 10))
    lines.push(`- ${t.team?.displayName}`);

  return { summary: lines.join("\n"), raw: data };
}

export async function getAthleteBio({ sport, athleteId, leagueHint, ttlMs }) {
  const sp = normalizeSport(sport || leagueHint || "football");
  const url = `${BASE}/${sp}/athletes/${athleteId}`;

  const data = await getJson(url, ttlMs);
  return { summary: formatAthleteSummary(data), raw: data };
}

export async function getAthleteStats({ sport, athleteId, leagueHint, ttlMs }) {
  const sp = normalizeSport(sport || leagueHint || "football");
  const url = `${BASE}/${sp}/athletes/${athleteId}/stats`;

  const data = await getJson(url, ttlMs);

  const cat = data.splits?.[0]?.stats || [];
  const lines = cat.slice(0, 6).map((s) => `${s.displayName}: ${s.displayValue}`);

  return { summary: "Key Stats:\n" + lines.join("\n"), raw: data };
}

export async function getAthleteNews({ sport, athleteId, leagueHint, ttlMs }) {
  const sp = normalizeSport(sport || leagueHint || "football");
  const url = `${BASE}/${sp}/athletes/${athleteId}/news`;

  const data = await getJson(url, ttlMs);
  const lines = (data.articles || []).slice(0, 5).map((s) => `• ${s.headline}`);

  return { summary: "Athlete News:\n" + lines.join("\n"), raw: data };
}

export async function getGameSummary({ sport, gameId, ttlMs }) {
  const sp = normalizeSport(sport);
  const url = `${BASE}/${sp}/summary${buildQueryString({ event: gameId })}`;

  const data = await getJson(url, ttlMs);
  const comps = data.header?.competitions?.[0]?.competitors || [];

  const lines = comps.map(
    (c) =>
      `${c.team?.displayName} – ${c.score}${c.winner ? " (W)" : ""}`
  );

  return { summary: "Game Summary:\n" + lines.join("\n"), raw: data };
}

export async function getPlayByPlay({ sport, gameId, ttlMs }) {
  const sp = normalizeSport(sport);
  const url = `${BASE}/${sp}/playbyplay${buildQueryString({ event: gameId })}`;

  const data = await getJson(url, ttlMs);

  const plays =
    data.drives?.previous?.flatMap((d) => d.plays || []) || data.plays || [];

  const lines = plays.slice(0, 10).map((p) => `${p.clock?.displayValue}: ${p.text}`);

  return { summary: "Play-by-Play:\n" + lines.join("\n"), raw: data };
}



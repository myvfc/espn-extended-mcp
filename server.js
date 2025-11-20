// server.js
import fs from "fs";
const manifest = JSON.parse(fs.readFileSync("./manifest.json", "utf8"));

import express from "express";
import {
  getTeamInfo,
  getTeamRoster,
  getTeamDepthChart,
  getTeamInjuries,
  getTeamNews,
  getTeamStandings,
  getLeagueNews,
  getConferenceInfo,
  getAthleteBio,
  getAthleteStats,
  getAthleteNews,
  getGameSummary,
  getPlayByPlay
} from "./espn.js";
import { truncateJson } from "./utils.js";


const app = express();
const PORT = process.env.PORT || 3000;
const MCP_API_KEY = process.env.MCP_API_KEY || "";

// ---------- MIDDLEWARE ----------

app.use(express.json({ limit: "1mb" }));

// Simple request logging
app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.path} – auth=${
      req.headers.authorization ? "yes" : "no"
    }`
  );
  next();
});

// Auth middleware – allow /health and /manifest.json without auth
app.use((req, res, next) => {
  if (req.path === "/health" || req.path === "/manifest.json") return next();

  if (!MCP_API_KEY) {
    console.warn("MCP_API_KEY not set – rejecting all authenticated endpoints.");
    return res.status(500).json({ error: "MCP_API_KEY is not configured on the server." });
  }

  const auth = req.headers.authorization || "";
  const [, token] = auth.split(" ");

  if (token !== MCP_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
});

// ---------- HEALTH / MANIFEST ----------

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.get("/manifest.json", (req, res) => {
  res.json(manifest);
});

// ---------- TOOLS REGISTRY ----------

const tools = {
  get_team_info: {
    name: "get_team_info",
    description: "Get high-level information and summary for a team.",
    inputSchema: {
      type: "object",
      properties: {
        sport: {
          type: "string",
          description:
            "Sport or league key (e.g., 'football', 'ncaaf', 'mens-college-basketball', 'softball')."
        },
        teamId: {
          type: "string",
          description: "ESPN team id if known."
        },
        teamSlug: {
          type: "string",
          description:
            "Team slug or name (e.g., 'oklahoma-sooners', 'Oklahoma Sooners', 'OU')."
        },
        raw: {
          type: "boolean",
          description: "If true, include raw/truncated JSON in the response."
        }
      },
      required: ["sport"],
      additionalProperties: false
    },
    handler: async (args) => {
      const { sport, teamId, teamSlug, raw } = args;
      const { summary, raw: data } = await getTeamInfo({
        sport,
        teamId,
        teamSlug,
        ttlMs: 5 * 60 * 1000
      });
      return raw ? `${summary}\n\nRaw:\n${truncateJson(data)}` : summary;
    }
  },

  get_team_roster: {
    name: "get_team_roster",
    description: "Get a snapshot of a team's roster.",
    inputSchema: {
      type: "object",
      properties: {
        sport: { type: "string" },
        teamId: { type: "string" },
        teamSlug: { type: "string" },
        raw: { type: "boolean" }
      },
      required: ["sport"],
      additionalProperties: false
    },
    handler: async (args) => {
      const { sport, teamId, teamSlug, raw } = args;
      const { summary, raw: data } = await getTeamRoster({
        sport,
        teamId,
        teamSlug,
        ttlMs: 5 * 60 * 1000
      });
      return raw ? `${summary}\n\nRaw:\n${truncateJson(data)}` : summary;
    }
  },

  get_team_depth_chart: {
    name: "get_team_depth_chart",
    description: "Get a team's depth chart snapshot.",
    inputSchema: {
      type: "object",
      properties: {
        sport: { type: "string" },
        teamId: { type: "string" },
        teamSlug: { type: "string" },
        raw: { type: "boolean" }
      },
      required: ["sport"],
      additionalProperties: false
    },
    handler: async (args) => {
      const { sport, teamId, teamSlug, raw } = args;
      const { summary, raw: data } = await getTeamDepthChart({
        sport,
        teamId,
        teamSlug,
        ttlMs: 5 * 60 * 1000
      });
      return raw ? `${summary}\n\nRaw:\n${truncateJson(data)}` : summary;
    }
  },

  get_team_injuries: {
    name: "get_team_injuries",
    description: "Get injury report for a team (if available).",
    inputSchema: {
      type: "object",
      properties: {
        sport: { type: "string" },
        teamId: { type: "string" },
        teamSlug: { type: "string" },
        raw: { type: "boolean" }
      },
      required: ["sport"],
      additionalProperties: false
    },
    handler: async (args) => {
      const { sport, teamId, teamSlug, raw } = args;
      const { summary, raw: data } = await getTeamInjuries({
        sport,
        teamId,
        teamSlug,
        ttlMs: 5 * 60 * 1000
      });
      return raw ? `${summary}\n\nRaw:\n${truncateJson(data)}` : summary;
    }
  },

  get_team_news: {
    name: "get_team_news",
    description: "Get recent news headlines for a team.",
    inputSchema: {
      type: "object",
      properties: {
        sport: { type: "string" },
        teamId: { type: "string" },
        teamSlug: { type: "string" },
        raw: { type: "boolean" }
      },
      required: ["sport"],
      additionalProperties: false
    },
    handler: async (args) => {
      const { sport, teamId, teamSlug, raw } = args;
      const { summary, raw: data } = await getTeamNews({
        sport,
        teamId,
        teamSlug,
        ttlMs: 2 * 60 * 1000
      });
      return raw ? `${summary}\n\nRaw:\n${truncateJson(data)}` : summary;
    }
  },

  get_team_standings: {
    name: "get_team_standings",
    description: "Get standings snapshot for a conference/group within a sport.",
    inputSchema: {
      type: "object",
      properties: {
        sport: { type: "string" },
        groupId: {
          type: "string",
          description: "ESPN group/conference id, e.g., '8' for SEC (example)."
        },
        raw: { type: "boolean" }
      },
      required: ["sport"],
      additionalProperties: false
    },
    handler: async (args) => {
      const { sport, groupId, raw } = args;
      const { summary, raw: data } = await getTeamStandings({
        sport,
        groupId,
        ttlMs: 2 * 60 * 1000
      });
      return raw ? `${summary}\n\nRaw:\n${truncateJson(data)}` : summary;
    }
  },

  get_league_news: {
    name: "get_league_news",
    description: "Get league-level headlines for a given sport.",
    inputSchema: {
      type: "object",
      properties: {
        sport: { type: "string" },
        raw: { type: "boolean" }
      },
      required: ["sport"],
      additionalProperties: false
    },
    handler: async (args) => {
      const { sport, raw } = args;
      const { summary, raw: data } = await getLeagueNews({
        sport,
        ttlMs: 2 * 60 * 1000
      });
      return raw ? `${summary}\n\nRaw:\n${truncateJson(data)}` : summary;
    }
  },

  get_conference_info: {
    name: "get_conference_info",
    description: "Get snapshot info for a conference/group by id.",
    inputSchema: {
      type: "object",
      properties: {
        sport: { type: "string" },
        groupId: {
          type: "string",
          description: "ESPN group/conference id."
        },
        raw: { type: "boolean" }
      },
      required: ["sport", "groupId"],
      additionalProperties: false
    },
    handler: async (args) => {
      const { sport, groupId, raw } = args;
      const { summary, raw: data } = await getConferenceInfo({
        sport,
        groupId,
        ttlMs: 5 * 60 * 1000
      });
      return raw ? `${summary}\n\nRaw:\n${truncateJson(data)}` : summary;
    }
  },

  get_player_bio: {
    name: "get_player_bio",
    description: "Get bio & basic info for a specific athlete.",
    inputSchema: {
      type: "object",
      properties: {
        athleteId: {
          type: "string",
          description: "ESPN athlete ID."
        },
        sport: {
          type: "string",
          description: "Sport (optional; used for path; defaults to football)."
        },
        leagueHint: {
          type: "string",
          description: "Optional league hint like 'ncaaf', 'ncaam'."
        },
        raw: { type: "boolean" }
      },
      required: ["athleteId"],
      additionalProperties: false
    },
    handler: async (args) => {
      const { athleteId, sport, leagueHint, raw } = args;
      const { summary, raw: data } = await getAthleteBio({
        athleteId,
        sport,
        leagueHint,
        ttlMs: 5 * 60 * 1000
      });
      return raw ? `${summary}\n\nRaw:\n${truncateJson(data)}` : summary;
    }
  },

  get_player_stats: {
    name: "get_player_stats",
    description: "Get key stats for an athlete.",
    inputSchema: {
      type: "object",
      properties: {
        athleteId: { type: "string" },
        sport: { type: "string" },
        leagueHint: { type: "string" },
        raw: { type: "boolean" }
      },
      required: ["athleteId"],
      additionalProperties: false
    },
    handler: async (args) => {
      const { athleteId, sport, leagueHint, raw } = args;
      const { summary, raw: data } = await getAthleteStats({
        athleteId,
        sport,
        leagueHint,
        ttlMs: 5 * 60 * 1000
      });
      return raw ? `${summary}\n\nRaw:\n${truncateJson(data)}` : summary;
    }
  },

  get_player_news: {
    name: "get_player_news",
    description: "Get recent news headlines for an athlete.",
    inputSchema: {
      type: "object",
      properties: {
        athleteId: { type: "string" },
        sport: { type: "string" },
        leagueHint: { type: "string" },
        raw: { type: "boolean" }
      },
      required: ["athleteId"],
      additionalProperties: false
    },
    handler: async (args) => {
      const { athleteId, sport, leagueHint, raw } = args;
      const { summary, raw: data } = await getAthleteNews({
        athleteId,
        sport,
        leagueHint,
        ttlMs: 5 * 60 * 1000
      });
      return raw ? `${summary}\n\nRaw:\n${truncateJson(data)}` : summary;
    }
  },

  get_game_summary: {
    name: "get_game_summary",
    description: "Get high-level summary of a specific game/event.",
    inputSchema: {
      type: "object",
      properties: {
        gameId: {
          type: "string",
          description: "ESPN event id."
        },
        sport: {
          type: "string",
          description: "Sport key, e.g., 'football', 'mens-college-basketball'."
        },
        raw: { type: "boolean" }
      },
      required: ["gameId", "sport"],
      additionalProperties: false
    },
    handler: async (args) => {
      const { gameId, sport, raw } = args;
      const { summary, raw: data } = await getGameSummary({
        gameId,
        sport,
        ttlMs: 60 * 1000
      });
      return raw ? `${summary}\n\nRaw:\n${truncateJson(data)}` : summary;
    }
  },

  get_play_by_play: {
    name: "get_play_by_play",
    description: "Get short snapshot of play-by-play for a game.",
    inputSchema: {
      type: "object",
      properties: {
        gameId: { type: "string" },
        sport: { type: "string" },
        raw: { type: "boolean" }
      },
      required: ["gameId", "sport"],
      additionalProperties: false
    },
    handler: async (args) => {
      const { gameId, sport, raw } = args;
      const { summary, raw: data } = await getPlayByPlay({
        gameId,
        sport,
        ttlMs: 60 * 1000
      });
      return raw ? `${summary}\n\nRaw:\n${truncateJson(data)}` : summary;
    }
  }
};

// ---------- JSON-RPC 2.0 HANDLER ----------

function makeRpcError(id, code, message, data) {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    error: { code, message, data }
  };
}

function makeRpcResult(id, result) {
  return {
    jsonrpc: "2.0",
    id,
    result
  };
}

app.post("/mcp", async (req, res) => {
  const body = req.body || {};
  const { jsonrpc, id, method, params } = body;

  if (jsonrpc !== "2.0") {
    return res
      .status(400)
      .json(makeRpcError(id, -32600, "Invalid JSON-RPC version; expected '2.0'."));
  }

  try {
    switch (method) {
      case "initialize": {
        const result = {
          capabilities: {
            "tools/list": true,
            "tools/call": true
          },
          serverInfo: {
            name: "espn-extended-mcp",
            version: "1.0.0"
          }
        };
        return res.json(makeRpcResult(id, result));
      }

      case "tools/list": {
        const toolList = Object.values(tools).map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema
        }));
        return res.json(
          makeRpcResult(id, {
            tools: toolList
          })
        );
      }

      case "tools/call": {
        const { name, arguments: toolArgs } = params || {};
        const tool = tools[name];

        if (!tool) {
          return res.json(
            makeRpcError(id, -32601, `Unknown tool '${name}'.`, {
              availableTools: Object.keys(tools)
            })
          );
        }

        let parsedArgs = toolArgs;
        if (typeof toolArgs === "string") {
          try {
            parsedArgs = JSON.parse(toolArgs);
          } catch (e) {
            return res.json(
              makeRpcError(id, -32602, "Tool arguments must be valid JSON.", {
                raw: toolArgs
              })
            );
          }
        }

        const text = await tool.handler(parsedArgs || {});

        return res.json(
          makeRpcResult(id, {
            content: [
              {
                type: "text",
                text
              }
            ]
          })
        );
      }

      default:
        return res.json(
          makeRpcError(id, -32601, `Unknown method '${method}'.`, {
            supportedMethods: ["initialize", "tools/list", "tools/call"]
          })
        );
    }
  } catch (err) {
    console.error("MCP handler error:", err);
    return res.json(
      makeRpcError(id, -32603, "Internal error calling tool.", {
        message: err.message
      })
    );
  }
});

// ---------- START SERVER ----------

app.listen(PORT, () => {
  console.log(`🚀 ESPN Extended MCP listening on port ${PORT}`);
});

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
const PORT = process.env.PORT || 8080;
const MCP_API_KEY = process.env.MCP_API_KEY || "";

// Middleware
app.use(express.json({ limit: "1mb" }));

// IMPORTANT: Health check MUST come before auth middleware
app.get("/", (req, res) => {
  res.status(200).json({ 
    status: "ok", 
    service: "ESPN Extended MCP",
    port: PORT,
    tools: Object.keys(tools).length
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});

// Manifest (before auth too)
app.get("/manifest.json", (req, res) => res.json(manifest));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Auth middleware (only for protected routes)
app.use((req, res, next) => {
  // Skip auth for health/manifest
  if (req.path === "/" || req.path === "/health" || req.path === "/manifest.json") {
    return next();
  }
  
  const auth = req.headers.authorization || "";
  const token = auth.split(" ")[1];
  
  if (!MCP_API_KEY) {
    console.warn("⚠️  No MCP_API_KEY set - authentication disabled");
    return next();
  }
  
  if (token !== MCP_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  next();
});

// Tools registry
const tools = {
  get_team_info: {
    name: "get_team_info",
    description: "Get basic team information including name, mascot, colors, logos, and conference.",
    inputSchema: {
      type: "object",
      properties: {
        sport: { 
          type: "string",
          description: "Sport type (e.g., 'football', 'basketball', 'baseball')"
        },
        teamId: { 
          type: "string",
          description: "ESPN team ID"
        },
        teamSlug: { 
          type: "string",
          description: "Team slug (e.g., 'oklahoma', 'texas')"
        },
        raw: { 
          type: "boolean",
          description: "Include raw JSON data in response"
        }
      },
      required: ["sport"]
    },
    handler: async (args) => {
      const { sport, teamId, teamSlug, raw } = args;
      const { summary, raw: data } = await getTeamInfo({
        sport,
        teamId,
        teamSlug,
        ttlMs: 300000
      });
      return raw ? summary + "\n\n" + truncateJson(data) : summary;
    }
  },
  
  get_team_roster: {
    name: "get_team_roster",
    description: "Get team roster with player details including position, height, weight, year, and jersey number.",
    inputSchema: {
      type: "object",
      properties: {
        sport: { 
          type: "string",
          description: "Sport type (e.g., 'football', 'basketball')"
        },
        teamId: { 
          type: "string",
          description: "ESPN team ID"
        },
        teamSlug: { 
          type: "string",
          description: "Team slug (e.g., 'oklahoma', 'texas')"
        },
        raw: { 
          type: "boolean",
          description: "Include raw JSON data in response"
        }
      },
      required: ["sport"]
    },
    handler: async (args) => {
      const { sport, teamId, teamSlug, raw } = args;
      const { summary, raw: data } = await getTeamRoster({
        sport,
        teamId,
        teamSlug,
        ttlMs: 300000
      });
      return raw ? summary + "\n\n" + truncateJson(data) : summary;
    }
  },

  get_team_depth_chart: {
    name: "get_team_depth_chart",
    description: "Get team depth chart organized by position showing starter and backup players.",
    inputSchema: {
      type: "object",
      properties: {
        sport: { 
          type: "string",
          description: "Sport type (e.g., 'football', 'basketball')"
        },
        teamId: { 
          type: "string",
          description: "ESPN team ID"
        },
        teamSlug: { 
          type: "string",
          description: "Team slug (e.g., 'oklahoma', 'texas')"
        },
        raw: { 
          type: "boolean",
          description: "Include raw JSON data in response"
        }
      },
      required: ["sport"]
    },
    handler: async (args) => {
      const { sport, teamId, teamSlug, raw } = args;
      const { summary, raw: data } = await getTeamDepthChart({
        sport,
        teamId,
        teamSlug,
        ttlMs: 300000
      });
      return raw ? summary + "\n\n" + truncateJson(data) : summary;
    }
  },

  get_team_injuries: {
    name: "get_team_injuries",
    description: "Get current team injury report with player status and injury details.",
    inputSchema: {
      type: "object",
      properties: {
        sport: { 
          type: "string",
          description: "Sport type (e.g., 'football', 'basketball')"
        },
        teamId: { 
          type: "string",
          description: "ESPN team ID"
        },
        teamSlug: { 
          type: "string",
          description: "Team slug (e.g., 'oklahoma', 'texas')"
        },
        raw: { 
          type: "boolean",
          description: "Include raw JSON data in response"
        }
      },
      required: ["sport"]
    },
    handler: async (args) => {
      const { sport, teamId, teamSlug, raw } = args;
      const { summary, raw: data } = await getTeamInjuries({
        sport,
        teamId,
        teamSlug,
        ttlMs: 300000
      });
      return raw ? summary + "\n\n" + truncateJson(data) : summary;
    }
  },

  get_team_news: {
    name: "get_team_news",
    description: "Get latest news articles and updates for a specific team.",
    inputSchema: {
      type: "object",
      properties: {
        sport: { 
          type: "string",
          description: "Sport type (e.g., 'football', 'basketball')"
        },
        teamId: { 
          type: "string",
          description: "ESPN team ID"
        },
        teamSlug: { 
          type: "string",
          description: "Team slug (e.g., 'oklahoma', 'texas')"
        },
        raw: { 
          type: "boolean",
          description: "Include raw JSON data in response"
        }
      },
      required: ["sport"]
    },
    handler: async (args) => {
      const { sport, teamId, teamSlug, raw } = args;
      const { summary, raw: data } = await getTeamNews({
        sport,
        teamId,
        teamSlug,
        ttlMs: 300000
      });
      return raw ? summary + "\n\n" + truncateJson(data) : summary;
    }
  },

  get_team_standings: {
    name: "get_team_standings",
    description: "Get conference standings showing wins, losses, and team rankings.",
    inputSchema: {
      type: "object",
      properties: {
        sport: { 
          type: "string",
          description: "Sport type (e.g., 'football', 'basketball')"
        },
        teamId: { 
          type: "string",
          description: "ESPN team ID"
        },
        teamSlug: { 
          type: "string",
          description: "Team slug (e.g., 'oklahoma', 'texas')"
        },
        raw: { 
          type: "boolean",
          description: "Include raw JSON data in response"
        }
      },
      required: ["sport"]
    },
    handler: async (args) => {
      const { sport, teamId, teamSlug, raw } = args;
      const { summary, raw: data } = await getTeamStandings({
        sport,
        teamId,
        teamSlug,
        ttlMs: 300000
      });
      return raw ? summary + "\n\n" + truncateJson(data) : summary;
    }
  },

  get_league_news: {
    name: "get_league_news",
    description: "Get latest news for entire league/sport (not team-specific).",
    inputSchema: {
      type: "object",
      properties: {
        sport: { 
          type: "string",
          description: "Sport type (e.g., 'football', 'basketball')"
        },
        raw: { 
          type: "boolean",
          description: "Include raw JSON data in response"
        }
      },
      required: ["sport"]
    },
    handler: async (args) => {
      const { sport, raw } = args;
      const { summary, raw: data } = await getLeagueNews({
        sport,
        ttlMs: 300000
      });
      return raw ? summary + "\n\n" + truncateJson(data) : summary;
    }
  },

  get_conference_info: {
    name: "get_conference_info",
    description: "Get information about a conference including member teams.",
    inputSchema: {
      type: "object",
      properties: {
        sport: { 
          type: "string",
          description: "Sport type (e.g., 'football', 'basketball')"
        },
        conferenceId: { 
          type: "string",
          description: "ESPN conference ID"
        },
        conferenceSlug: { 
          type: "string",
          description: "Conference slug (e.g., 'sec', 'big-12')"
        },
        raw: { 
          type: "boolean",
          description: "Include raw JSON data in response"
        }
      },
      required: ["sport"]
    },
    handler: async (args) => {
      const { sport, conferenceId, conferenceSlug, raw } = args;
      const { summary, raw: data } = await getConferenceInfo({
        sport,
        conferenceId,
        conferenceSlug,
        ttlMs: 300000
      });
      return raw ? summary + "\n\n" + truncateJson(data) : summary;
    }
  },

  get_athlete_bio: {
    name: "get_athlete_bio",
    description: "Get athlete biography including birthplace, college, draft info, and career highlights.",
    inputSchema: {
      type: "object",
      properties: {
        sport: { 
          type: "string",
          description: "Sport type (e.g., 'football', 'basketball')"
        },
        athleteId: { 
          type: "string",
          description: "ESPN athlete ID"
        },
        raw: { 
          type: "boolean",
          description: "Include raw JSON data in response"
        }
      },
      required: ["sport", "athleteId"]
    },
    handler: async (args) => {
      const { sport, athleteId, raw } = args;
      const { summary, raw: data } = await getAthleteBio({
        sport,
        athleteId,
        ttlMs: 300000
      });
      return raw ? summary + "\n\n" + truncateJson(data) : summary;
    }
  },

  get_athlete_stats: {
    name: "get_athlete_stats",
    description: "Get athlete statistics for current season and career totals.",
    inputSchema: {
      type: "object",
      properties: {
        sport: { 
          type: "string",
          description: "Sport type (e.g., 'football', 'basketball')"
        },
        athleteId: { 
          type: "string",
          description: "ESPN athlete ID"
        },
        raw: { 
          type: "boolean",
          description: "Include raw JSON data in response"
        }
      },
      required: ["sport", "athleteId"]
    },
    handler: async (args) => {
      const { sport, athleteId, raw } = args;
      const { summary, raw: data } = await getAthleteStats({
        sport,
        athleteId,
        ttlMs: 300000
      });
      return raw ? summary + "\n\n" + truncateJson(data) : summary;
    }
  },

  get_athlete_news: {
    name: "get_athlete_news",
    description: "Get news articles and updates about a specific athlete.",
    inputSchema: {
      type: "object",
      properties: {
        sport: { 
          type: "string",
          description: "Sport type (e.g., 'football', 'basketball')"
        },
        athleteId: { 
          type: "string",
          description: "ESPN athlete ID"
        },
        raw: { 
          type: "boolean",
          description: "Include raw JSON data in response"
        }
      },
      required: ["sport", "athleteId"]
    },
    handler: async (args) => {
      const { sport, athleteId, raw } = args;
      const { summary, raw: data } = await getAthleteNews({
        sport,
        athleteId,
        ttlMs: 300000
      });
      return raw ? summary + "\n\n" + truncateJson(data) : summary;
    }
  },

  get_game_summary: {
    name: "get_game_summary",
    description: "Get game summary including final score, team stats, and game highlights.",
    inputSchema: {
      type: "object",
      properties: {
        sport: { 
          type: "string",
          description: "Sport type (e.g., 'football', 'basketball')"
        },
        gameId: { 
          type: "string",
          description: "ESPN game ID"
        },
        raw: { 
          type: "boolean",
          description: "Include raw JSON data in response"
        }
      },
      required: ["sport", "gameId"]
    },
    handler: async (args) => {
      const { sport, gameId, raw } = args;
      const { summary, raw: data } = await getGameSummary({
        sport,
        gameId,
        ttlMs: 60000
      });
      return raw ? summary + "\n\n" + truncateJson(data) : summary;
    }
  },

  get_play_by_play: {
    name: "get_play_by_play",
    description: "Get detailed play-by-play breakdown of a game including every drive and scoring play.",
    inputSchema: {
      type: "object",
      properties: {
        sport: { 
          type: "string",
          description: "Sport type (e.g., 'football', 'basketball')"
        },
        gameId: { 
          type: "string",
          description: "ESPN game ID"
        },
        raw: { 
          type: "boolean",
          description: "Include raw JSON data in response"
        }
      },
      required: ["sport", "gameId"]
    },
    handler: async (args) => {
      const { sport, gameId, raw } = args;
      const { summary, raw: data } = await getPlayByPlay({
        sport,
        gameId,
        ttlMs: 60000
      });
      return raw ? summary + "\n\n" + truncateJson(data) : summary;
    }
  }
};

// JSON-RPC handler
function rpcError(id, code, message, data) {
  return { jsonrpc: "2.0", id, error: { code, message, data } };
}

function rpcResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}

app.post("/mcp", async (req, res) => {
  const { jsonrpc, id, method, params } = req.body;
  if (jsonrpc !== "2.0")
    return res.status(400).json(rpcError(id, -32600, "Invalid JSON-RPC version"));
  
  try {
    if (method === "initialize") {
      return res.json(
        rpcResult(id, {
          capabilities: { "tools/list": true, "tools/call": true },
          serverInfo: { name: "espn-extended-mcp", version: "1.0.0" }
        })
      );
    }
    if (method === "tools/list") {
      return res.json(
        rpcResult(id, {
          tools: Object.values(tools).map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema
          }))
        })
      );
    }
    if (method === "tools/call") {
      const { name, arguments: toolArgs } = params;
      const tool = tools[name];
      if (!tool)
        return res.json(rpcError(id, -32601, `Unknown tool: ${name}`));
      const resultText = await tool.handler(toolArgs || {});
      return res.json(rpcResult(id, { content: [{ type: "text", text: resultText }] }));
    }
    return res.json(rpcError(id, -32601, `Unknown method: ${method}`));
  } catch (err) {
    console.error("MCP Error:", err);
    return res.json(rpcError(id, -32603, "Internal error", { message: err.message }));
  }
});

// Graceful shutdown
let isShuttingDown = false;

process.on('SIGTERM', () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('SIGTERM received, shutting down gracefully...');
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  
  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ESPN Extended MCP listening on port ${PORT}`);
  console.log(`📊 Loaded ${Object.keys(tools).length} ESPN tools`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});

// Keep-alive (prevents Railway from thinking process is idle)
setInterval(() => {
  console.log(`[HEARTBEAT] Server alive - ${Object.keys(tools).length} tools ready`);
}, 60000); // Every 60 seconds

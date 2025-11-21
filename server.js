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
    port: PORT 
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
    description: "Get basic team information.",
    inputSchema: {
      type: "object",
      properties: {
        sport: { type: "string" },
        teamId: { type: "string" },
        teamSlug: { type: "string" },
        raw: { type: "boolean" }
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
  }
  // ... rest of your tools ...
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
  console.log(`Health check: http://localhost:${PORT}/health`);
});

// Keep-alive (prevents Railway from thinking process is idle)
setInterval(() => {
  console.log(`[HEARTBEAT] Server alive at ${new Date().toISOString()}`);
}, 60000); // Every 60 seconds

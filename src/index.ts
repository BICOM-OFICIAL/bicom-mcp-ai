// bicom-mcp-ai — bin entry point.
//
// Carga config desde env, arma el MCP server con los 8 tools y abre el
// STDIO transport (R17 — distribucion STDIO V1, sin SSE).
//
// Invocado tipicamente desde claude_desktop_config.json:
//   "mcpServers": {
//     "bicom": {
//       "command": "pnpm",
//       "args": ["dlx", "@bicom-oficial/bicom-mcp-ai"],
//       "env": { "BICOM_API_TOKEN": "<token>" }
//     }
//   }

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const server = createServer(config);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // STDIO transport mantiene el proceso vivo recibiendo mensajes por stdin.
  // No hace falta keep-alive explicito.
  console.error("[bicom-mcp-ai] server ready (8 tools registered, STDIO transport)");
}

main().catch((err) => {
  console.error("[bicom-mcp-ai] fatal:", err);
  process.exit(1);
});

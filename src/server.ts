// MCP server factory. Crea un McpServer, instancia el BicomApiClient con la
// config del entorno y registra los tools.
//
// El transport (STDIO V1, SSE V2) lo aplica el caller — index.ts para el
// CLI, los tests para in-memory.
//
// Spec ref: sdd/bicom-mcp-v1/spec R13.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BicomApiClient } from "./client/bicom-api.js";
import type { Config } from "./config.js";
import { registerAllTools } from "./tools/index.js";

const SERVER_NAME = "bicom-mcp-ai";
const SERVER_VERSION = "0.1.0";

export function createServer(config: Config): McpServer {
  const server = new McpServer(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  const api = new BicomApiClient(config.baseUrl, config.token);
  registerAllTools(server, api, config);

  return server;
}

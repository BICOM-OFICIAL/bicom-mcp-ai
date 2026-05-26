// Loads runtime config from environment variables.
//
// Required:
//   BICOM_API_TOKEN — api_token generado desde /admin/tokens del bicom-api.
//
// Optional:
//   BICOM_API_BASE_URL — default https://bicomrest.bicomstore.cl (prod).
//
// Si BICOM_API_TOKEN no esta seteado, imprime instrucciones de setup en stderr
// y sale con exit 1 (R13.3 del spec).

export interface Config {
  baseUrl: string;
  token: string;
}

const DEFAULT_BASE_URL = "https://bicomrest.bicomstore.cl";

export function loadConfig(): Config {
  const token = process.env.BICOM_API_TOKEN?.trim();

  if (!token) {
    console.error("[bicom-mcp-ai] ERROR: BICOM_API_TOKEN no esta seteado.");
    console.error("");
    console.error("Para configurar el MCP:");
    console.error("  1. Genera un api_token desde /admin/tokens del bicom-api.");
    console.error("  2. Agregalo a tu claude_desktop_config.json:");
    console.error("");
    console.error('     "mcpServers": {');
    console.error('       "bicom": {');
    console.error('         "command": "pnpm",');
    console.error('         "args": ["dlx", "@bicom-oficial/bicom-mcp-ai"],');
    console.error('         "env": {');
    console.error('           "BICOM_API_TOKEN": "<tu-token-aqui>"');
    console.error("         }");
    console.error("       }");
    console.error("     }");
    console.error("");
    console.error("  3. Reinicia Claude Desktop.");
    process.exit(1);
  }

  const baseUrl = (process.env.BICOM_API_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");

  return { baseUrl, token };
}

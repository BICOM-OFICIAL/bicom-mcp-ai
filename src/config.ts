// Loads runtime config from environment variables.
//
// Required:
//   BICOM_API_TOKEN — api_token generado desde /admin/tokens del bicom-api.
//
// Optional:
//   BICOM_API_BASE_URL — default https://bicomrest.bicomstore.cl (prod).
//   BICOM_QUOTES_DIR — carpeta donde se guardan los PDF de cotizaciones.
//     Default ~/Downloads/Cotizaciones BICOM.
//   BICOM_DEFAULT_SELLER_ID / BICOM_DEFAULT_BRANCHOFFICE_ID /
//   BICOM_DEFAULT_WAREHOUSE_ID / BICOM_DEFAULT_ACTIVITY_ID — ids por defecto
//     para create_quote cuando el usuario no los indica.
//
// Si BICOM_API_TOKEN no esta seteado, imprime instrucciones de setup en stderr
// y sale con exit 1 (R13.3 del spec).

import { homedir } from "node:os";
import { join } from "node:path";

export interface QuoteDefaults {
  sellerId?: number;
  branchofficeId?: number;
  warehouseId?: number;
  activityId?: number;
}

export interface Config {
  baseUrl: string;
  token: string;
  quotesDir: string;
  quoteDefaults: QuoteDefaults;
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

  const quotesDir =
    process.env.BICOM_QUOTES_DIR?.trim() || join(homedir(), "Downloads", "Cotizaciones BICOM");

  return {
    baseUrl,
    token,
    quotesDir,
    quoteDefaults: {
      sellerId: optionalId("BICOM_DEFAULT_SELLER_ID"),
      branchofficeId: optionalId("BICOM_DEFAULT_BRANCHOFFICE_ID"),
      warehouseId: optionalId("BICOM_DEFAULT_WAREHOUSE_ID"),
      activityId: optionalId("BICOM_DEFAULT_ACTIVITY_ID"),
    },
  };
}

function optionalId(name: string): number | undefined {
  const raw = process.env[name]?.trim();
  if (!raw) return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    console.error(`[bicom-mcp-ai] WARN: ${name}=${raw} no es un id valido, se ignora.`);
    return undefined;
  }
  return n;
}

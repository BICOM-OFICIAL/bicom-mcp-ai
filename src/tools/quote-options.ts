// MCP tool: get_quote_options -> GET /api/quotes/agent/options
//
// Lista los vendedores, sucursales, bodegas y actividades (giros) de la
// empresa: los ids que create_quote necesita cuando no hay defaults.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BicomApiClient } from "../client/bicom-api.js";
import { tableToMarkdown } from "../formatters/markdown.js";
import type { QuoteAgentOptions, QuoteOption } from "../schemas/quotes.js";
import { quoteOptionsInput } from "../schemas/quotes.js";
import { safeRender } from "./_helpers.js";

export const QUOTE_OPTIONS_PATH = "/api/quotes/agent/options";

export function registerQuoteOptions(server: McpServer, api: BicomApiClient): void {
  server.tool(
    "get_quote_options",
    "Lista vendedores, sucursales, bodegas y actividades economicas (giros) de la empresa, con sus ids. Usalo cuando create_quote pida elegir alguno de ellos.",
    quoteOptionsInput,
    async () =>
      safeRender(async () => {
        const data = await api.get<QuoteAgentOptions>(QUOTE_OPTIONS_PATH);
        return render(data);
      }),
  );
}

function render(d: QuoteAgentOptions): string {
  const lines: string[] = ["## ⚙️ Opciones para cotizar", ""];
  section(lines, "Vendedores (seller_id)", d.sellers);
  section(lines, "Sucursales (branchoffice_id)", d.branchoffices);
  section(lines, "Bodegas (warehouse_id)", d.warehouses);
  section(lines, "Actividades / giros (company_activity_id)", d.company_activities);
  return lines.join("\n");
}

function section(lines: string[], title: string, items: QuoteOption[]): void {
  lines.push(`### ${title}`);
  lines.push(
    tableToMarkdown(
      items,
      [
        { key: "id", label: "Id", align: "right" },
        { key: "name", label: "Nombre" },
      ],
      "_Sin registros._",
    ),
  );
  lines.push("");
}

// MCP tool: get_top_sellers -> GET /api/stats/sales/top-sellers
//
// Spec ref: sdd/bicom-mcp-v1/spec R7.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BicomApiClient } from "../client/bicom-api.js";
import { formatCLP, formatInt } from "../formatters/currency.js";
import { formatRange } from "../formatters/date.js";
import { tableToMarkdown } from "../formatters/markdown.js";
import type { TopSellersResponse } from "../schemas/stats.js";
import { topSellersInput } from "../schemas/stats.js";
import { safeRender } from "./_helpers.js";

export function registerTopSellers(server: McpServer, api: BicomApiClient): void {
  server.tool(
    "get_top_sellers",
    "Vendedores con mas ventas del periodo, rankeados por ingresos (revenue_total neto) DESC. Devuelve seller_id, descripcion, cantidad de documentos emitidos e ingresos.",
    topSellersInput,
    async ({ period, limit }) =>
      safeRender(async () => {
        const data = await api.get<TopSellersResponse>("/api/stats/sales/top-sellers", {
          period,
          limit,
        });
        return render(data, limit ?? 10);
      }),
  );
}

function render(d: TopSellersResponse, requestedLimit: number): string {
  const lines: string[] = [];
  lines.push(`## 🎖️ Top ${requestedLimit} vendedores`);
  lines.push(`**Periodo:** ${formatRange(d.date_from, d.date_to)}`);
  lines.push("");
  lines.push(
    tableToMarkdown(d.sellers, [
      { key: "description", label: "Vendedor" },
      {
        key: "documents_count",
        label: "Docs",
        format: (v) => formatInt(v as number),
        align: "right",
      },
      {
        key: "revenue_total",
        label: "Ingresos",
        format: (v) => formatCLP(v as number),
        align: "right",
      },
    ]),
  );
  return lines.join("\n");
}

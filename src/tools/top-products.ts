// MCP tool: get_top_products -> GET /api/stats/sales/top-products
//
// Spec ref: sdd/bicom-mcp-v1/spec R6.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BicomApiClient } from "../client/bicom-api.js";
import { formatCLP, formatInt } from "../formatters/currency.js";
import { formatRange } from "../formatters/date.js";
import { tableToMarkdown } from "../formatters/markdown.js";
import type { TopProductsResponse } from "../schemas/stats.js";
import { topProductsInput } from "../schemas/stats.js";
import { safeRender } from "./_helpers.js";

export function registerTopProducts(server: McpServer, api: BicomApiClient): void {
  server.tool(
    "get_top_products",
    "Productos mas vendidos del periodo, rankeados por ingresos (revenue_total neto) DESC. Devuelve product_id, code, descripcion, cantidad vendida y revenue. Util para 'cuales son mis productos estrella'.",
    topProductsInput,
    async ({ period, limit }) =>
      safeRender(async () => {
        const data = await api.get<TopProductsResponse>("/api/stats/sales/top-products", {
          period,
          limit,
        });
        return render(data, limit ?? 10);
      }),
  );
}

function render(d: TopProductsResponse, requestedLimit: number): string {
  const lines: string[] = [];
  lines.push(`## 🏆 Top ${requestedLimit} productos vendidos`);
  lines.push(`**Periodo:** ${formatRange(d.date_from, d.date_to)}`);
  lines.push("");
  lines.push(
    tableToMarkdown(d.products, [
      { key: "code", label: "Codigo" },
      { key: "description", label: "Producto" },
      {
        key: "quantity_sold",
        label: "Cantidad",
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

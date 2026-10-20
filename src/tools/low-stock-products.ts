// MCP tool: get_low_stock_products -> GET /api/stats/stock/low
//
// Spec ref: sdd/bicom-mcp-v1/spec R10.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BicomApiClient } from "../client/bicom-api.js";
import { formatInt } from "../formatters/currency.js";
import { toSantiago } from "../formatters/date.js";
import { tableToMarkdown } from "../formatters/markdown.js";
import type { LowStockProductsResponse } from "../schemas/stats.js";
import { lowStockProductsInput } from "../schemas/stats.js";
import { safeRender } from "./_helpers.js";

export function registerLowStockProducts(server: McpServer, api: BicomApiClient): void {
  server.tool(
    "get_low_stock_products",
    "Productos con stock por agotarse: cada par producto + bodega con stock actual <= threshold, ordenados ASC (mas bajos primero; el stock negativo aparece primero). Solo productos activos e inventariables. Devuelve product_id, code, descripcion, bodega y stock actual. Default threshold=10. Para el stock de un producto en todas sus bodegas usa get_product_stock.",
    lowStockProductsInput,
    async ({ threshold, limit }) =>
      safeRender(async () => {
        const data = await api.get<LowStockProductsResponse>("/api/stats/stock/low", {
          threshold,
          limit,
        });
        return render(data);
      }),
  );
}

function render(d: LowStockProductsResponse): string {
  const lines: string[] = [];
  lines.push(`## 📦 Productos con stock bajo (≤ ${formatInt(d.threshold)})`);
  lines.push(`**Al ${toSantiago(d.as_of_date)}**`);
  lines.push("");
  lines.push(
    tableToMarkdown(d.products, [
      { key: "code", label: "Codigo" },
      { key: "description", label: "Producto" },
      { key: "warehouse_name", label: "Bodega" },
      {
        key: "stock_current",
        label: "Stock",
        format: (v) => formatInt(v as number),
        align: "right",
      },
    ]),
  );
  return lines.join("\n");
}

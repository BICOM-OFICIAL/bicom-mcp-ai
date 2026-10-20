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
    "Productos mas vendidos del periodo, rankeados por ingresos (revenue_total neto, las notas de credito restan) DESC. Devuelve product_id, code, descripcion, cantidad vendida, revenue y el costo unitario neto: costo promedio ponderado a la fecha hasta (segun la fecha de consolidacion de las compras) y costo de la ultima compra actual. Util para 'cuales son mis productos estrella'. Para margen usa get_sales_margin. Acepta un period fijo o un rango libre con date_from/date_to (YYYY-MM-DD).",
    topProductsInput,
    async ({ period, date_from, date_to, limit }) =>
      safeRender(async () => {
        const data = await api.get<TopProductsResponse>("/api/stats/sales/top-products", {
          period,
          date_from,
          date_to,
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
      {
        key: "unit_cost_average",
        label: "Costo prom.",
        format: (v) => formatCLP(v as number),
        align: "right",
      },
      {
        key: "unit_cost_last_purchase",
        label: "Ult. compra",
        format: (v) => formatCLP(v as number),
        align: "right",
      },
    ]),
  );
  if (d.products.length > 0 && d.products.every((p) => p.unit_cost_average === null)) {
    lines.push("");
    lines.push(
      "_Costo prom. no disponible: requiere el cierre mensual de stock de la empresa (— = sin dato)._",
    );
  }
  return lines.join("\n");
}

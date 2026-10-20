// MCP tool: search_products -> GET /api/inventory/stock?search=&limit=&include=cost
//
// Paso previo a create_quote: el endpoint de cotizaciones resuelve cada linea
// por codigo, asi que el asistente necesita encontrar el codigo exacto.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BicomApiClient } from "../client/bicom-api.js";
import { formatCLP, formatInt } from "../formatters/currency.js";
import { tableToMarkdown } from "../formatters/markdown.js";
import type { StockSearchResponse } from "../schemas/quotes.js";
import { searchProductsInput } from "../schemas/quotes.js";
import { safeRender } from "./_helpers.js";

export function registerSearchProducts(server: McpServer, api: BicomApiClient): void {
  server.tool(
    "search_products",
    "Busca productos por codigo, codigo de barras o descripcion. Devuelve codigo, descripcion, precio bruto (con IVA), stock y costo promedio ponderado neto a hoy (— si no hay dato). Usalo para obtener los codigos exactos antes de create_quote.",
    searchProductsInput,
    async ({ search, limit }) =>
      safeRender(async () => {
        const data = await api.get<StockSearchResponse>("/api/inventory/stock", {
          search,
          limit,
          include: "cost",
        });
        return render(search, data);
      }),
  );
}

function render(search: string, d: StockSearchResponse): string {
  const lines: string[] = [];
  lines.push(`## 🔎 Productos para "${search}"`);
  lines.push(`**Resultados:** ${formatInt(d.data.length)} de ${formatInt(d.total)}`);
  lines.push("");
  if (d.data.length === 0) {
    lines.push("_No se encontraron productos. Prueba con otra palabra o parte del codigo._");
    return lines.join("\n");
  }
  lines.push(
    tableToMarkdown(d.data, [
      { key: "code", label: "Codigo" },
      { key: "description", label: "Descripcion" },
      { key: "measurement_unit", label: "Unidad" },
      {
        key: "price_brute",
        label: "Precio c/IVA",
        format: (v) => formatCLP(v as number),
        align: "right",
      },
      { key: "stock", label: "Stock", format: (v) => formatInt(v as number), align: "right" },
      {
        key: "unit_cost_average",
        label: "Costo prom. neto",
        format: (v) => formatCLP(v as number),
        align: "right",
      },
    ]),
  );
  return lines.join("\n");
}

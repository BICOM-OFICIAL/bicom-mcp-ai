// MCP tool: get_sales_margin -> GET /api/stats/sales/margin
//
// Margen por familia y por producto: cantidad, venta neta (NC restando), costo
// de venta, margen en pesos y en %.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BicomApiClient } from "../client/bicom-api.js";
import { formatCLP, formatInt } from "../formatters/currency.js";
import { formatRange } from "../formatters/date.js";
import { tableToMarkdown } from "../formatters/markdown.js";
import type { MarginSort, SalesMarginResponse } from "../schemas/stats.js";
import { salesMarginInput } from "../schemas/stats.js";
import { safeRender } from "./_helpers.js";

export function registerSalesMargin(server: McpServer, api: BicomApiClient): void {
  server.tool(
    "get_sales_margin",
    "Reporte de margen del periodo, total, por familia y por producto: cantidad vendida, venta neta (las notas de credito restan), costo de venta, margen en pesos, margen % (sobre la venta) y markup % (sobre el costo). Por defecto usa el costo promedio ponderado a la fecha hasta, segun la fecha de consolidacion de las compras; si la empresa no tiene cierre mensual de stock usa el costo de la ultima compra actual y lo indica. Los productos sin costo no entran al margen: sus ventas se informan aparte. Acepta un period fijo o un rango libre con date_from/date_to (YYYY-MM-DD).",
    salesMarginInput,
    async ({ period, date_from, date_to, limit, sort, cost_basis }) =>
      safeRender(async () => {
        const data = await api.get<SalesMarginResponse>("/api/stats/sales/margin", {
          period,
          date_from,
          date_to,
          limit,
          sort,
          cost_basis,
        });
        return render(data);
      }),
  );
}

const SORT_TITLE: Record<MarginSort, string> = {
  net_sales: "mas vendidos",
  margin: "con mas margen",
  lowest_margin_pct: "con menor margen %",
};

const pct = (v: unknown): string => `${(v as number).toLocaleString("es-CL")} %`;
const clp = (v: unknown): string => formatCLP(v as number);

export function render(d: SalesMarginResponse): string {
  const t = d.totals;
  const lines: string[] = [];
  lines.push("## 📈 Margen de ventas");
  lines.push(`**Periodo:** ${formatRange(d.date_from, d.date_to)}`);
  lines.push(`**Costo:** ${d.cost_note}`);
  lines.push("");
  lines.push(`- **Venta neta:** ${formatCLP(t.net_sales)}`);
  lines.push(`- **Costo de venta:** ${formatCLP(t.cost_of_sales)}`);
  lines.push(
    `- **Margen:** ${formatCLP(t.margin)}${t.margin_pct === null ? "" : ` (${pct(t.margin_pct)} sobre la venta con costo)`}`,
  );
  if (t.markup_pct !== null) lines.push(`- **Markup:** ${pct(t.markup_pct)} sobre el costo`);
  if (t.products_without_cost > 0) {
    lines.push(
      `- **Sin costo (fuera del margen):** ${formatInt(t.products_without_cost)} productos, ${formatCLP(t.net_sales_without_cost)} de venta neta`,
    );
  }

  lines.push("");
  lines.push(
    `### Por familia${d.families.length < d.families_count ? ` (${d.families.length} de ${d.families_count})` : ""}`,
  );
  lines.push(
    tableToMarkdown(d.families, [
      { key: "name", label: "Familia" },
      { key: "net_sales", label: "Venta neta", format: clp, align: "right" },
      { key: "cost_of_sales", label: "Costo", format: clp, align: "right" },
      { key: "margin", label: "Margen", format: clp, align: "right" },
      { key: "margin_pct", label: "Margen %", format: pct, align: "right" },
      { key: "net_sales_without_cost", label: "Venta sin costo", format: clp, align: "right" },
    ]),
  );

  lines.push("");
  lines.push(
    `### Productos ${SORT_TITLE[d.sort] ?? ""} (${d.products.length} de ${formatInt(d.products_count)})`,
  );
  lines.push(
    tableToMarkdown(d.products, [
      { key: "code", label: "Codigo" },
      { key: "description", label: "Producto" },
      { key: "family_name", label: "Familia" },
      {
        key: "quantity_sold",
        label: "Cantidad",
        format: (v) => (v as number).toLocaleString("es-CL"),
        align: "right",
      },
      { key: "net_sales", label: "Venta neta", format: clp, align: "right" },
      { key: "unit_cost", label: "Costo unit.", format: clp, align: "right" },
      { key: "cost_of_sales", label: "Costo", format: clp, align: "right" },
      { key: "margin", label: "Margen", format: clp, align: "right" },
      { key: "margin_pct", label: "Margen %", format: pct, align: "right" },
    ]),
  );
  return lines.join("\n");
}

// MCP tool: get_top_customers -> GET /api/stats/customers/top
//
// Spec ref: sdd/bicom-mcp-v1/spec R11.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BicomApiClient } from "../client/bicom-api.js";
import { formatCLP, formatInt } from "../formatters/currency.js";
import { formatRange } from "../formatters/date.js";
import { tableToMarkdown } from "../formatters/markdown.js";
import type { TopCustomersResponse } from "../schemas/stats.js";
import { topCustomersInput } from "../schemas/stats.js";
import { safeRender } from "./_helpers.js";

export function registerTopCustomers(server: McpServer, api: BicomApiClient): void {
  server.tool(
    "get_top_customers",
    "Clientes que mas compraron en el periodo, rankeados por ingresos (revenue_total neto) DESC. Devuelve customer_id, RUT, razon social, cantidad de documentos e ingresos.",
    topCustomersInput,
    async ({ period, limit }) =>
      safeRender(async () => {
        const data = await api.get<TopCustomersResponse>("/api/stats/customers/top", {
          period,
          limit,
        });
        return render(data, limit ?? 10);
      }),
  );
}

function render(d: TopCustomersResponse, requestedLimit: number): string {
  const lines: string[] = [];
  lines.push(`## 👥 Top ${requestedLimit} clientes`);
  lines.push(`**Periodo:** ${formatRange(d.date_from, d.date_to)}`);
  lines.push("");
  lines.push(
    tableToMarkdown(d.customers, [
      { key: "rut", label: "RUT" },
      { key: "name", label: "Cliente" },
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

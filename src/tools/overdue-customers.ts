// MCP tool: get_overdue_customers -> GET /api/stats/cobranza/overdue
//
// Spec ref: sdd/bicom-mcp-v1/spec R9.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BicomApiClient } from "../client/bicom-api.js";
import { formatCLP, formatInt } from "../formatters/currency.js";
import { toSantiago } from "../formatters/date.js";
import { tableToMarkdown } from "../formatters/markdown.js";
import type { OverdueCustomersResponse } from "../schemas/stats.js";
import { overdueCustomersInput } from "../schemas/stats.js";
import { safeRender } from "./_helpers.js";

export function registerOverdueCustomers(server: McpServer, api: BicomApiClient): void {
  server.tool(
    "get_overdue_customers",
    "Lista de clientes con cuentas por cobrar vencidas hace mas de N dias (default 30), rankeados por total adeudado DESC. Devuelve RUT, razon social, cantidad de documentos vencidos, monto total vencido y dias desde la factura mas antigua. Solo para tenants con new_treasury=1.",
    overdueCustomersInput,
    async ({ days, limit }) =>
      safeRender(async () => {
        const data = await api.get<OverdueCustomersResponse>("/api/stats/cobranza/overdue", {
          days,
          limit,
        });
        return render(data);
      }),
  );
}

function render(d: OverdueCustomersResponse): string {
  const lines: string[] = [];
  lines.push(`## ⏰ Clientes morosos (>${d.min_days_overdue} dias)`);
  lines.push(`**Al ${toSantiago(d.as_of_date)}**`);
  lines.push("");
  lines.push(`- **Total vencido:** ${formatCLP(d.total_overdue)}`);
  lines.push(`- **Clientes morosos:** ${formatInt(d.customers.length)}`);
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
        key: "total_overdue",
        label: "Vencido",
        format: (v) => formatCLP(v as number),
        align: "right",
      },
      {
        key: "oldest_invoice_date",
        label: "Mas antigua",
        format: (v) => toSantiago(v as string),
      },
      { key: "days_overdue", label: "Dias", format: (v) => formatInt(v as number), align: "right" },
    ]),
  );
  return lines.join("\n");
}

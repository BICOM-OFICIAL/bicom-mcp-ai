// MCP tool: get_purchases_summary -> GET /api/stats/purchases/summary
//
// Spec ref: sdd/bicom-mcp-v1/spec R12.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BicomApiClient } from "../client/bicom-api.js";
import { formatCLP, formatInt } from "../formatters/currency.js";
import { formatRange } from "../formatters/date.js";
import { percentDelta, trendArrow } from "../formatters/markdown.js";
import type { PurchasesSummaryResponse } from "../schemas/stats.js";
import { purchasesSummaryInput } from "../schemas/stats.js";
import { safeRender } from "./_helpers.js";

export function registerPurchasesSummary(server: McpServer, api: BicomApiClient): void {
  server.tool(
    "get_purchases_summary",
    "Resumen de compras del periodo (movement_purchases): cantidad de documentos recibidos, totales bruto/neto/IVA, y comparativo contra el periodo anterior. Util para 'cuanto gaste en compras este mes'.",
    purchasesSummaryInput,
    async ({ period }) =>
      safeRender(async () => {
        const data = await api.get<PurchasesSummaryResponse>("/api/stats/purchases/summary", {
          period,
        });
        return render(data);
      }),
  );
}

function render(d: PurchasesSummaryResponse): string {
  const lines: string[] = [];
  lines.push("## 🛒 Resumen de compras");
  lines.push(`**Periodo:** ${formatRange(d.date_from, d.date_to)}`);
  lines.push("");
  lines.push(`- **Documentos recibidos:** ${formatInt(d.documents_count)}`);
  lines.push(`- **Total bruto:** ${formatCLP(d.gross_total)}`);
  lines.push(`- **Total neto:** ${formatCLP(d.net_total)}`);
  lines.push(`- **IVA:** ${formatCLP(d.tax_total)}`);

  if (d.previous_period) {
    const prev = d.previous_period;
    const arrow = trendArrow(d.gross_total, prev.gross_total);
    const pct = percentDelta(d.gross_total, prev.gross_total);
    const delta = d.gross_total - prev.gross_total;
    lines.push("");
    lines.push(`### vs periodo anterior ${arrow}`);
    lines.push(`- Cambio: **${pct}** (${formatCLP(delta)})`);
    lines.push(
      `- Anterior: ${formatInt(prev.documents_count)} docs, ${formatCLP(prev.gross_total)}`,
    );
  }

  return lines.join("\n");
}

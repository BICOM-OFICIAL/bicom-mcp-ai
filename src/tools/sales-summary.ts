// MCP tool: get_sales_summary -> GET /api/stats/sales/summary
//
// Spec ref: sdd/bicom-mcp-v1/spec R5.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BicomApiClient } from "../client/bicom-api.js";
import { formatCLP, formatInt } from "../formatters/currency.js";
import { formatRange } from "../formatters/date.js";
import { percentDelta, tableToMarkdown, trendArrow } from "../formatters/markdown.js";
import type { SalesSummaryResponse } from "../schemas/stats.js";
import { salesSummaryInput } from "../schemas/stats.js";
import { safeRender } from "./_helpers.js";

export function registerSalesSummary(server: McpServer, api: BicomApiClient): void {
  server.tool(
    "get_sales_summary",
    "Resumen de ventas del periodo: cantidad de documentos emitidos, totales bruto/neto/IVA, desglose por tipo de documento (boleta afecta 39, boleta exenta 41, factura afecta 33, factura exenta 34, guia 52, NC 61, ND 56) y comparativo contra el periodo anterior. Solo cuenta documentos aceptados por SII (is_sii=1).",
    salesSummaryInput,
    async ({ period }) =>
      safeRender(async () => {
        const data = await api.get<SalesSummaryResponse>("/api/stats/sales/summary", { period });
        return render(data);
      }),
  );
}

function render(d: SalesSummaryResponse): string {
  const lines: string[] = [];
  lines.push("## 💰 Resumen de ventas");
  lines.push(`**Periodo:** ${formatRange(d.date_from, d.date_to)}`);
  lines.push("");
  lines.push(`- **Documentos emitidos:** ${formatInt(d.documents_count)}`);
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

  if (d.by_doc_type.length > 0) {
    lines.push("");
    lines.push("### Por tipo de documento");
    lines.push(
      tableToMarkdown(d.by_doc_type, [
        { key: "concept_name", label: "Tipo" },
        { key: "count", label: "Docs", format: (v) => formatInt(v as number), align: "right" },
        { key: "total", label: "Total", format: (v) => formatCLP(v as number), align: "right" },
      ]),
    );
  }

  return lines.join("\n");
}

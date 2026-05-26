// MCP tool: get_accounts_receivable -> GET /api/stats/cobranza/summary
//
// Solo disponible para tenants con company_datas.new_treasury=1. Si no, el
// bicom-api devuelve 422 COBRANZA_NOT_ENABLED y safeRender renderiza el
// mensaje friendly automaticamente.
//
// Spec ref: sdd/bicom-mcp-v1/spec R8.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BicomApiClient } from "../client/bicom-api.js";
import { formatCLP, formatInt } from "../formatters/currency.js";
import { toSantiago } from "../formatters/date.js";
import { tableToMarkdown } from "../formatters/markdown.js";
import type { AccountsReceivableResponse, AgingBucket } from "../schemas/stats.js";
import { accountsReceivableInput } from "../schemas/stats.js";
import { safeRender } from "./_helpers.js";

const BUCKET_LABELS: Record<string, string> = {
  current: "Vigente (0–30 dias)",
  overdue_30: "Vencido 31–60 dias",
  overdue_60: "Vencido 61–90 dias",
  overdue_90: "Vencido 91+ dias",
};

export function registerAccountsReceivable(server: McpServer, api: BicomApiClient): void {
  server.tool(
    "get_accounts_receivable",
    "Snapshot de cuentas por cobrar al momento de la consulta: total adeudado por todos los clientes, cantidad de clientes con deuda y desglose en 4 buckets de aging (vigente / 31-60 / 61-90 / 91+ dias). Solo disponible para tenants con tesoreria nueva (new_treasury=1).",
    accountsReceivableInput,
    async () =>
      safeRender(async () => {
        const data = await api.get<AccountsReceivableResponse>("/api/stats/cobranza/summary");
        return render(data);
      }),
  );
}

function render(d: AccountsReceivableResponse): string {
  const lines: string[] = [];
  lines.push("## 📒 Cuentas por cobrar");
  lines.push(`**Al ${toSantiago(d.as_of_date)}**`);
  lines.push("");
  lines.push(`- **Total adeudado:** ${formatCLP(d.total_outstanding)}`);
  lines.push(`- **Clientes con deuda:** ${formatInt(d.customers_with_debt)}`);
  lines.push("");
  lines.push("### Aging por bucket");
  lines.push(
    tableToMarkdown<AgingBucket & Record<string, string | number | null>>(
      d.buckets.map((b) => ({ ...b, _label: BUCKET_LABELS[b.name] ?? b.name })),
      [
        { key: "_label", label: "Bucket" },
        { key: "count", label: "Docs", format: (v) => formatInt(v as number), align: "right" },
        { key: "amount", label: "Monto", format: (v) => formatCLP(v as number), align: "right" },
      ],
    ),
  );
  return lines.join("\n");
}

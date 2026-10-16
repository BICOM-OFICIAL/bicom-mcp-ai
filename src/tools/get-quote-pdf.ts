// MCP tool: get_quote_pdf -> GET /api/quotes/:id/pdf
//
// Re-descarga el PDF de una cotizacion existente. Util si create_quote creo la
// cotizacion pero fallo la generacion del PDF (error PDF_*).

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BicomApiClient } from "../client/bicom-api.js";
import type { Config } from "../config.js";
import { getQuotePdfInput } from "../schemas/quotes.js";
import { safeRender } from "./_helpers.js";
import { savePdf } from "./_pdf.js";

export function registerGetQuotePdf(server: McpServer, api: BicomApiClient, config: Config): void {
  server.tool(
    "get_quote_pdf",
    "Descarga el PDF de una cotizacion existente por su id interno y lo guarda en el computador del usuario.",
    getQuotePdfInput,
    async ({ quote_id }) =>
      safeRender(async () => {
        const res = await api.getBinary(`/api/quotes/${quote_id}/pdf`);
        const path = await savePdf(config.quotesDir, `cotizacion_id_${quote_id}.pdf`, res.bytes);
        return `## 📄 PDF de la cotizacion ${quote_id}\n- **PDF:** \`${path}\``;
      }),
  );
}

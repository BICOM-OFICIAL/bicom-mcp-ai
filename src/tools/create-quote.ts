// MCP tool: create_quote -> POST /api/quotes/agent
//
// Crea una cotizacion (interna, no va al SII ni mueve stock). El endpoint
// resuelve el cliente por RUT (find-or-create), toma el precio de cada linea
// del maestro de productos y responde el PDF binario, que se guarda en
// config.quotesDir.
//
// seller/branchoffice/warehouse/activity se resuelven en este orden:
// argumento del tool -> default del entorno -> unica opcion del tenant. Si
// queda ambiguo, el tool responde las opciones para que el usuario elija.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BicomApiClient } from "../client/bicom-api.js";
import { ApiError } from "../client/errors.js";
import type { Config } from "../config.js";
import { formatCLP } from "../formatters/currency.js";
import type { QuoteAgentOptions, QuoteOption } from "../schemas/quotes.js";
import { createQuoteInput } from "../schemas/quotes.js";
import { safeRender } from "./_helpers.js";
import { savePdf } from "./_pdf.js";
import { QUOTE_OPTIONS_PATH } from "./quote-options.js";

// discount_type del endpoint: 1 = monto, 2 = porcentaje.
const DISCOUNT_AMOUNT = 1;
const DISCOUNT_PERCENT = 2;

export function registerCreateQuote(server: McpServer, api: BicomApiClient, config: Config): void {
  server.tool(
    "create_quote",
    "Crea una cotizacion en BICOM y guarda el PDF en el computador del usuario. ESCRIBE en el ERP y consume un folio: antes de llamarlo, muestra al usuario el cliente, los productos (codigos via search_products), cantidades y descuentos, y pide confirmacion explicita. El precio sale del maestro de productos; si el RUT no existe se crea el cliente.",
    createQuoteInput,
    async (args) =>
      safeRender(async () => {
        const ids = await resolveIds(api, config, args);
        if ("missing" in ids) return ids.missing;

        const body = {
          customer: args.customer,
          seller_id: ids.sellerId,
          branchoffice_id: ids.branchofficeId,
          warehouse_id: ids.warehouseId,
          company_activity_id: ids.activityId,
          quote_date: args.quote_date,
          glosa: args.glosa,
          extended: args.extended,
          details: args.items.map((it) => {
            if (it.discount_percent !== undefined && it.discount_amount !== undefined) {
              throw new ApiError(
                "VALIDATION_ERROR",
                `code=${it.code}: usa discount_percent o discount_amount, no ambos.`,
              );
            }
            const percent = it.discount_percent !== undefined;
            const amount = it.discount_amount !== undefined;
            return {
              code: it.code,
              quantity: it.quantity,
              discount_type: percent ? DISCOUNT_PERCENT : amount ? DISCOUNT_AMOUNT : 0,
              discount_value: it.discount_percent ?? it.discount_amount ?? 0,
              product_descriptions: it.description,
            };
          }),
        };

        const res = await api.postBinary("/api/quotes/agent", body);
        const id = res.headers.get("X-Quote-Id") ?? "?";
        const folio = res.headers.get("X-Quote-Folio") ?? id;
        const total = res.headers.get("X-Quote-Total");
        const path = await savePdf(config.quotesDir, `cotizacion_${folio}.pdf`, res.bytes);

        const lines = [
          "## ✅ Cotizacion creada",
          `- **Folio:** ${folio}`,
          `- **Id interno:** ${id}`,
          `- **Cliente:** ${args.customer.name} (${args.customer.rut})`,
          `- **Lineas:** ${args.items.length}`,
        ];
        if (total) lines.push(`- **Total:** ${formatCLP(Number(total))}`);
        lines.push(`- **PDF:** \`${path}\``);
        return lines.join("\n");
      }),
  );
}

interface ResolvedIds {
  sellerId: number;
  branchofficeId: number;
  warehouseId: number;
  activityId: number;
}

async function resolveIds(
  api: BicomApiClient,
  config: Config,
  args: {
    seller_id?: number;
    branchoffice_id?: number;
    warehouse_id?: number;
    company_activity_id?: number;
  },
): Promise<ResolvedIds | { missing: string }> {
  const d = config.quoteDefaults;
  let sellerId = args.seller_id ?? d.sellerId;
  let branchofficeId = args.branchoffice_id ?? d.branchofficeId;
  let warehouseId = args.warehouse_id ?? d.warehouseId;
  let activityId = args.company_activity_id ?? d.activityId;

  if (sellerId && branchofficeId && warehouseId && activityId) {
    return { sellerId, branchofficeId, warehouseId, activityId };
  }

  const opts = await api.get<QuoteAgentOptions>(QUOTE_OPTIONS_PATH);
  sellerId ??= single(opts.sellers);
  branchofficeId ??= single(opts.branchoffices);
  warehouseId ??= single(opts.warehouses);
  activityId ??= single(opts.company_activities);

  if (sellerId && branchofficeId && warehouseId && activityId) {
    return { sellerId, branchofficeId, warehouseId, activityId };
  }

  // Ambiguo: devolver las opciones pendientes para que el usuario elija.
  const lines = [
    "**Falta elegir algunos datos para crear la cotizacion** (no se creo nada todavia).",
    "Pregunta al usuario y vuelve a llamar create_quote con estos ids:",
    "",
  ];
  if (!sellerId) pending(lines, "seller_id (vendedor)", opts.sellers);
  if (!branchofficeId) pending(lines, "branchoffice_id (sucursal)", opts.branchoffices);
  if (!warehouseId) pending(lines, "warehouse_id (bodega)", opts.warehouses);
  if (!activityId) pending(lines, "company_activity_id (giro)", opts.company_activities);
  lines.push(
    "_Tip: para no elegirlos cada vez, configura BICOM_DEFAULT_SELLER_ID, BICOM_DEFAULT_BRANCHOFFICE_ID, BICOM_DEFAULT_WAREHOUSE_ID y BICOM_DEFAULT_ACTIVITY_ID en el config del MCP._",
  );
  return { missing: lines.join("\n") };
}

function single(items: QuoteOption[]): number | undefined {
  return items.length === 1 ? items[0]?.id : undefined;
}

function pending(lines: string[], label: string, items: QuoteOption[]): void {
  lines.push(`**${label}:**`);
  if (items.length === 0) {
    lines.push("- _La empresa no tiene registros configurados en BICOM._");
  }
  for (const it of items) lines.push(`- ${it.id}: ${it.name}`);
  lines.push("");
}

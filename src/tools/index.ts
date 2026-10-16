// Tools registry — registra los tools del MCP en el server: 8 de stats
// (solo lectura) + 4 de cotizaciones (busqueda, opciones, crear, PDF).
//
// Spec ref: sdd/bicom-mcp-v1/spec R5-R12.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BicomApiClient } from "../client/bicom-api.js";
import type { Config } from "../config.js";

import { registerAccountsReceivable } from "./accounts-receivable.js";
import { registerCreateQuote } from "./create-quote.js";
import { registerGetQuotePdf } from "./get-quote-pdf.js";
import { registerLowStockProducts } from "./low-stock-products.js";
import { registerOverdueCustomers } from "./overdue-customers.js";
import { registerPurchasesSummary } from "./purchases-summary.js";
import { registerQuoteOptions } from "./quote-options.js";
import { registerSalesSummary } from "./sales-summary.js";
import { registerSearchProducts } from "./search-products.js";
import { registerTopCustomers } from "./top-customers.js";
import { registerTopProducts } from "./top-products.js";
import { registerTopSellers } from "./top-sellers.js";

export function registerAllTools(server: McpServer, api: BicomApiClient, config: Config): void {
  registerSalesSummary(server, api);
  registerTopProducts(server, api);
  registerTopSellers(server, api);
  registerAccountsReceivable(server, api);
  registerOverdueCustomers(server, api);
  registerLowStockProducts(server, api);
  registerTopCustomers(server, api);
  registerPurchasesSummary(server, api);

  registerSearchProducts(server, api);
  registerQuoteOptions(server, api);
  registerCreateQuote(server, api, config);
  registerGetQuotePdf(server, api, config);
}

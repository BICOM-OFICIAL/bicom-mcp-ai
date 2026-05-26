// Tools registry — registra los 8 tools del MCP en el server.
//
// Spec ref: sdd/bicom-mcp-v1/spec R5-R12.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BicomApiClient } from "../client/bicom-api.js";

import { registerAccountsReceivable } from "./accounts-receivable.js";
import { registerLowStockProducts } from "./low-stock-products.js";
import { registerOverdueCustomers } from "./overdue-customers.js";
import { registerPurchasesSummary } from "./purchases-summary.js";
import { registerSalesSummary } from "./sales-summary.js";
import { registerTopCustomers } from "./top-customers.js";
import { registerTopProducts } from "./top-products.js";
import { registerTopSellers } from "./top-sellers.js";

export function registerAllTools(server: McpServer, api: BicomApiClient): void {
  registerSalesSummary(server, api);
  registerTopProducts(server, api);
  registerTopSellers(server, api);
  registerAccountsReceivable(server, api);
  registerOverdueCustomers(server, api);
  registerLowStockProducts(server, api);
  registerTopCustomers(server, api);
  registerPurchasesSummary(server, api);
}

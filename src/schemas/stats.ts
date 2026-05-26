// Zod input schemas + TypeScript response types for the 8 stats endpoints.
//
// Inputs are validated by the MCP SDK before reaching the handler (each tool
// declares its zod shape). Response types are trusted (the bicom-api server
// is the source of truth) — we don't re-validate on the wire to keep latency
// low.
//
// Spec ref: sdd/bicom-mcp-v1/spec R2 (period enum), R5-R12 (response shapes).

import { z } from "zod";

// =============================================================================
// Period enum (R2)
// =============================================================================

export const PeriodSchema = z
  .enum([
    "today",
    "yesterday",
    "current_week",
    "current_month",
    "last_month",
    "current_quarter",
    "current_year",
  ])
  .describe(
    "Periodo del reporte. Default: current_month. Opciones: today | yesterday | current_week | current_month | last_month | current_quarter | current_year",
  );

export type Period = z.infer<typeof PeriodSchema>;

// Limit shape para tools que devuelven listas rankeadas (R4).
const Limit = z
  .number()
  .int()
  .min(1)
  .max(100)
  .describe("Cantidad maxima de resultados a retornar (1..100).");

// =============================================================================
// SALES (R5, R6, R7)
// =============================================================================

export interface SalesSummaryResponse {
  period: string;
  date_from: string;
  date_to: string;
  documents_count: number;
  gross_total: number;
  net_total: number;
  tax_total: number;
  by_doc_type: SalesByDocType[];
  previous_period?: { documents_count: number; gross_total: number };
}

export interface SalesByDocType {
  code_sii: string;
  concept_name: string;
  count: number;
  total: number;
}

export interface TopProductsResponse {
  period: string;
  date_from: string;
  date_to: string;
  products: TopProduct[];
}

export interface TopProduct {
  product_id: number;
  code: string;
  description: string;
  quantity_sold: number;
  revenue_total: number;
}

export interface TopSellersResponse {
  period: string;
  date_from: string;
  date_to: string;
  sellers: TopSeller[];
}

export interface TopSeller {
  seller_id: number;
  description: string;
  documents_count: number;
  revenue_total: number;
}

// =============================================================================
// COBRANZA (R8, R9)
// =============================================================================

export interface AccountsReceivableResponse {
  as_of_date: string;
  total_outstanding: number;
  customers_with_debt: number;
  buckets: AgingBucket[];
}

export interface AgingBucket {
  name: string;
  min_days: number;
  max_days: number | null;
  amount: number;
  count: number;
}

export interface OverdueCustomersResponse {
  as_of_date: string;
  min_days_overdue: number;
  total_overdue: number;
  customers: OverdueCustomer[];
}

export interface OverdueCustomer {
  customer_id: number;
  rut: string;
  name: string;
  documents_count: number;
  total_overdue: number;
  oldest_invoice_date: string;
  days_overdue: number;
}

// =============================================================================
// STOCK (R10)
// =============================================================================

export interface LowStockProductsResponse {
  as_of_date: string;
  threshold: number;
  products: LowStockProduct[];
}

export interface LowStockProduct {
  product_id: number;
  code: string;
  description: string;
  warehouse_id: number;
  warehouse_name: string;
  stock_current: number;
}

// =============================================================================
// CUSTOMERS (R11)
// =============================================================================

export interface TopCustomersResponse {
  period: string;
  date_from: string;
  date_to: string;
  customers: TopCustomer[];
}

export interface TopCustomer {
  customer_id: number;
  rut: string;
  name: string;
  documents_count: number;
  revenue_total: number;
}

// =============================================================================
// PURCHASES (R12)
// =============================================================================

export interface PurchasesSummaryResponse {
  period: string;
  date_from: string;
  date_to: string;
  documents_count: number;
  gross_total: number;
  net_total: number;
  tax_total: number;
  previous_period?: { documents_count: number; gross_total: number };
}

// =============================================================================
// Tool input shapes (zod raw shapes — el MCP SDK las acepta directo)
// =============================================================================

export const salesSummaryInput = {
  period: PeriodSchema.optional().default("current_month"),
};

export const topProductsInput = {
  period: PeriodSchema.optional().default("current_month"),
  limit: Limit.optional().default(10),
};

export const topSellersInput = {
  period: PeriodSchema.optional().default("current_month"),
  limit: Limit.optional().default(10),
};

export const accountsReceivableInput = {} as const;

export const overdueCustomersInput = {
  days: z
    .number()
    .int()
    .min(1)
    .max(365)
    .optional()
    .default(30)
    .describe("Dias minimos de vencimiento para considerar moroso (1..365). Default 30."),
  limit: Limit.optional().default(20),
};

export const lowStockProductsInput = {
  threshold: z
    .number()
    .int()
    .min(0)
    .max(1000)
    .optional()
    .default(10)
    .describe("Umbral de stock. Devuelve productos con stock <= threshold. Default 10."),
  limit: Limit.optional().default(20),
};

export const topCustomersInput = {
  period: PeriodSchema.optional().default("current_month"),
  limit: Limit.optional().default(10),
};

export const purchasesSummaryInput = {
  period: PeriodSchema.optional().default("current_month"),
};

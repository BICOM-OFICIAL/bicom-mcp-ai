// Zod input schemas + TypeScript response types for the 9 stats endpoints.
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

// Rango libre (date_from/date_to, inclusivo). Si llega date_from manda sobre
// period: la API lo resuelve asi porque period siempre viaja con su default.
const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha en formato YYYY-MM-DD");

const periodOrRange = {
  period: PeriodSchema.optional().default("current_month"),
  date_from: IsoDate.optional().describe(
    "Fecha desde (YYYY-MM-DD, inclusiva) para un rango libre, por ejemplo los ultimos 90 dias. Si se envia, reemplaza a period. Rango maximo 366 dias.",
  ),
  date_to: IsoDate.optional().describe(
    "Fecha hasta o de corte (YYYY-MM-DD, inclusiva, no futura). Requiere date_from. Default: hoy.",
  ),
};

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
  // Notas de credito del periodo, en positivo. Ya estan restadas de los totales.
  credit_notes: { documents_count: number; gross_total: number; net_total: number };
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
  // Costos unitarios netos; null si no hay dato.
  unit_cost_average: number | null;
  unit_cost_last_purchase: number | null;
}

export type CostBasis = "average" | "last_purchase";
export type MarginSort = "net_sales" | "margin" | "lowest_margin_pct";

export interface SalesMarginResponse {
  period: string;
  date_from: string;
  date_to: string;
  cost_basis: CostBasis;
  cost_note: string;
  sort: MarginSort;
  totals: MarginTotals;
  families_count: number;
  families: MarginFamily[];
  products_count: number;
  products: MarginProduct[];
}

export interface MarginTotals {
  quantity_sold: number;
  net_sales: number;
  cost_of_sales: number;
  margin: number;
  margin_pct: number | null;
  markup_pct: number | null;
  // Ventas de productos sin costo conocido: no entran al margen.
  net_sales_without_cost: number;
  products_without_cost: number;
}

export interface MarginFamily extends MarginTotals {
  group_id: number | null;
  name: string;
}

export interface MarginProduct {
  product_id: number;
  code: string;
  description: string;
  group_id: number | null;
  family_name: string;
  quantity_sold: number;
  net_sales: number;
  unit_cost: number | null;
  cost_of_sales: number | null;
  margin: number | null;
  margin_pct: number | null;
  markup_pct: number | null;
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
  ...periodOrRange,
};

export const topProductsInput = {
  ...periodOrRange,
  limit: Limit.optional().default(10),
};

export const topSellersInput = {
  ...periodOrRange,
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
  ...periodOrRange,
  limit: Limit.optional().default(10),
};

export const purchasesSummaryInput = {
  ...periodOrRange,
};

export const salesMarginInput = {
  ...periodOrRange,
  limit: Limit.optional()
    .default(20)
    .describe(
      "Cantidad maxima de productos a listar (1..100). Default 20. Los totales y las familias siempre cubren todo el periodo.",
    ),
  sort: z
    .enum(["net_sales", "margin", "lowest_margin_pct"])
    .optional()
    .default("net_sales")
    .describe(
      "Orden de los productos: net_sales (mas vendidos, default) | margin (mas margen en pesos) | lowest_margin_pct (menor margen %, para detectar productos que dejan poco o pierden).",
    ),
  cost_basis: z
    .enum(["average", "last_purchase"])
    .optional()
    .default("average")
    .describe(
      "Base del costo: average (costo promedio ponderado a la fecha hasta, default) | last_purchase (costo de la ultima compra actual del producto).",
    ),
};

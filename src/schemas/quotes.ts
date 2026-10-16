// Zod input schemas + TypeScript response types para los tools de cotizaciones.
//
// Endpoints:
//   GET  /api/inventory/stock?search=&limit=  -> busqueda de productos (codigo + precio)
//   GET  /api/quotes/agent/options            -> vendedores, sucursales, bodegas, actividades
//   POST /api/quotes/agent                    -> crea cliente (find-or-create por RUT) + cotizacion; responde el PDF
//   GET  /api/quotes/:id/pdf                  -> re-descarga el PDF

import { z } from "zod";

// =============================================================================
// Responses
// =============================================================================

export interface ProductStock {
  product_id: number;
  code: string;
  description: string;
  measurement_unit: string;
  price_net: number;
  price_brute: number;
  stock: number;
  is_active: number;
}

export interface StockSearchResponse {
  data: ProductStock[];
  total: number;
  limit: number;
  offset: number;
}

export interface QuoteOption {
  id: number;
  name: string;
}

export interface QuoteAgentOptions {
  sellers: QuoteOption[];
  branchoffices: QuoteOption[];
  warehouses: QuoteOption[];
  company_activities: QuoteOption[];
}

// =============================================================================
// Inputs
// =============================================================================

const OptionalId = (what: string) =>
  z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      `${what}. Opcional: si se omite se usa el default configurado o la unica opcion disponible (ver get_quote_options).`,
    );

export const searchProductsInput = {
  search: z
    .string()
    .min(1)
    .describe("Texto a buscar en codigo, codigo de barras o descripcion del producto."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(10)
    .describe("Cantidad maxima de resultados (1..50). Default 10."),
};

export const quoteOptionsInput = {} as const;

export const createQuoteInput = {
  customer: z
    .object({
      rut: z.string().min(3).describe("RUT del cliente, con o sin puntos (ej 76.123.456-7)."),
      name: z.string().min(1).describe("Razon social o nombre del cliente."),
      address: z.string().optional().describe("Direccion (opcional)."),
      phone: z.string().optional().describe("Telefono (opcional)."),
      email: z.string().optional().describe("Email (opcional)."),
    })
    .describe(
      "Cliente. Si el RUT ya existe en BICOM se reutiliza tal cual; si no, se crea con estos datos.",
    ),
  items: z
    .array(
      z.object({
        code: z
          .string()
          .min(1)
          .describe("Codigo del producto en BICOM (obtenerlo con search_products)."),
        quantity: z.number().positive().describe("Cantidad (> 0)."),
        discount_percent: z
          .number()
          .min(0)
          .max(100)
          .optional()
          .describe("Descuento porcentual de la linea (0..100). Opcional."),
        discount_amount: z
          .number()
          .min(0)
          .optional()
          .describe(
            "Descuento en monto CLP de la linea. Opcional; no combinar con discount_percent.",
          ),
        description: z
          .string()
          .optional()
          .describe("Descripcion extendida de la linea (se imprime solo en el PDF extendido)."),
      }),
    )
    .min(1)
    .max(200)
    .describe("Lineas de la cotizacion. El precio sale del maestro de productos de BICOM."),
  seller_id: OptionalId("Id del vendedor"),
  branchoffice_id: OptionalId("Id de la sucursal"),
  warehouse_id: OptionalId("Id de la bodega"),
  company_activity_id: OptionalId("Id de la actividad economica (giro) de la empresa"),
  glosa: z.string().max(200).optional().describe("Glosa / observacion (max 200 caracteres)."),
  quote_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe("Fecha de la cotizacion YYYY-MM-DD. Default hoy."),
  extended: z
    .boolean()
    .optional()
    .default(false)
    .describe("true = PDF extendido (incluye la descripcion extendida por linea)."),
};

export const getQuotePdfInput = {
  quote_id: z.number().int().positive().describe("Id interno de la cotizacion (no el folio)."),
};

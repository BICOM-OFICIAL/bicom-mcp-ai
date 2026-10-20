// MCP tool: get_product_stock -> GET /api/inventory/stock?search= + GET /api/inventory/stock/:id
//
// Stock de un producto desglosado por bodega. Primero resuelve el producto por
// codigo (la busqueda tambien matchea descripcion y codigo de barras) y despues
// pide el desglose, que la API calcula del snapshot mensual + movimientos.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BicomApiClient } from "../client/bicom-api.js";
import { formatCLP } from "../formatters/currency.js";
import { tableToMarkdown } from "../formatters/markdown.js";
import type {
  ProductStock,
  StockSearchResponse,
  WarehouseStockResponse,
} from "../schemas/quotes.js";
import { productStockInput } from "../schemas/quotes.js";
import { safeRender } from "./_helpers.js";

const CANDIDATES = 10;

export function registerProductStock(server: McpServer, api: BicomApiClient): void {
  server.tool(
    "get_product_stock",
    "Stock de un producto desglosado por bodega, con el total. Recibe el codigo del producto (si no es exacto, lista los candidatos para elegir). Las bodegas no estan asociadas a una sucursal en BICOM: para hablar de una sucursal, usa la bodega cuyo nombre la identifica.",
    productStockInput,
    async ({ code }) =>
      safeRender(async () => {
        const found = await api.get<StockSearchResponse>("/api/inventory/stock", {
          search: code,
          limit: CANDIDATES,
        });
        const product = pickProduct(code, found.data);
        if (!product) return renderCandidates(code, found);
        const stock = await api.get<WarehouseStockResponse>(
          `/api/inventory/stock/${product.product_id}`,
        );
        return render(product, stock);
      }),
  );
}

// pickProduct: codigo exacto (sin distinguir mayusculas) o, si la busqueda
// devolvio un solo producto, ese.
function pickProduct(code: string, rows: ProductStock[]): ProductStock | undefined {
  const wanted = code.trim().toLowerCase();
  const exact = rows.filter((p) => p.code.trim().toLowerCase() === wanted);
  if (exact.length === 1) return exact[0];
  return rows.length === 1 ? rows[0] : undefined;
}

function renderCandidates(code: string, d: StockSearchResponse): string {
  if (d.data.length === 0) {
    return `_No se encontro ningun producto para "${code}". Prueba con search_products._`;
  }
  const lines: string[] = [];
  lines.push(`## 🔎 Hay varios productos para "${code}"`);
  lines.push("Indica el codigo exacto para ver su stock por bodega:");
  lines.push("");
  lines.push(
    tableToMarkdown(d.data, [
      { key: "code", label: "Codigo" },
      { key: "description", label: "Descripcion" },
      { key: "stock", label: "Stock total", align: "right" },
    ]),
  );
  return lines.join("\n");
}

const qty = (v: unknown): string => (v as number).toLocaleString("es-CL");

function render(p: ProductStock, d: WarehouseStockResponse): string {
  const rows = d.data ?? [];
  const lines: string[] = [];
  lines.push(`## 📦 Stock por bodega: ${p.description} (${p.code})`);
  lines.push(`**Precio c/IVA:** ${formatCLP(p.price_brute)}`);
  lines.push("");
  lines.push(
    tableToMarkdown(
      rows,
      [
        { key: "warehouse_name", label: "Bodega" },
        { key: "stock", label: "Stock", format: qty, align: "right" },
      ],
      "_El producto no tiene stock en ninguna bodega._",
    ),
  );
  if (rows.length > 0) {
    const total = rows.reduce((acc, r) => acc + r.stock, 0);
    lines.push("");
    lines.push(`**Total:** ${qty(total)}`);
    lines.push("_Las bodegas que no aparecen tienen stock 0._");
  }
  return lines.join("\n");
}

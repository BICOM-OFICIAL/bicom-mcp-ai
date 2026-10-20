import { type Server, createServer as createHttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BicomApiClient } from "../src/client/bicom-api.js";
import type { SalesMarginResponse } from "../src/schemas/stats.js";
import { registerSalesMargin } from "../src/tools/sales-margin.js";
import { registerSalesSummary } from "../src/tools/sales-summary.js";
import { registerSearchProducts } from "../src/tools/search-products.js";
import { registerTopProducts } from "../src/tools/top-products.js";

const RANGE = { period: "custom", date_from: "2026-07-01", date_to: "2026-09-28" };

const MARGIN: SalesMarginResponse = {
  ...RANGE,
  cost_basis: "average",
  cost_note: "Costo promedio ponderado de compra a la fecha hasta.",
  sort: "lowest_margin_pct",
  totals: {
    quantity_sold: 18,
    net_sales: 4700,
    cost_of_sales: 1090,
    margin: 610,
    margin_pct: 35.88,
    markup_pct: 55.96,
    net_sales_without_cost: 3000,
    products_without_cost: 1,
  },
  families_count: 1,
  families: [
    {
      group_id: 7,
      name: "Ferreteria",
      quantity_sold: 15,
      net_sales: 1500,
      cost_of_sales: 1050,
      margin: 450,
      margin_pct: 30,
      markup_pct: 42.86,
      net_sales_without_cost: 0,
      products_without_cost: 0,
    },
  ],
  products_count: 4,
  products: [
    {
      product_id: 2,
      code: "T2",
      description: "Tuerca",
      group_id: 7,
      family_name: "Ferreteria",
      quantity_sold: 5,
      net_sales: 500,
      unit_cost: 90,
      cost_of_sales: 450,
      margin: 50,
      margin_pct: 10,
      markup_pct: 11.11,
    },
    {
      product_id: 3,
      code: "H1",
      description: "Taladro",
      group_id: 8,
      family_name: "Herramientas",
      quantity_sold: 1,
      net_sales: 3000,
      unit_cost: null,
      cost_of_sales: null,
      margin: null,
      margin_pct: null,
      markup_pct: null,
    },
  ],
};

const BODIES: Record<string, unknown> = {
  "/api/stats/sales/margin": MARGIN,
  "/api/stats/sales/summary": {
    ...RANGE,
    documents_count: 12,
    gross_total: 107100,
    net_total: 90000,
    tax_total: 17100,
    credit_notes: { documents_count: 2, gross_total: 11900, net_total: 10000 },
    by_doc_type: [],
  },
  "/api/stats/sales/top-products": {
    ...RANGE,
    products: [
      {
        product_id: 1,
        code: "T1",
        description: "Tornillo",
        quantity_sold: 10,
        revenue_total: 1000,
        unit_cost_average: 60.5,
        unit_cost_last_purchase: null,
      },
    ],
  },
  "/api/inventory/stock": {
    data: [
      {
        product_id: 1,
        code: "T1",
        description: "Tornillo",
        measurement_unit: "UN",
        price_net: 100,
        price_brute: 119,
        stock: 40,
        is_active: 1,
        unit_cost_average: 61,
      },
    ],
    total: 1,
    limit: 10,
    offset: 0,
  },
};

let http: Server;
let client: Client;
let seen: URL[];

beforeAll(async () => {
  http = createHttpServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://x");
    seen.push(url);
    const body = BODIES[url.pathname];
    res.statusCode = body ? 200 : 404;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(body ?? {}));
  });
  await new Promise<void>((r) => http.listen(0, "127.0.0.1", r));
  const api = new BicomApiClient(
    `http://127.0.0.1:${(http.address() as AddressInfo).port}`,
    "test-token",
  );

  const server = new McpServer({ name: "test", version: "0.0.0" });
  registerSalesSummary(server, api);
  registerTopProducts(server, api);
  registerSalesMargin(server, api);
  registerSearchProducts(server, api);
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  client = new Client({ name: "test-client", version: "0.0.0" });
  await client.connect(b);
});

afterAll(() => {
  http.close();
});

beforeEach(() => {
  seen = [];
});

async function call(name: string, args: Record<string, unknown>): Promise<string> {
  const res = await client.callTool({ name, arguments: args });
  expect(res.isError).toBeFalsy();
  return (res.content as Array<{ type: string; text: string }>)[0].text;
}

describe("stats tools", () => {
  it("forwards the free date range", async () => {
    await call("get_top_products", { date_from: "2026-07-01", date_to: "2026-09-28" });
    const q = seen[0].searchParams;
    expect(q.get("date_from")).toBe("2026-07-01");
    expect(q.get("date_to")).toBe("2026-09-28");
    // period viaja con su default: la API le da prioridad a las fechas.
    expect(q.get("period")).toBe("current_month");
  });

  it("omits the range when it is not given", async () => {
    await call("get_sales_summary", { period: "last_month" });
    const q = seen[0].searchParams;
    expect(q.get("period")).toBe("last_month");
    expect(q.has("date_from")).toBe(false);
    expect(q.has("date_to")).toBe(false);
  });

  it("rejects a malformed date before calling the API", async () => {
    const res = await client.callTool({
      name: "get_sales_summary",
      arguments: { date_from: "01-07-2026" },
    });
    expect(res.isError).toBe(true);
    expect(seen).toHaveLength(0);
  });

  it("shows credit notes as already subtracted", async () => {
    const out = await call("get_sales_summary", {});
    expect(out).toContain("Notas de credito (ya restadas):** 2 docs");
  });

  it("shows unit costs in top products", async () => {
    const out = await call("get_top_products", {});
    expect(out).toContain("Costo prom.");
    expect(out).toMatch(/\| \$61 \| — \|/);
  });

  it("asks for the cost in search_products", async () => {
    const out = await call("search_products", { search: "tornillo" });
    expect(seen[0].searchParams.get("include")).toBe("cost");
    expect(out).toContain("Costo prom. neto");
  });

  it("renders the margin report and forwards its options", async () => {
    const out = await call("get_sales_margin", {
      date_from: "2026-07-01",
      sort: "lowest_margin_pct",
      cost_basis: "last_purchase",
      limit: 5,
    });
    const q = seen[0].searchParams;
    expect(seen[0].pathname).toBe("/api/stats/sales/margin");
    expect(q.get("sort")).toBe("lowest_margin_pct");
    expect(q.get("cost_basis")).toBe("last_purchase");
    expect(q.get("limit")).toBe("5");

    expect(out).toContain("**Margen:** $610 (35,88 % sobre la venta con costo)");
    expect(out).toContain("1 productos, $3.000 de venta neta");
    expect(out).toContain("Productos con menor margen % (2 de 4)");
    // Producto sin costo: celdas vacias, no $0.
    expect(out).toContain("| H1 | Taladro | Herramientas | 1 | $3.000 | — | — | — | — |");
  });

  it("uses the margin defaults", async () => {
    await call("get_sales_margin", {});
    const q = seen[0].searchParams;
    expect(q.get("sort")).toBe("net_sales");
    expect(q.get("cost_basis")).toBe("average");
    expect(q.get("limit")).toBe("20");
  });
});

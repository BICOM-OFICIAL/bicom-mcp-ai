import { mkdtemp, readFile } from "node:fs/promises";
import { type IncomingMessage, type Server, createServer as createHttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Config } from "../src/config.js";
import { createServer } from "../src/server.js";

interface Captured {
  method?: string;
  url?: string;
  headers?: IncomingMessage["headers"];
  body?: Record<string, unknown>;
}

const OPTIONS = {
  sellers: [{ id: 3, name: "Ana" }],
  branchoffices: [{ id: 1, name: "Casa Matriz" }],
  warehouses: [
    { id: 1, name: "Bodega Central" },
    { id: 2, name: "Bodega Sur" },
  ],
  company_activities: [{ id: 685, name: "VENTA AL POR MENOR" }],
};

let http: Server;
let baseUrl: string;
let posts: Captured[];
let pdfFails: boolean;

beforeAll(async () => {
  http = createHttpServer((req, res) => {
    let raw = "";
    req.on("data", (c) => {
      raw += c;
    });
    req.on("end", () => {
      if (req.method === "GET" && req.url === "/api/quotes/agent/options") {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(OPTIONS));
        return;
      }
      if (req.method === "POST" && req.url === "/api/quotes/agent") {
        posts.push({
          method: req.method,
          url: req.url,
          headers: req.headers,
          body: JSON.parse(raw),
        });
        res.setHeader("X-Quote-Id", "42");
        res.setHeader("X-Quote-Folio", "1001");
        res.setHeader("X-Quote-Total", "11900");
        if (pdfFails) {
          res.statusCode = 502;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({ error: { code: "PDF_UPSTREAM_ERROR", message: "newpdf caido" } }),
          );
          return;
        }
        res.setHeader("Content-Type", "application/pdf");
        res.end("%PDF-1.4 fake");
        return;
      }
      res.statusCode = 404;
      res.end();
    });
  });
  await new Promise<void>((r) => http.listen(0, "127.0.0.1", r));
  baseUrl = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
});

afterAll(() => {
  http.close();
});

beforeEach(() => {
  posts = [];
  pdfFails = false;
});

async function connect(overrides: Partial<Config> = {}) {
  const config: Config = {
    baseUrl,
    token: "t",
    quotesDir: await mkdtemp(join(tmpdir(), "quotes-")),
    quoteDefaults: {},
    ...overrides,
  };
  const server = createServer(config);
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  const client = new Client({ name: "test", version: "0" });
  await client.connect(b);
  return { client, config };
}

const ARGS = {
  customer: { rut: "76.123.456-7", name: "Acme SpA" },
  items: [
    { code: "P001", quantity: 2, discount_percent: 10 },
    { code: "P002", quantity: 1 },
  ],
};

function text(res: Awaited<ReturnType<Client["callTool"]>>): string {
  return (res.content as Array<{ text: string }>)[0]?.text ?? "";
}

describe("create_quote", () => {
  it("lists the ambiguous options and does not create anything", async () => {
    const { client } = await connect();
    const res = await client.callTool({ name: "create_quote", arguments: ARGS });
    expect(text(res)).toContain("warehouse_id (bodega)");
    expect(text(res)).toContain("2: Bodega Sur");
    expect(text(res)).not.toContain("seller_id");
    expect(posts).toHaveLength(0);
  });

  it("creates the quote, maps discounts and saves the PDF", async () => {
    const { client, config } = await connect({ quoteDefaults: { warehouseId: 2 } });
    const res = await client.callTool({ name: "create_quote", arguments: ARGS });

    expect(res.isError).toBeFalsy();
    expect(text(res)).toContain("**Folio:** 1001");
    expect(posts).toHaveLength(1);
    const post = posts[0];
    expect(post?.headers?.["idempotency-key"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(post?.body).toMatchObject({
      seller_id: 3,
      branchoffice_id: 1,
      warehouse_id: 2,
      company_activity_id: 685,
      extended: false,
      details: [
        { code: "P001", quantity: 2, discount_type: 2, discount_value: 10 },
        { code: "P002", quantity: 1, discount_type: 0, discount_value: 0 },
      ],
    });
    const pdf = await readFile(join(config.quotesDir, "cotizacion_1001.pdf"), "utf8");
    expect(pdf).toBe("%PDF-1.4 fake");
  });

  it("reports the created quote id when the PDF fails", async () => {
    pdfFails = true;
    const { client } = await connect({ quoteDefaults: { warehouseId: 1 } });
    const res = await client.callTool({ name: "create_quote", arguments: ARGS });
    expect(res.isError).toBe(true);
    expect(text(res)).toContain("PDF_UPSTREAM_ERROR");
    expect(text(res)).toContain("quote_id=42");
  });
});

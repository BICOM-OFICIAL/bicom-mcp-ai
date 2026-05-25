# bicom-mcp-ai

Model Context Protocol server for the **BICOM** Chilean ERP. Lets companies that use BICOM ask meaningful questions about their own business data (sales, accounts receivable, stock, customers, purchases) through Claude Desktop or any MCP-compatible client.

## Status

🚧 **Under development** — SDD phase: `apply (Batch B pending)`. Implementation has not started in earnest yet; only repo scaffolding and the supporting database migration (`bicom-api/migrations/012_stats_indices.sql`) are in place.

- Architecture: API-backed (this MCP calls `bicom-api` REST endpoints, no direct DB access).
- Stack: TypeScript + pnpm + `@modelcontextprotocol/sdk`.
- Multi-tenant via the existing `api_tokens` of `bicom-api` (Bearer auth).
- Transport: STDIO (V1).

## Tools planned (V1)

| Tool | Question it answers |
|---|---|
| `get_sales_summary` | How much did I sell this period vs the previous one? |
| `get_top_products` | Which products sold the most? |
| `get_top_sellers` | Which seller / branch sold the most? |
| `get_accounts_receivable` | How much do my customers owe me right now? |
| `get_overdue_customers` | Who are my overdue customers? |
| `get_low_stock_products` | Which products are running low? |
| `get_top_customers` | Who are my best customers? |
| `get_purchases_summary` | How much did I spend on purchases this period? |

## Spec references

- Exploration: Engram `sdd/bicom-mcp-v1/exploration` (id 231)
- Proposal: Engram `sdd/bicom-mcp-v1/proposal` (id 232)
- Spec: Engram `sdd/bicom-mcp-v1/spec` (next)

## Companion repo

- [`bicom-api`](https://github.com/BICOM-OFICIAL/bicom-api-go) — Go backend, needs new `/api/stats/*` endpoints for this MCP.

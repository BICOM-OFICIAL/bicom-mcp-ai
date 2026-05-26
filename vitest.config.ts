import { defineConfig } from "vitest/config";

// Vitest config for bicom-mcp-ai.
//
// Tests live under `tests/` (alongside `src/`). Coverage targets `src/`.
// Globals enabled so test files don't need to import describe/it/expect.
export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["tests/**/*.test.ts"],
		coverage: {
			provider: "v8",
			include: ["src/**"],
			exclude: ["src/index.ts", "src/server.ts"],
			reporter: ["text", "html"],
		},
	},
});

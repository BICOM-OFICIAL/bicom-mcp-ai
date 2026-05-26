import { defineConfig } from "tsup";

// tsup config for bicom-mcp-ai
//
// Output: single ESM bundle at dist/index.js with a shebang line so it can
// be invoked as a bin from package.json. Sourcemap + dts emitted alongside.
//
// node20 target — required by @modelcontextprotocol/sdk and native fetch.
export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	target: "node20",
	platform: "node",
	sourcemap: true,
	dts: true,
	clean: true,
	shims: false,
	banner: {
		// Hashbang so the compiled dist/index.js works as a CLI bin.
		js: "#!/usr/bin/env node",
	},
	splitting: false,
	bundle: true,
});

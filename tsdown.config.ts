import { defineConfig } from "tsdown";

export default defineConfig([
    // ESM bundle — full SDK (main entry + types)
    {
        entry:  ["src/index.ts"],
        dts: true,
        sourcemap: true,
        platform: "browser",
  },

    // CommonJS bundle (only the PocketBase client as default export).
    {
        entry: {"index": "src/Client.ts"},
        format: "cjs",
        globalName: "PocketBase",
        dts: false,
        sourcemap: true,
    },

    // UMD bundle (only the PocketBase client as default export).
    {
        entry: {"index": "src/Client.ts"},
        format: "umd",
        globalName: "PocketBase",
        dts: false,
        sourcemap: true,
        minify: true,
        platform: "neutral",
    },

    // !!!
    // @deprecated — kept only for backwards compatibility, will be removed in v1.0.0
    // !!!
    //
    // Browser-friendly IIFE bundle — PocketBase client only
    // Entry key is "pocketbase"
    {
        entry: {"index": "src/Client.ts"},
        format: "iife",
        globalName: "PocketBase",
        dts: false,
        sourcemap: true,
        minify: true,
        platform: "browser",
    },
]);

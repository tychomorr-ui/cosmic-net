import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
      "@cosmic-mesh/protocol": new URL("./packages/protocol/ts/index.ts", import.meta.url).pathname,
    },
  },
  test: { environment: "node" },
});
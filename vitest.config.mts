import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  // tsconfig keeps JSX for Next; tests compile it with the automatic React runtime.
  oxc: { jsx: { runtime: "automatic" } },
  test: { environment: "node" },
});

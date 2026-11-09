import { configDefaults, defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  // tsconfig keeps JSX for Next; tests compile it with the automatic React runtime.
  oxc: { jsx: { runtime: "automatic" } },
  // Other sessions' git worktrees live under .claude/; their tests aren't this checkout's.
  test: { environment: "node", exclude: [...configDefaults.exclude, ".claude/**"] },
});

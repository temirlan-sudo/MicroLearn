import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["backend/**", "node_modules/**", ".next/**"],
  },
})

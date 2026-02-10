import { defineConfig } from "vitest/config";

// Library tests — runs in Node environment, TypeScript source
export default defineConfig({
  test: {
    name: "lib",
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});

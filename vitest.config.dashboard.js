import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Dashboard tests — runs in jsdom environment, React/JSX
export default defineConfig({
  plugins: [react()],
  test: {
    name: "dashboard",
    include: ["dashboard/tests/**/*.test.{js,jsx}"],
    environment: "jsdom",
    globals: true,
    setupFiles: ["./dashboard/tests/setup.js"],
  },
});

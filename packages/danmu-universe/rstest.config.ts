import { defineConfig } from "@rstest/core";

export default defineConfig({
  testEnvironment: "node",
  includeSource: ["src/**/*.{js,ts}"],
  setupFiles: ["./scripts/rstest.setup.ts"],
  testTimeout: 0,
  pool: {
    type: "forks",
    execArgv: ["--env-file=.env"],
  },
});

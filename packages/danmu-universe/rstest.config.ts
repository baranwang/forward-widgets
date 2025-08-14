import { defineConfig } from "@rstest/core";

export default defineConfig({
  testEnvironment: "node",
  includeSource: ["src/**/*.{js,ts}"],
  testTimeout: 0,
  pool: {
    type: "forks",
    execArgv: ["--env-file=.env"],
  },
});

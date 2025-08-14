import { defineConfig } from "@rstest/core";

export default defineConfig({
  testEnvironment: "node",
  includeSource: ["src/libs/**/*.{js,ts}"],
  pool: {
    type: "forks",
    execArgv: ["--env-file=.env"],
  },
});

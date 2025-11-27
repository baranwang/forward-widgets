import { defineConfig } from "@rstest/core";
import { protobufjsPlugin } from "rsbuild-plugin-protobufjs";

export default defineConfig({
  testEnvironment: "node",
  includeSource: ["src/**/*.{js,ts}"],
  setupFiles: ["./scripts/rstest.setup.ts"],
  testTimeout: 0,
  isolate: false,
  pool: {
    type: "forks",
    execArgv: ["--env-file=.env"],
  },
  plugins: [protobufjsPlugin()],
});

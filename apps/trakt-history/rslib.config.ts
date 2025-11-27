import { pluginForwardWidget } from "@forward-widget/rslib-plugin";
import { defineConfig } from "@rslib/core";
import pkg from "./package.json";

export default defineConfig({
  source: {
    define: {
      "process.env.PACKAGE_VERSION": JSON.stringify(pkg.version),
    },
  },
  lib: [
    {
      format: "esm",
      syntax: "es6",
      autoExternal: false,
    },
  ],
  output: {
    target: "web",
    minify: {
      jsOptions: {
        minimizerOptions: {
          mangle: true,
          minify: true,
          compress: true,
          format: {
            comments: false,
          },
        },
      },
    },
  },
  tools: {
    rspack: {
      optimization: {
        moduleIds: "deterministic",
      },
    },
  },
  plugins: [pluginForwardWidget()],
});

import { pluginForwardWidget } from "@forward-widget/rslib-plugin";
import { defineConfig } from "@rslib/core";
import { protobufjsPlugin } from "rsbuild-plugin-protobufjs";
import pkg from "./package.json";

export default defineConfig({
  source: {
    define: {
      "process.env.PACKAGE_VERSION": JSON.stringify(pkg.version),
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
      "import.meta.rstest": false,
    },
  },
  lib: [
    {
      format: "esm",
      syntax: "es6",
      bundle: true,
      autoExternal: false,
      source: {
        entry: {
          "danmu-universe": "./src/index.ts",
        },
        define: {
          LITE_VERSION: false,
        },
      },
    },
    {
      format: "esm",
      syntax: "es6",
      bundle: true,
      autoExternal: false,
      source: {
        entry: {
          "danmu-universe.lite": "./src/index.ts",
        },
        define: {
          LITE_VERSION: true,
        },
      },
    },
  ],
  output: {
    target: "web",
    minify: {
      jsOptions: {
        minimizerOptions: {
          mangle: true,
          minify: false,
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
  plugins: [protobufjsPlugin(), pluginForwardWidget()],
});

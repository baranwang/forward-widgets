import { pluginForwardWidget } from "@forward-widget/rslib-plugin";
import { defineConfig } from "@rslib/core";
import pkg from "./package.json";

export default defineConfig({
  source: {
    entry: {
      "danmu-universe": "./src/index.ts",
    },
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
  plugins: [pluginForwardWidget()],
});

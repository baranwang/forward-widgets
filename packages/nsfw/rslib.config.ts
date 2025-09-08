import { pluginForwardWidget } from "@forward-widget/rslib-plugin";
import { defineConfig } from "@rslib/core";
import pkg from "./package.json";

export default defineConfig({
  source: {
    entry: {
      "91porn": "./src/91porn.ts",
      xvideos: "./src/xvideos.ts",
    },
    define: {
      "process.env.PACKAGE_VERSION": JSON.stringify(pkg.version),
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
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
  plugins: [pluginForwardWidget()],
});

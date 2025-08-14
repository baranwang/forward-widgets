import { pluginForwardWidget } from "@forward-widget/rslib-plugin";
import { defineConfig } from "@rslib/core";
import pkg from "./package.json";

export default defineConfig({
  source: {
    define: {
      "process.env.PACKAGE_VERSION": JSON.stringify(pkg.version),
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
  },
  plugins: [pluginForwardWidget()],
});

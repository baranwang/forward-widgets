import { defineConfig } from '@rslib/core';

export default defineConfig({
  source: {
    define: {
      'import.meta.rstest': undefined,
    },
  },
  lib: [
    {
      format: 'esm',
      syntax: ['node 18'],
      autoExternal: false,
    },
  ],
});

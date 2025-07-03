import { defineConfig } from '@rstest/core';

export default defineConfig({
  testEnvironment: 'node',
  includeSource: ['src/**/*.{js,ts}'],
  pool: {
    type: 'forks',
    execArgv: ['--env-file=.env'],
  },
});

import { defineConfig } from '@rstest/core';

export default defineConfig({
  testEnvironment: 'node',
  pool: {
    type: 'forks',
    execArgv: ['--env-file=.env'],
  },
});

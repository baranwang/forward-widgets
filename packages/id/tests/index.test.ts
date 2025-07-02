import { expect, test } from '@rstest/core';
import { IDBridge } from '../src/index';
import type { FetchAdapter } from '../src/types';

test('imdb2douban', async () => {
  const fetchAdapter: FetchAdapter = {
    get: async <T>(url: string, options?: RequestInit) =>
      fetch(url, { ...options, method: 'GET' }).then(async (res) => {
        return {
          data: (await res.json()) as T,
          statusCode: res.status,
          headers: Object.fromEntries(res.headers.entries()),
        };
      }),
    post: async <T>(url: string, options?: RequestInit) =>
      fetch(url, { ...options, method: 'POST' }).then(async (res) => {
        return {
          data: (await res.json()) as T,
          statusCode: res.status,
          headers: Object.fromEntries(res.headers.entries()),
        };
      }),
  };
  const idBridge = new IDBridge({ fetch: fetchAdapter });

  const result = await idBridge.imdb2douban('tt28151918');

  expect(result).toBe('35651341');
});

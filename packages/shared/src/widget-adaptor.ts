import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { load } from 'cheerio';

const fetchFactory = (method: 'GET' | 'POST') => {
  return async <T>(url: string, options?: RequestInit) =>
    fetch(url, { ...options, method }).then(async (res) => {
      let data: T;
      try {
        data = (await res.json()) as T;
      } catch (error) {
        data = (await res.text()) as T;
      }
      return {
        data,
        statusCode: res.status,
        headers: Object.fromEntries(res.headers),
      };
    });
};

const STORAGE_CONFIG = {
  get DIR() {
    const dir = path.join(os.tmpdir(), 'forward-widget-adaptor', 'storage');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  },
};

export const WidgetAdaptor = {
  http: {
    get: fetchFactory('GET'),
    post: fetchFactory('POST'),
  },
  tmdb: {
    get: <T>(url: string, options?: RequestInit) => {
      const urlObj = new URL(url, 'https://api.themoviedb.org/');
      options ||= {};
      options.headers = {
        ...options.headers,
        accept: 'application/json',
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
      };
      return WidgetAdaptor.http.get<T>(urlObj.toString(), options);
    },
  },
  html: {
    load: load as typeof import('cheerio').load,
  },
  storage: {
    getItem: async (key: string) => {
      const value = await fs.promises.readFile(path.join(STORAGE_CONFIG.DIR, key), 'utf-8');
      return value;
    },
    setItem: async (key: string, value: string) => {
      await fs.promises.writeFile(path.join(STORAGE_CONFIG.DIR, key), value);
    },
    removeItem: async (key: string) => {
      await fs.promises.unlink(path.join(STORAGE_CONFIG.DIR, key));
    },
    clear: async () => {
      await fs.promises.rm(STORAGE_CONFIG.DIR, { recursive: true });
    },
    keys: async () => {
      const files = await fs.promises.readdir(STORAGE_CONFIG.DIR);
      return files.map((file) => path.basename(file));
    },
  },
};

import { z } from "zod";
import { safeJsonParse, safeJsonParseWithZod } from "./utils";

interface SetOptions {
  /** 覆盖默认 TTL（毫秒） */
  ttl?: number;
}

export const TTL_7_DAYS = 7 * 24 * 60 * 60 * 1000;

export const TTL_2_HOURS = 2 * 60 * 60 * 1000;

export const TTL_30_MINUTES = 30 * 60 * 1000;

export const TTL_5_MINUTES = 5 * 60 * 1000;

const StorageValue = z.object({
  value: z.string(),
  expiresAt: z.number(),
});

class Storage {
  private readonly defaultTTL = TTL_5_MINUTES;

  async get(key: string) {
    const value = await Widget.storage.get(key);
    if (!value) return null;
    const result = safeJsonParseWithZod(value, StorageValue);
    if (!result) return null;
    if (result?.expiresAt < Date.now()) {
      await Widget.storage.set(key, "");
      return null;
    }
    return result.value;
  }

  async set(key: string, value: string, options?: SetOptions) {
    const ttl = options?.ttl ?? this.defaultTTL;
    const expiresAt = Date.now() + ttl;
    const storageValue = StorageValue.parse({
      value,
      expiresAt,
    });
    await Widget.storage.set(key, JSON.stringify(storageValue));
  }

  async clear() {
    await Widget.storage.clear();
  }

  async getJson<T = unknown>(key: string) {
    const value = await this.get(key);
    if (!value) return null;
    return safeJsonParse<T>(value);
  }

  async setJson(key: string, value: unknown, options?: SetOptions) {
    await this.set(key, JSON.stringify(value), options);
  }
}

export const storage = new Storage();

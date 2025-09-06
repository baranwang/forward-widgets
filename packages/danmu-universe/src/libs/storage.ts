import { safeJsonParse, safeJsonParseWithZod } from "./utils";
import { z } from "./zod";

interface SetOptions {
  /** 覆盖默认 TTL（毫秒） */
  ttl?: number;
}

export const TTL_7_DAYS = 7 * 24 * 60 * 60 * 1000;

export const TTL_1_DAY = 24 * 60 * 60 * 1000;

export const TTL_2_HOURS = 2 * 60 * 60 * 1000;

export const TTL_30_MINUTES = 30 * 60 * 1000;

export const TTL_5_MINUTES = 5 * 60 * 1000;

const StorageValue = z.object({
  value: z.string(),
  expiresAt: z.number(),
});

class Storage {
  private readonly defaultTTL = TTL_5_MINUTES;

  get(key: string) {
    const value = Widget.storage.get(key);
    if (!value) return null;
    const result = safeJsonParseWithZod(value, StorageValue);
    if (!result) {
      console.warn(`Failed to parse storage value for key: ${key}`);
      this.remove(key);
      return null;
    }
    if (result?.expiresAt < Date.now()) {
      console.warn(`Storage value for key: ${key} has expired`);
      this.remove(key);
      return null;
    }
    return result.value;
  }

  set(key: string, value: string, options?: SetOptions) {
    const ttl = options?.ttl ?? this.defaultTTL;
    const expiresAt = Date.now() + ttl;
    const storageValue = StorageValue.parse({
      value,
      expiresAt,
    });
    return Widget.storage.set(key, JSON.stringify(storageValue));
  }

  remove(key: string) {
    return Widget.storage.remove(key);
  }

  clear() {
    return Widget.storage.clear();
  }

  getJson<T = unknown>(key: string) {
    const value = this.get(key);
    if (!value) return null;
    return safeJsonParse<T>(value);
  }

  setJson(key: string, value: unknown, options?: SetOptions) {
    return this.set(key, JSON.stringify(value), options);
  }

  async cleanup() {
    try {
      const META_LAST_CLEANUP_KEY = "__storage_last_cleanup__";
      const skipCleanup = this.get(META_LAST_CLEANUP_KEY);
      if (!skipCleanup) {
        const keys = await Widget.storage.keys();
        keys.forEach((key) => {
          this.get(key);
        });
      }
      this.set(META_LAST_CLEANUP_KEY, "1", { ttl: TTL_1_DAY });
    } catch (error) {
      console.error("Failed to cleanup storage", error);
    }
  }
}

export const storage = new Storage();

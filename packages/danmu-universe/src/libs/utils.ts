import type { z } from "zod";

export function safeJsonParse<T>(json: string): T | null {
  try {
    if (!json) return null;
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

export function safeJsonParseWithZod<T extends z.ZodType>(json: string, schema: T) {
  const result = safeJsonParse(json);
  if (!result) {
    return null;
  }
  const { success, data, error } = schema.safeParse(result);
  if (!success) {
    console.warn(`Failed to parse JSON with Zod: ${json}`, error);
    return null;
  }
  return data as T["_zod"]["output"];
}

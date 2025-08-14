import type * as z from "zod/mini";

export function safeJsonParse<T>(json: string): T | null {
  try {
    if (!json) return null;
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

export function safeJsonParseWithZod<T extends z.ZodMiniObject | z.ZodMiniArray>(json: string, schema: T) {
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

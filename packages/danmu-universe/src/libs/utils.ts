import Base64 from "crypto-js/enc-base64";
import type { z } from "./zod";

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
  return data as z.infer<T>;
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const wordArray = Base64.parse(base64);
  const bytes = new Uint8Array(wordArray.sigBytes);

  for (let i = 0; i < wordArray.sigBytes; i++) {
    const wordIndex = i >>> 2;
    const byteIndex = i % 4;
    bytes[i] = (wordArray.words[wordIndex] >>> (24 - byteIndex * 8)) & 0xff;
  }

  return bytes;
}

export function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
